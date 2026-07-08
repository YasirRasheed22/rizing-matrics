// @ts-nocheck
import { Request, Response } from "express";
import { Readable } from 'node:stream';
import twilio from "twilio";
import { prisma } from "../config/prisma.js";
import { config } from "../config/index.js";
import { twilioClient } from "../config/twilioConfig.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { formatPretty } from "../utils/phone.js";
import { sendFcmNotification } from "../notification/sendFcmNotification";
import { createLiveCall,deleteLiveCall } from "../services/liveCallService";
import { createLeadLog } from "../services/leadLog.service.js";

import {
  activeSessions,
  createSession,
  appendLeg,
  updateLegStatus,
  completeSession,
} from "../services/callSessionService.js";
import { buildDateFilter } from "./adminController.js";
import { buildDateFilterTz, toAppTzAsUtc   } from "../utils/timezone.js";
import {
  callConferenceMap,
  callLifecycle,
  outboundCallLifecycle,
  callMetadata,
  adminActiveCalls,
  inboundCallAgentMap,
  parentChildCallMap,
  pendingOutboundConference,
} from "../utils/callMaps.js";
const client = twilio(config.twilio.accountSid, config.twilio.authToken);
type Role =
  | "customer"
  | "agent"
  | "agent_2"
  | "supervisor"
  | "external";

declare global {
  var io: Server | undefined;
}




// Helper: CallSid se agent ka phone number nikaal (jo conference mein tha)


async function createLeadLogFromCall({
  phoneNumber,
  direction,
  type,
  duration,
  userId,
}: {
  phoneNumber: string;
  direction: "inbound" | "outbound";
  type: string;
  duration: number;
  userId: number | null;
}) {
  if (!phoneNumber) return;

  const normalized = normalizeE164(phoneNumber);

  // 1️⃣ Check if lead exists
  const lead = await prisma.lead.findFirst({
    where: {
      clientPhone: normalized, // 👈 adjust field name if different
    },
  });

  if (!lead) return; // ❌ No lead → no log

  // 2️⃣ Create Lead Log
  await createLeadLog({
    leadId: lead.id,
    userId: userId || undefined,
    action: "call_activity",
    message: `Call ${direction} (${type}) - ${duration}s`,
    newData: {
      direction,
      type,
      duration,
      phoneNumber: normalized,
    },
  });
}
async function upsertAgentCallLeg({
      callSid,
      callSessionId,
      agentId,
      from,
      to,
      status,
      connectedAt,
      endTime,
      isTransfer = false,
      transferFrom,
      transferTo,
    }: {
      callSid: string;
      callSessionId: number;
      agentId: number;
      from: string;
      to: string;
      status: string;
      connectedAt?: Date;
      endTime?: Date;
      isTransfer?: boolean;
      transferFrom?: string;
      transferTo?: string;
    }) {
      await prisma.callLeg.upsert({
        where: { callSid },
        create: {
          callSid,
          callSessionId,
          fromNumber: from,
          toNumber: to,
          direction: "internal",
          status,
          startTime: new Date(),
          connectedAt,
          endTime,
          userId: agentId,
          isTransfer,
          transferFrom,
          transferTo,
        },
        update: {
          status,
          connectedAt,
          endTime,
        },
      });
    
        
}

async function getAgentPhoneFromCallSid(callSid: string): Promise<string | null> {
  try {
    const call = await twilioClient.calls(callSid).fetch();
    const conferenceName = await callConferenceMap.get(callSid);
    console.log(conferenceName);
    if (!conferenceName) return null;

    // Find any agent leg in this conference
    const participants = await twilioClient
      .conferences.list({ friendlyName: conferenceName, limit: 1 })
      .then(c => c[0] ? twilioClient.conferences(c[0].sid).participants.list() : []);
console.log(participants);
    for (const p of participants) {
      if (p.to?.startsWith("client:")) {
        const sipId = p.to.replace("client:", "");
        console.log(sipId)
        const user = await prisma.user.findFirst({ where: { sipIdentity: sipId } });
        if (user?.phoneNumber) return user.phoneNumber;
      }
    }
  } catch (err) {
    console.error("Failed to get agent phone from CallSid:", err);
  }
  return null;
}
// =========================================================
// HELPER: Get Caller Name from Number
// =========================================================
async function getCallerName(number: string): Promise<string> {
  if (!number) return "Unknown Caller";
  const incomingNumber = number.replace(/\s+/g, "");
  const contactPhone = await prisma.contactPhone.findFirst({
    where: { numberE164: incomingNumber },
    include: { contact: true },
  });
  if (contactPhone?.contact) {
    return `${contactPhone.contact.firstName} ${
      contactPhone.contact.lastName ?? ""
    }`.trim();
  }
  const agentUser = await prisma.user.findFirst({
    where: { phoneNumber: incomingNumber },
  });
  if (agentUser) {
    return `${agentUser.name} (Agent)`;
  }
  return "Unknown Caller";
}

// =========================================================
// HELPER: Get User Name from SIP Identity
// =========================================================
async function getUserName(sipIdentity: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { sipIdentity },
  });
  return user?.name || sipIdentity;
}

// =========================================================
// PHONE NORMALIZER
// =========================================================
const normalizeE164 = (num: string): string => {
  if (!num) return "";
  const cleaned = num.replace(/\s+/g, "");
  try {
    const parsed = parsePhoneNumberFromString(cleaned);
    if (parsed) return parsed.format("E.164");
  } catch {}
  if (cleaned.startsWith("+")) return cleaned.replace(/[^\d+]/g, "");
  const parsed2 = parsePhoneNumberFromString(cleaned, "US");
  if (parsed2?.isValid()) return parsed2.format("E.164");
  return cleaned;
};

// =========================================================
// 1. INCOMING PSTN CALL
// =========================================================
export const handleIncomingCall = async (req: Request, res: Response) => {
  const { From, To, CallSid } = req.body;

  const dialedNumberE164 = normalizeE164(To);

  console.log("INCOMING CALL DEBUG:", {
    rawTo: To,
    normalizedTo: dialedNumberE164,
    from: From,
  });

  const agent = await prisma.user.findFirst({
    where: {
      phoneNumber: dialedNumberE164,
      status: "AVAILABLE",
    },
  });

  const callerName = await getCallerName(From);

  if (!agent) {
    console.log(`No agent found for number: ${dialedNumberE164}`);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: "alice" },
      "The person you are trying to reach is not available right now."
    );
    twiml.say({ voice: "alice" }, "Please leave a message after the tone.");
    twiml.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${config.serverUrl}/voice/voicemail-callback?callSid=${CallSid}&agentNumber=${encodeURIComponent(dialedNumberE164)}`,
      recordingStatusCallback: `${config.serverUrl}/voice/voicemail-recording-callback?callSid=${CallSid}&agentNumber=${encodeURIComponent(dialedNumberE164)}`,
      recordingStatusCallbackEvent: ['completed'],  // Only on completion
    });
    
    twiml.hangup();

    return res.type("text/xml").send(twiml.toString());
  }

  const conferenceFriendlyName = `in_${Date.now()}_${agent.id}`;
  const twiml = new twilio.twiml.VoiceResponse();
  const start = twiml.start();
        const stream = start.stream({
          url: "wss://api.aiocaller.com/media-stream"
        });
        
        stream.parameter({ name: "conference", value: conferenceFriendlyName });
        stream.parameter({ name: "role", value: "customer" });
         const dial = twiml.dial({
        answerOnBridge: true,
        callerId: From,
         record: true, // 🔥 ADD
      recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
      recordingStatusCallbackEvent: ["completed"],
      });

     
     inboundCallAgentMap.set(CallSid, {
      agentId: agent.id,
      sipIdentity: agent.sipIdentity!,
    });
  (dial as any).conference(conferenceFriendlyName, {
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
     record: true, // 🔥 ADD
      recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
      recordingStatusCallbackEvent: ["completed"],
    waitUrl: "https://com.twilio.sounds.music.s3.amazonaws.com/MUSICAL-ECHO-1.mp3",
    waitMethod: "GET",
  });

  if (CallSid) {
     await callConferenceMap.set(CallSid, conferenceFriendlyName);
  }
   await callLifecycle.set(CallSid, {
      customerCallSid: CallSid,
      agentAnswered: false,
      logged: false,
    });

  client.calls
    .create({
      to: `client:${agent.sipIdentity}`,
      from: From,
      url: `${config.serverUrl}/voice/join-conference?conferenceFriendlyName=${conferenceFriendlyName}&sipIdentity=${agent.sipIdentity}&role=agent&callerName=${encodeURIComponent(
        callerName
      )}&customerNumber=${encodeURIComponent(From)}`,
      // IMPORTANT: link agent leg to PSTN leg via parentCallSid (for later cancel)
      statusCallback: `${config.serverUrl}/voice/status-callback${
        CallSid ? `?parentCallSid=${encodeURIComponent(CallSid)}` : ""
      }`,
      statusCallbackEvent: ["initiated", "ringing","in-progress", "answered", "completed"],
      
    })
    .then(async(leg) => {
      console.log(`Ringing agent ${agent.name || agent.sipIdentity} → ${leg.sid}`);
      await callConferenceMap.set(leg.sid, conferenceFriendlyName);
      callMetadata.set(leg.sid, {
        from: From,
        callerName,
        isTransfer: false,
      });
      callLifecycle.get(CallSid)!.agentCallSid = leg.sid;
      const io = req.app.get("io");
          if (io) {
            io.emit("call-connected", {
              callSid: leg.sid,
              conferenceName: conferenceFriendlyName,
            });
          }

      if (CallSid) {
        // Map parent PSTN call to this agent leg
        parentChildCallMap.set(CallSid, leg.sid);
      }
    })
    .catch((err) => {
      console.error("Failed to ring agent:", err);
    });

  return res.type("text/xml").send(twiml.toString());
};

// =========================================================
// 2. TWIML - A LEG JOINS CONFERENCE
// =========================================================
export const joinConference = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, role, callerName } = req.query;
  console.log(req.query);

  const twiml = new twilio.twiml.VoiceResponse();
   const start = twiml.start();
    const s = start.stream({
      url: "wss://api.aiocaller.com/media-stream",
    });


s.parameter({ name: "conference", value: conferenceFriendlyName });
s.parameter({ name: "role", value: role || "agent" });
  const dial = twiml.dial({ 
      answerOnBridge: true,     
      record: true, // 🔥 ADD
      recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
      recordingStatusCallbackEvent: ["completed"],
      });
      
  (dial as any).conference(String(conferenceFriendlyName), {
    startConferenceOnEnter: true,
    endConferenceOnExit: role === "agent",
    beep: false,
   record: true, // 🔥 ADD
  recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
  recordingStatusCallbackEvent: ["completed"],
  });
  const confName = String(conferenceFriendlyName);

    // find customer CallSid for this conference
    for (const [customerSid, name] of callConferenceMap.entries()) {
      if (name === confName) {
        const state = callLifecycle.get(customerSid);
        if (state) {
          state.agentAnswered = true;
          const agent = await prisma.user.findFirst({
            where: { sipIdentity: role === "agent" ? req.query.sipIdentity : undefined },
          });
            let customerNumber = state.customerNumber; // fallback to existing
    
            try {
              const customerCall = await twilioClient.calls(customerSid).fetch();
              customerNumber = normalizeE164(customerCall.from);
              console.log(`Fresh Twilio fetch → customer number: ${customerNumber}`);
              
              // Optional: agar state mein update karna chahe to
              state.customerNumber = customerNumber;
            } catch (err) {
              console.warn("Could not fetch fresh From from Twilio:", err.message);
              // fallback pe depend rahega
            }
            console.log(agent)
          adminActiveCalls.set(confName, {
            conferenceName: confName,
            direction: "inbound",
            customerNumber: customerNumber,
            agentId: agent?.id,
            agentName: agent?.name,
            startedAt: new Date(),
            isTransfer: false,
          });
         const io = req.app.get("io");
          io.emit("admin-call-started",{call:{
                 conferenceName: confName,
                direction: "inbound",
                customerNumber: customerNumber,
                agentId: agent?.id,
                agentName: agent?.name,
                startedAt: new Date(),
                isTransfer: false,
          }});
          await createLiveCall({
              conferenceName: confName,
              direction: "inbound",
              customerNumber: customerNumber,
              agentId: agent?.id,
              agentName: agent?.name,
              isTransfer: false,
            });
            if (agent?.id) {
            const memberships = await prisma.teamMember.findMany({
              where: { userId: agent.id },
              select: {
                team: {
                  select: {
                    id: true,
                    supervisorId: true,
                  },
                },
              },
            });
                const io = req.app.get("io");
    
                for (const membership of memberships) {
                  const supervisorId = membership.team?.supervisorId;
                
                  if (supervisorId) {
                    io.to(`user:${supervisorId}`).emit("new-live-call", {
                        conferenceName: confName,
                        direction: 'inbound',
                        customerNumber: customerNumber,
                        agentId:agent?.id,
                        agentName: agent?.name || "Agent",
                        isTransfer: false,
                    });
                  }
                }
              
              }
            
          console.log("✅ Agent answered call:", customerSid);
        }
      }
    }

  return res.type("text/xml").send(twiml.toString());
};

// =========================================================
// 3. OUTBOUND CALL (AGENT CALLS CUSTOMER)
// =========================================================
// export const handleOutboundCall = async (req: Request, res: Response) => {
//   const { To, From } = req.body;

//   const sipId = From.replace("client:", "");
//   const agent = await prisma.user.findFirst({
//     where: { sipIdentity: sipId },
//     include: {
//       additionalRole: {
//         select: {
//           canCallDNC: true,
//           // showCallDNC: true,   // ← you can include if needed for frontend later
//         },
//       },
//     },
//   });

//   if (!agent) {
//     return res.status(400).json({ message: "Invalid agent identity" });
//   }

//   const e164 = normalizeE164(To);
//   if (!e164 || !e164.startsWith("+")) {
//     return res.status(400).json({ message: "Invalid destination number format" });
//   }

//   // ────────────────────────────────────────────────
//   // 1. Check Blocked Numbers (existing logic)
//   // ────────────────────────────────────────────────
//   const blockedEntry = await prisma.blockedNumber.findUnique({
//     where: { number: e164 },
//   });

//   if (blockedEntry) {
//     const isBlockedByThisAgent = blockedEntry.blockedBy === agent.id;
//     let message = "This number is blocked.";

//     if (isBlockedByThisAgent) {
//       message = `This number is blocked by you (${agent.name || agent.email || "this agent"}).`;
//     } else {
//       message = `This number is blocked (reason: ${blockedEntry.reason || "No reason provided"}).`;
//     }

//     return res.status(403).json({
//       success: false,
//       blocked: true,
//       message,
//       blockedBy: blockedEntry.blockedBy,
//       reason: blockedEntry.reason,
//       blockedAt: blockedEntry.createdAt, // or blockedEntry.blockedAt if renamed
//     });
//   }

//   // ────────────────────────────────────────────────
//   // 2. NEW: Check DNC (Do Not Call) List
//   // ────────────────────────────────────────────────
//   const dncEntry = await prisma.dNCNumber.findUnique({
//     where: { number: e164 },
//     include: {
//       markedByUser: {
//         select: { id: true, name: true, email: true },
//       },
//     },
//   });

//   if (dncEntry) {
//     // You can decide whether to allow the agent who added it to override or not
//     // Most compliance rules → NO override allowed, even if the agent added it

//     let message = "This number is on the Do Not Call (DNC) list and cannot be called.";

//     // Optional: show more info (useful for debugging / agent awareness)
//     if (dncEntry.markedByUser) {
//       message += ` Marked by ${dncEntry.markedByUser.name || dncEntry.markedByUser.email || "someone"} on ${new Date(dncEntry.markedAt).toLocaleDateString()}.`;
//     }
//     if (dncEntry.reason) {
//       message += ` Reason: ${dncEntry.reason}`;
//     }

//     return res.status(403).json({
//       success: false,
//       dnc: true,
//       message,
//       dncAddedBy: dncEntry.markedBy,
//       dncReason: dncEntry.reason,
//       dncAddedAt: dncEntry.markedAt,
//     });
//   }

//   // ────────────────────────────────────────────────
//   // If neither blocked nor in DNC → proceed with outbound
//   // ────────────────────────────────────────────────
//   const friendlyName = `out_${Date.now()}`;

//   pendingOutboundConference.set(sipId, {
//     friendlyName,
//     customerNumber: To,
//     callerId: agent.phoneNumber || config.twilio.callerNumber,
//     conferenceSid: null,
//   });

//   outboundCallLifecycle.set(agent.sipIdentity, {
//     agentCallSid: "", // fill later
//     customerAnswered: false,
//     logged: false,
//     agentId: agent.id,
//     customerNumber: To,
//   });

//   return res.json({
//     success: true,
//     conferenceFriendlyName: friendlyName,
//   });
// };
export const handleOutboundCall = async (req: Request, res: Response) => {
  const { To, From } = req.body;

  const sipId = From.replace("client:", "");
  const agent = await prisma.user.findFirst({
    where: { sipIdentity: sipId },
    include: {
      additionalRole: {
        select: {
          canCallDNC: true,
          // showCallDNC: true,   // ← you can include if needed for frontend later
        },
      },
    },
  });

  if (!agent) {
    return res.status(400).json({ message: "Invalid agent identity" });
  }

  const e164 = normalizeE164(To);
  if (!e164 || !e164.startsWith("+")) {
    return res.status(400).json({ message: "Invalid destination number format" });
  }

  // ────────────────────────────────────────────────
  // 1. Check Blocked Numbers (no override allowed)
  // ────────────────────────────────────────────────
  const blockedEntry = await prisma.blockedNumber.findUnique({
    where: { number: e164 },
  });

  if (blockedEntry) {
    const isBlockedByThisAgent = blockedEntry.blockedBy === agent.id;
    let message = "This number is blocked.";

    if (isBlockedByThisAgent) {
      message = `This number is blocked by you (${agent.name || agent.email || "this agent"}).`;
    } else {
      message = `This number is blocked (reason: ${blockedEntry.reason || "No reason provided"}).`;
    }

    return res.status(403).json({
      success: false,
      blocked: true,
      message,
      blockedBy: blockedEntry.blockedBy,
      reason: blockedEntry.reason,
      blockedAt: blockedEntry.createdAt, // adjust field name if needed
    });
  }

  // ────────────────────────────────────────────────
  // 2. Check DNC (Do Not Call) List
  // ────────────────────────────────────────────────
  const dncEntry = await prisma.dNCNumber.findUnique({
    where: { number: e164 },
    include: {
      markedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (dncEntry) {
    // Check if this agent has permission to call DNC numbers
    const canCallDNC = agent.additionalRole?.canCallDNC === true;

    if (canCallDNC) {
      // Agent is allowed → log/info (optional) and proceed
      console.log(`[DNC OVERRIDE] Agent ${agent.id} (${agent.name || agent.email}) called DNC number ${e164}`);
      // You could add audit log here if needed
    } else {
      // No permission → block
      let message = "This number is on the Do Not Call (DNC) list and cannot be called.";

      if (dncEntry.markedByUser) {
        message += ` Marked by ${dncEntry.markedByUser.name || dncEntry.markedByUser.email || "someone"} on ${new Date(dncEntry.markedAt).toLocaleDateString()}.`;
      }
      if (dncEntry.reason) {
        message += ` Reason: ${dncEntry.reason}`;
      }

      return res.status(403).json({
        success: false,
        dnc: true,
        permissionDenied: true,
        message,
        dncAddedBy: dncEntry.markedBy,
        dncReason: dncEntry.reason,
        dncAddedAt: dncEntry.markedAt,
      });
    }
  }

  // ────────────────────────────────────────────────
  // Proceed with outbound call (neither blocked nor forbidden DNC)
  // ────────────────────────────────────────────────
  const friendlyName = `out_${Date.now()}`;

  pendingOutboundConference.set(sipId, {
    friendlyName,
    customerNumber: To,
    callerId: agent.phoneNumber || config.twilio.callerNumber,
    conferenceSid: null,
  });

  outboundCallLifecycle.set(agent.sipIdentity, {
    agentCallSid: "", // fill later
    customerAnswered: false,
    logged: false,
    agentId: agent.id,
    customerNumber: To,
  });

  return res.json({
    success: true,
    conferenceFriendlyName: friendlyName,
  });
};
// =========================================================
// 4. TWIML FOR OUTBOUND - AGENT JOINS CONF
// =========================================================
// export const outboundTwiml = async (req: Request, res: Response) => {
//   const { identity } = req.body;
//   const sipId = identity.replace("client:", "");
//   const state = outboundCallLifecycle.get(sipId);
//     if (state) {
//       state.agentCallSid = req.body.CallSid;
//     }
//   callConferenceMap.set(participant.callSid, friendlyName);
//   const entry = pendingOutboundConference.get(sipId);
//   if (!entry) {
//     return res
//       .type("text/xml")
//       .send(`<Response><Say>No conference found</Say></Response>`);
//   }

//   const { friendlyName, customerNumber, callerId } = entry;
    
    
//   const twiml = new twilio.twiml.VoiceResponse();
//     const start = twiml.start();
//     const stream = start.stream({
//       url: "wss://api.aiocaller.com/media-stream"
//     });
//     stream.parameter({ name: "conference", value: friendlyName });
//     stream.parameter({ name: "role", value: "agent" });
//   const dial = twiml.dial({
//       answerOnBridge: true,
//       record: true, // 🔥 ADD
//       recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
//       recordingStatusCallbackEvent: ["completed"],
//   });
  
//   (dial as any).conference(friendlyName, {
//     startConferenceOnEnter: true,
//     endConferenceOnExit: true,
//     beep: false,
//     record: true, // 🔥 ADD
//   recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
//   recordingStatusCallbackEvent: ["completed"],
//   });

//   res.type("text/xml").send(twiml.toString());

// try {
//     const agent = await prisma.user.findFirst({
//       where: { sipIdentity: sipId },
//     });

//     if (agent) {
//       const confName = friendlyName;

//       adminActiveCalls.set(confName, {
//         conferenceName: confName,
//         direction: "outbound",
//         customerNumber: normalizeE164(customerNumber),   // actual number
//         agentId: agent.id,
//         agentName: agent.name,
//         startedAt: new Date(),
//         isTransfer: false,
//       });

//       const io = req.app.get("io");
//       io.emit("admin-call-started", {
//         call: {
//           conferenceName: confName,
//           direction: "outbound",
//           customerNumber: normalizeE164(customerNumber),
//           agentId: agent.id,
//           agentName: agent.name,
//           startedAt: new Date(),
//           isTransfer: false,
//         }
//       });

//       await createLiveCall({
//         conferenceName: confName,
//         direction: "outbound",
//         customerNumber: normalizeE164(customerNumber),
//         agentId: agent.id,
//         agentName: agent.name,
//         isTransfer: false,
//       });
//         if (agent?.id) {
//             const memberships = await prisma.teamMember.findMany({
//               where: { userId: agent.id },
//               select: {
//                 team: {
//                   select: {
//                     id: true,
//                     supervisorId: true,
//                   },
//                 },
//               },
//             });
//                 const io = req.app.get("io");
    
//                 for (const membership of memberships) {
//                   const supervisorId = membership.team?.supervisorId;
                
//                   if (supervisorId) {
//                     io.to(`user:${supervisorId}`).emit("new-live-call", {
//                       conferenceName: confName,
//                       direction: "outbound", // ya inbound
//                       customerNumber: normalizeE164(customerNumber),
//                       agentId: agent.id,
//                       agentName: agent.name || "Agent",
//                       isTransfer: false,
//                     });
//                   }
//                 }
              
//               }

//       console.log("✅ Agent joined outbound conference:", confName);
//     }
//   } catch (err) {
//     console.error("Outbound live call creation failed:", err);
//   }
//   setTimeout(async () => {
//     try {
        
//      const participant = await twilioClient
//         .conferences(friendlyName)
//         .participants.create({
//           from: callerId,
//           to: customerNumber,
//           endConferenceOnExit: true,
//           earlyMedia: true,
//           statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
//             identity
//           )}`,
//           statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
//         });
//         const state = outboundCallLifecycle.get(sipId);
//         if (state) {
//           state.customerCallSid = participant.callSid;
//         }
//       console.log("OUTBOUND: Customer dialed", customerNumber);
//     } catch (err) {
//       console.error("OUTBOUND DIAL FAILED:", err);
//     }
//   }, 300);
// };
export const outboundTwiml = async (req: Request, res: Response) => {
  const { identity } = req.body;
  const sipId = identity.replace("client:", "");
  const state = outboundCallLifecycle.get(sipId);
  if (state) {
    state.agentCallSid = req.body.CallSid;
  }

  // ✅ REMOVE: callConferenceMap.set(participant.callSid, friendlyName); ← YEH DELETE KARO

  const entry = pendingOutboundConference.get(sipId);
  if (!entry) {
    return res.type("text/xml").send(`<Response><Say>No conference found</Say></Response>`);
  }

  const { friendlyName, customerNumber, callerId } = entry;

  // ✅ Agent CallSid bhi map mein daalo (abhi milta hai req.body se)
  if (req.body.CallSid) {
    await callConferenceMap.set(req.body.CallSid, friendlyName);
  }

  const twiml = new twilio.twiml.VoiceResponse();
  const start = twiml.start();
  const stream = start.stream({ url: "wss://api.aiocaller.com/media-stream" });
  stream.parameter({ name: "conference", value: friendlyName });
  stream.parameter({ name: "role", value: "agent" });

  const dial = twiml.dial({
    answerOnBridge: true,
    record: true,
    recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
    recordingStatusCallbackEvent: ["completed"],
  });

  (dial as any).conference(friendlyName, {
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    beep: false,
    record: true,
    recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
    recordingStatusCallbackEvent: ["completed"],
  });

  res.type("text/xml").send(twiml.toString());

  try {
    const agent = await prisma.user.findFirst({ where: { sipIdentity: sipId } });

    if (agent) {
      const confName = friendlyName;

      // ✅ conferenceName lifecycle mein store karo
      const lifecycle = outboundCallLifecycle.get(sipId);
      if (lifecycle) {
        lifecycle.conferenceName = confName;
      }

      adminActiveCalls.set(confName, {
        conferenceName: confName,
        direction: "outbound",
        customerNumber: normalizeE164(customerNumber),
        agentId: agent.id,
        agentName: agent.name,
        startedAt: new Date(),
        isTransfer: false,
      });

      const io = req.app.get("io");
      io.emit("admin-call-started", {
        call: {
          conferenceName: confName,
          direction: "outbound",
          customerNumber: normalizeE164(customerNumber),
          agentId: agent.id,
          agentName: agent.name,
          startedAt: new Date(),
          isTransfer: false,
        }
      });

      await createLiveCall({
        conferenceName: confName,
        direction: "outbound",
        customerNumber: normalizeE164(customerNumber),
        agentId: agent.id,
        agentName: agent.name,
        isTransfer: false,
      });

      if (agent?.id) {
        const memberships = await prisma.teamMember.findMany({
          where: { userId: agent.id },
          select: { team: { select: { id: true, supervisorId: true } } },
        });
        for (const membership of memberships) {
          const supervisorId = membership.team?.supervisorId;
          if (supervisorId) {
            io.to(`user:${supervisorId}`).emit("new-live-call", {
              conferenceName: confName,
              direction: "outbound",
              customerNumber: normalizeE164(customerNumber),
              agentId: agent.id,
              agentName: agent.name || "Agent",
              isTransfer: false,
            });
          }
        }
      }

      console.log("✅ Agent joined outbound conference:", confName);
    }
  } catch (err) {
    console.error("Outbound live call creation failed:", err);
  }

  setTimeout(async () => {
    try {
      const participant = await twilioClient
        .conferences(friendlyName)
        .participants.create({
          from: callerId,
          to: customerNumber,
          endConferenceOnExit: true,
          earlyMedia: true,
          statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(identity)}`,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        });

      const state = outboundCallLifecycle.get(sipId);
      if (state) {
        state.customerCallSid = participant.callSid;
      }

      // ✅ Customer CallSid bhi map mein daalo
      callConferenceMap.set(participant.callSid, friendlyName);

      console.log("OUTBOUND: Customer dialed", customerNumber);
    } catch (err) {
      console.error("OUTBOUND DIAL FAILED:", err);
    }
  }, 300);
};
// =========================================================
// 5. HOLD / RESUME
// =========================================================
// export const holdCall = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, participantCallSid, hold } = req.body;

//   const conferences = await client.conferences.list({
//     friendlyName: conferenceFriendlyName,
//     limit: 1,
//   });
//   const conf = conferences[0];
//   if (!conf) return res.status(404).json({ message: "Conference not found" });

//   await client
//     .conferences(conf.sid)
//     .participants(participantCallSid)
//     .update({ hold });

//   return res.json({
//     success: true,
//     message: hold ? "Held" : "Resumed",
//   });
// };
export const holdCall = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, participantCallSid, hold } = req.body;

  try {
    const conferences = await client.conferences.list({
      friendlyName: conferenceFriendlyName,
      limit: 1,
    });
    if (conferences.length === 0) {
      return res.status(404).json({ message: "Conference not found" });
    }
    const conf = conferences[0];

    // 1. Find the participant we want to hold (agent ya customer?)
    const participants = await client.conferences(conf.sid).participants.list();
    
    // Hum agent ko hold nahi kar rahe — customer ko kar rahe
    // Lekin frontend se agentCallSid bhej raha hai, to hum customer leg dhundenge
    let customerParticipant = participants.find(p => 
      !p.to?.startsWith("client:")  // PSTN leg = customer
    );
    console.log(customerParticipant);
    if (!customerParticipant) {
      return res.status(404).json({ message: "Customer participant not found in conference" });
    }

    // 2. Sirf customer ko hold karo
    const value = await client
      .conferences(conf.sid)
      .participants(customerParticipant.callSid)   // ← Yeh important change
      .update({
        hold: hold, 
      });
    console.log(value);
    // Optional: Agent ko bhi kuch sunana hai to (beep ya silence)
    // await client.conferences(conf.sid).participants(participantCallSid).update({
    //   hold: false,  // agent ko hold mat karo
    // });

    return res.json({
      success: true,
      message: hold ? "Customer on hold" : "Customer resumed",
    });
  } catch (err: any) {
    console.error("Hold error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
// =========================================================
// 6. BLIND TRANSFER
// =========================================================
export const blindTransfer = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, targetIdentity, currentAgentCallSid } =
    req.body;

  const conferences = await client.conferences.list({
    friendlyName: conferenceFriendlyName,
    limit: 1,
  });

  const conf = conferences[0];
  if (!conf) return res.status(404).json({ message: "Conf not found" });

  const participants: any[] = await client
    .conferences(conf.sid)
    .participants.list();

  const customer = participants.find((p) => !p.to?.startsWith("client:"));
  const customerNumber = customer?.to || "";

  const initiatingAgent =
    participants.find((p) => p.to?.startsWith("client:"))?.to?.replace(
      "client:",
      ""
    ) || "unknown";

  const callerName = await getCallerName(customerNumber);

  await client
    .conferences(conf.sid)
    .participants(currentAgentCallSid)
    .update({ status: "completed" as any });

  const newLeg = await client.calls.create({
    to: `client:${targetIdentity}`,
    from: config.twilio.callerNumber,
    url: `${config.serverUrl}/voice/transfer-twiml?conferenceFriendlyName=${conferenceFriendlyName}&fromAgent=${initiatingAgent}&customer=${customerNumber}&toAgent=${targetIdentity}`,
    statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
      customer?.callSid || ""
    )}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  callConferenceMap.set(newLeg.sid, conferenceFriendlyName);
  callMetadata.set(newLeg.sid, {
    from: customerNumber,
    callerName,
    isTransfer: true,
    transferFrom: initiatingAgent,
  });

  return res.json({
    success: true,
    newAgentCallSid: newLeg.sid,
  });
};

// =========================================================
// 7. SUPERVISED TRANSFER
// =========================================================
export const supervisedTransfer = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, targetIdentity } = req.body;
    console.log(req.body);
  const conferences = await client.conferences.list({
    friendlyName: conferenceFriendlyName,
    limit: 1,
  });
  const conf = conferences[0];
  if (!conf) return res.status(404).json({ message: "Conf not found" });
  console.log(conf);

  const participants: any[] = await client
    .conferences(conf.sid)
    .participants.list();
    

  const customer = participants.find((p) => !p.to?.startsWith("client:"));
  const customerNumber = customer?.to || "";

  const initiatingAgent =
    participants.find((p) => p.to?.startsWith("client:"))?.to?.replace(
      "client:",
      ""
    ) || "unknown";

  const callerName = await getCallerName(customerNumber);

  const newLeg = await client.calls.create({
    to: `client:${targetIdentity?.sipIdentity}`,
    from: config.twilio.callerNumber,
    url: `${config.serverUrl}/voice/transfer-twiml?conferenceFriendlyName=${conferenceFriendlyName}&fromAgent=${initiatingAgent}&customer=${customerNumber}&toAgent=${targetIdentity.sipIdentity}`,
    statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
      customer?.callSid || ""
    )}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  callConferenceMap.set(newLeg.sid, conferenceFriendlyName);
  callMetadata.set(newLeg.sid, {
    from: customerNumber,
    callerName,
    isTransfer: true,
    transferFrom: initiatingAgent,
  });

  return res.json({ success: true });
};

// =========================================================
// 8. COMPLETE SUPERVISED TRANSFER
// =========================================================
export const completeTransfer = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, currentAgentCallSid } = req.body;

  const conferences = await client.conferences.list({
    friendlyName: conferenceFriendlyName,
    limit: 1,
  });

  const conf = conferences[0];
  if (!conf) return res.status(404).json({ message: "Conf not found" });

  await client
    .conferences(conf.sid)
    .participants(currentAgentCallSid)
    .update({ status: "completed" as any });

  return res.json({ success: true });
};


export const conferenceStatusCallback = async (req, res) => {
  const { StatusCallbackEvent, ConferenceSid, CallSid, To } = req.body;
  const io = req.app.get("io");

  if (!ConferenceSid) return res.sendStatus(200);

  try {
    // 🔴 Customer LEFT
    if (
      StatusCallbackEvent === "participant-leave" &&
      !To?.startsWith("client:")
    ) {
        
      console.log("🔥 CUSTOMER LEFT — FORCE END AGENT LEG");

      await endAdminCall(io, ConferenceSid);
    
      const participants = await twilioClient
        .conferences(ConferenceSid)
        .participants.list();

      // 🔥 HARD KILL ALL AGENT LEGS
      for (const p of participants) {
        if (p.to?.startsWith("client:")) {
          await twilioClient
            .conferences(ConferenceSid)
            .participants(p.callSid)
            .update({ status: "completed" });
             const sipId = p.to.replace("client:", "");
              const agent = await prisma.user.findFirst({
                where: { sipIdentity: sipId , role : 'AGENT'}
              });
    
              if (agent?.id) {
                // ✅ Sirf is agent ko emit karo
                io?.to(`user:${agent.id}`).emit("call-ended", {
                  conferenceSid: ConferenceSid,
                  reason: "customer_hung_up",
                });
              }
        }
        
      }

      // End conference fully (safety)
      await twilioClient.conferences(ConferenceSid).update({
        status: "completed",
      });
    endAdminCall(io, ConferenceSid);
      // 🔥 SOCKET EVENT (THIS WAS MISSING)
      

      return res.sendStatus(200);
    }
    
  } catch (err) {
    console.error("CONF STATUS CALLBACK ERROR:", err);
  }

  return res.sendStatus(200);
};
// =========================================================
// 10. ENSURE CONFERENCE HEALTH
// =========================================================
async function ensureConferenceHealth(conferenceSid: string) {
  try {
    const participants: any[] = await twilioClient
      .conferences(conferenceSid)
      .participants.list();

    const agents = participants.filter((p) => p.to?.startsWith("client:"));
    const customers = participants.filter((p) => !p.to?.startsWith("client:"));

    if (customers.length === 0 && agents.length > 0) {
      console.log("CUSTOMER LEFT — NOT ENDING CONFERENCE");
      for (const agent of agents) {
        await twilioClient.calls(agent.callSid).update({
          twiml:
            "<Response><Say>Customer has left the call.</Say></Response>",
        });
      }
      return;
    }

    if (agents.length === 0) {
      console.log("NO AGENTS LEFT → ENDING CONFERENCE");
      await twilioClient.conferences(conferenceSid).update({
        status: "completed",
      });
      return;
    }
  } catch (err) {
    console.error("CONF HEALTH ERROR:", err);
  }
}
// =========================================================
// 11. GET CONFERENCE BY CallSid
// =========================================================
export const getConferenceNameByCallSid = (req: Request, res: Response) => {
  const { callSid } = req.params;

  const conf = await callConferenceMap.get(callSid);
  if (!conf) return res.status(404).json({ message: "Not found" });

  return res.json({ conferenceName: conf });
};
// =========================================================
// 12. GET CALL INFO BY CallSid (for frontend)
// =========================================================
export const getCallInfo = (req: Request, res: Response) => {
  const { callSid } = req.params;

  const metadata = callMetadata.get(callSid);
  if (!metadata) return res.status(404).json({ message: "Not found" });

  return res.json(metadata);
};
// =========================================================
// 13. FORCE HANGUP (AGENT ENDS CALL)
// =========================================================
export const forceHangup = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, agentCallSid } = req.body;

  try {
    const conferences = await twilioClient.conferences.list({
      friendlyName: conferenceFriendlyName,
      limit: 1,
    });

    const conf = conferences[0];
    if (!conf) {
      return res.status(404).json({ message: "Conference not found" });
    }

    const participants: any[] = await twilioClient
      .conferences(conf.sid)
      .participants.list();
    console.log(participants.length);
    console.log(participants)
    if (participants.length > 2) {
      console.log("Other participants exist → removing only agent leg");

      if (!agentCallSid) {
        return res.status(400).json({
          success: false,
          message: "Agent CallSid missing for partial hangup",
        });
      }

      await (twilioClient
        .conferences(conf.sid)
        .participants(agentCallSid) as any).update({ status: "completed" });

      return res.json({
        success: true,
        message: "Agent leg removed, conference stays active",
      });
    }

    console.log("No participants left → ending conference");

    for (const p of participants) {
      await (twilioClient
        .conferences(conf.sid)
        .participants(p.callSid) as any).update({ status: "completed" });
    }

    await twilioClient.conferences(conf.sid).update({
      status: "completed",
    });
    
    const io = req.app.get("io");
    const activeCall = adminActiveCalls.get(conferenceFriendlyName);
    console.log('activeCall')
    console.log(activeCall)
    if (activeCall?.agentId) {
      io?.to(`user:${activeCall.agentId}`).emit("call-ended", {
        conferenceFriendlyName,
        reason: "agent_hung_up",
      });
    }
    endAdminCall(io, conferenceFriendlyName);
    return res.json({
      success: true,
      message: "Conference ended completely",
    });
  } catch (err: any) {
    console.error("FORCE HANGUP ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
// =========================================================
// 14. TWIML FOR TRANSFER (Agent → Agent)
// =========================================================
export const transferTwiml = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, fromAgent, customer } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  const fromAgentName = await getUserName(fromAgent as string);
  const callerName = await getCallerName(customer as string);

  twiml.say(
    `Incoming transfer from ${fromAgentName}. Caller is ${callerName}.`
  );
  twiml.pause({ length: 1 });

  const dial = twiml.dial({ answerOnBridge: true ,     record: true, // 🔥 ADD
      recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
      recordingStatusCallbackEvent: ["completed"],});

  (dial as any).conference(String(conferenceFriendlyName), {
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    beep: false,
  });

  console.log(twiml.toString());
  return res.type("text/xml").send(twiml.toString());
};
export const getCallLogsByUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      filter = "all",
      startDate,
      endDate,
      page = 1,
      limit = 20,
      tab = "all",
    } = req.query as any;

    const pageNum = Math.max(Number(page), 1);
    const pageSize = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * pageSize;

    // Date filter
    
    const dateFilter = buildDateFilterTz(filter as string, startDate as string, endDate as string);
    // console.log(dateFilter);
    const timeWhere: any = {};
    if (dateFilter.gte) timeWhere.gte = new Date(dateFilter.gte);
    if (dateFilter.lte) timeWhere.lte = new Date(dateFilter.lte);

    // Base where clauses
    const callWhere: any = { userId };
    const voicemailWhere: any = { userId };

    if (Object.keys(timeWhere).length > 0) {
      callWhere.startTime = timeWhere;
      voicemailWhere.createdAt = timeWhere;
    }

    let items: any[] = [];
    let total = 0;

    // ────────────────────────────────────────────────
    // COLLECT ALL POSSIBLE NUMBERS FIRST (for blocked lookup)
    // ────────────────────────────────────────────────
    const contactNumbers = new Set<string>();

    // We'll collect numbers from both calls and voicemails depending on tab
    if (tab !== "voicemail") {
      // For call tabs, fetch calls first to collect numbers
      const callsForNumbers = await prisma.callSession.findMany({
        where: callWhere,
        select: { fromNumber: true, toNumber: true, direction: true, legs: { select: { fromNumber: true, toNumber: true } } },
        orderBy: { startTime: "desc" },
        skip,
        take: pageSize,
      });

      callsForNumbers.forEach((s) => {
        let num = s.direction === "inbound" ? s.fromNumber : s.toNumber;
        if (num?.startsWith("client:")) {
          const leg = s.legs.find(l => !l.fromNumber?.startsWith("client:") && !l.toNumber?.startsWith("client:"));
          num = s.direction === "inbound" ? leg?.fromNumber : leg?.toNumber;
        }
        if (num?.startsWith("+")) contactNumbers.add(num);
      });
    }

    if (tab === "voicemail" || tab === "all") {
      // For voicemail tab or all, collect voicemail numbers
      const vmsForNumbers = await prisma.voicemail.findMany({
        where: voicemailWhere,
        select: { fromNumber: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      });

      vmsForNumbers.forEach((v) => {
        if (v.fromNumber?.startsWith("+")) contactNumbers.add(v.fromNumber);
      });
    }

    // ─── Bulk blocked fetch (common for both) ────────────────
    const blockedNumbers = await prisma.blockedNumber.findMany({
      where: { number: { in: Array.from(contactNumbers) } },
      select: { number: true, blockedBy: true, reason: true },
    });
    const blockedMap = new Map(
      blockedNumbers.map((b) => [b.number, { blockedBy: b.blockedBy, reason: b.reason }])
    );

    // ────────────────────────────────────────────────
    // VOICEMAIL TAB
    // ────────────────────────────────────────────────
    if (tab === "voicemail") {
      total = await prisma.voicemail.count({ where: voicemailWhere });

      const voicemails = await prisma.voicemail.findMany({
        where: voicemailWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      });

      const voicemailResults = await Promise.all(
        voicemails.map(async (vm) => {
          const formatted = formatPretty(vm.fromNumber);
          const contactName = await getCallerName(vm.fromNumber);

          const blockedInfo = vm.fromNumber && blockedMap.get(vm.fromNumber);

          return {
            id: vm.id,
            sessionId: `vm_${vm.id}`,
            type: "voicemail",
            direction: "inbound",
            number: vm.fromNumber,
            formatted,
            contactName,
            startTime: vm.createdAt,
            endTime: vm.createdAt,
            duration: vm.duration || 0,
            recordingUrl: vm.recordingUrl,
            recordingSid: vm.recordingSid,
            transcription: vm.transcription || null,
            listenedAt: vm.listenedAt,
            isVoicemail: true,
            isBlocked: !!blockedInfo,
            blockedByCurrentUser: blockedInfo?.blockedBy === userId,
            blockedReason: blockedInfo?.reason || null,
          };
        })
      );

      items = voicemailResults;
    } 
    // ────────────────────────────────────────────────
    // NORMAL CALL TABS (all, incoming, outgoing, missed)
    // ────────────────────────────────────────────────
    else {
      // Tab filtering for calls
      if (tab === "incoming") {
        callWhere.direction = "inbound";
        callWhere.type = "connected";
      } else if (tab === "outgoing") {
        callWhere.direction = "outbound";
      } else if (tab === "missed") {
        callWhere.type = "missed";
      }

      total = await prisma.callSession.count({ where: callWhere });

      const calls = await prisma.callSession.findMany({
        where: callWhere,
        orderBy: { startTime: "desc" },
        skip,
        take: pageSize,
        include: { legs: true },
      });

      const callResults = await Promise.all(
        calls.map(async (session) => {
          let number = session.direction === "inbound" ? session.fromNumber : session.toNumber;
          if (number?.startsWith("client:")) {
            const leg = session.legs.find(
              (l) => !l.fromNumber?.startsWith("client:") && !l.toNumber?.startsWith("client:")
            );
            number = session.direction === "inbound" ? leg?.fromNumber : leg?.toNumber;
          }

          const formatted = formatPretty(number);
          let contactName = "Unknown Caller";

          const cleaned = number?.replace(/\D/g, "").slice(-10);
          if (cleaned?.length === 10) {
            const cp = await prisma.contactPhone.findFirst({
              where: { numberE164: `+1${cleaned}` },
              include: { contact: { select: { firstName: true, lastName: true, nickName: true } } },
            });
            if (cp?.contact) {
              contactName =
                `${cp.contact.firstName || ""} ${cp.contact.lastName || ""}`.trim() ||
                cp.contact.nickName ||
                "Unknown Caller";
            }
          }

          const blockedInfo = number && blockedMap.get(number);

          return {
            id: session.id,
            sessionId: session.sessionId,
            type: session.type,
            direction: session.direction,
            number,
            formatted,
            contactName,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration || 0,
            recordingUrl: session.recordingUrl || null,
            isVoicemail: false,
            isBlocked: !!blockedInfo,
            blockedByCurrentUser: blockedInfo?.blockedBy === userId,
            blockedReason: blockedInfo?.reason || null,
          };
        })
      );

      items = callResults;
    }

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("getCallLogsByUser ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to load logs" });
  }
};
async function emitCallLog(io, {
  sessionId,
  direction,
  type,
  number,
  startTime,
  endTime,
  duration,
  recordingUrl,
  agentId,
}) {
  io?.emit("onCallLogsUpdates", {
    sessionId,
    direction,
    type,
    number,
    formatted: formatPretty(number),
    contactName: await getCallerName(number),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration,
    recording: recordingUrl,
    agent_id: agentId || null,
  });
}
async function getRecordingUrl(callSid: string): Promise<string | null> {
  try {
    const recordings = await twilioClient
      .calls(callSid)
      .recordings
      .list({ limit: 1 });

    if (recordings.length > 0 && recordings[0].uri) {
      return `https://api.twilio.com${recordings[0].uri.replace(".json", ".mp3")}`;
    }
  } catch (err) {
    console.warn("Recording fetch failed for", callSid);
  }
  return null;
}
export const callStatusCallback = async (req, res) => {
  const { CallSid, CallStatus, To, From } = req.body;
  const io = req.app.get("io");
  let recordingUrl: string | null = null;

    recordingUrl = await getRecordingUrl(CallSid);
  
     if (CallStatus !== "completed") return res.sendStatus(200);
     if (CallStatus === "answered" || CallStatus === "in-progress"  && !To?.startsWith("client:")) {
      for (const state of outboundCallLifecycle.values()) {
        if (state.customerCallSid === CallSid) {
          state.customerAnswered = true;
          
          console.log("✅ OUTBOUND CUSTOMER ANSWERED:", CallSid);
          break;
        }
      }
      return res.sendStatus(200);
    }
     

  try {
    const call = await twilioClient.calls(CallSid).fetch();
    const isAgentLeg = To?.startsWith("client:");
    const isCustomerLeg = !isAgentLeg;
    /* =====================================================
      🔵 INBOUND – CUSTOMER LEG FINISHED
    ===================================================== */
    if (isCustomerLeg) {
      const state = callLifecycle.get(CallSid);
      if (state && !state.logged) {
        state.logged = true;

        const startTime = call.startTime ? toAppTzAsUtc(call.startTime) : new Date();
        const endTime   = call.endTime   ? toAppTzAsUtc(call.endTime)   : new Date();
        const duration = Number(call.duration || 0);

        const agentInfo = inboundCallAgentMap.get(CallSid);
        const agentId = agentInfo?.agentId || null;

        // ❌ MISSED
        if (!state.agentAnswered) {
          await prisma.callSession.create({
            data: {
              sessionId: CallSid,
              direction: "inbound",
              fromNumber: From,
              toNumber: To,
              type: "missed",
              status: "completed",
              startTime,
              endTime,
              duration: 0,
              recordingUrl:null,
              userId: agentId,
            },
          });

          io?.to(`user:${agentId}`).emit("incoming-call-ended", { callSid: CallSid , type: "missed", number:From});

          await emitCallLog(io, {
            sessionId: CallSid,
            direction: "inbound",
            type: "missed",
            number: From,
            startTime,
            endTime,
            duration: 0,
            recordingUrl: null,
            agentId,
          });
        }

        // ✅ CONNECTED
        if (state.agentAnswered) {
          await prisma.callSession.create({
            data: {
              sessionId: CallSid,
              direction: "inbound",
              fromNumber: From,
              toNumber: To,
              type: "connected",
              status: "completed",
              startTime,
              endTime,
              duration,
              recordingUrl: recordingUrl || null,
              userId: agentId,
            },
          });

           io?.to(`user:${agentId}`).emit("call-ended", {
            callSid: CallSid,
            reason: "customer_hung_up",
          });

          await emitCallLog(io, {
            sessionId: CallSid,
            direction: "inbound",
            type: "connected",
            number: From,
            startTime,
            endTime,
            duration,
            recordingUrl: recordingUrl || null,
            agentId,
          });
        }
        await createLeadLogFromCall({
          phoneNumber: From,
          direction: "inbound",
          type: state.agentAnswered ? "connected" : "missed",
          duration: state.agentAnswered ? duration : 0,
          userId: agentId,
        });
        const conferenceName = await callConferenceMap.get(CallSid);
        if (conferenceName) {
          await endAdminCall(io, conferenceName);
        }
        callLifecycle.delete(CallSid);
        return res.sendStatus(200);
      }
      for (const state of outboundCallLifecycle.values()) {
            if (state.customerCallSid === CallSid) {
              recordingUrl = await getRecordingUrl(state.agentCallSid);
              break;
            }
          }

      
    }
    

    /* =====================================================
      🟣 OUTBOUND – CUSTOMER LEG FINISHED
    ===================================================== */
    // for (const [key, state] of outboundCallLifecycle.entries()) {
    //   if (state.customerCallSid === CallSid && !state.logged) {
    //     state.logged = true;
    //     const startTime = call.startTime ? toAppTzAsUtc(call.startTime) : new Date();
    //     const endTime   = call.endTime   ? toAppTzAsUtc(call.endTime)   : new Date();
    //     const duration = Number(call.duration || 0);

    //     const type = state.customerAnswered
    //       ? "connected"
    //       : "no-answer";

    //     await prisma.callSession.create({
    //       data: {
    //         sessionId: CallSid,
    //         direction: "outbound",
    //         fromNumber: From,
    //         toNumber: To,
    //         type,
    //         status: "completed",
    //         startTime,
    //         endTime,
    //         duration,
    //         recordingUrl: recordingUrl || null,
    //         userId: state.agentId,
    //       },
    //     });
    //      await createLeadLogFromCall({
    //       phoneNumber: To,
    //       direction: "outbound",
    //       type,
    //       duration,
    //       userId: state.agentId,
    //     });
    //      io?.to(`user:${state.agentId}`).emit("call-ended", {
    //       callSid: state.agentCallSid,
    //       reason: "customer_hung_up",
    //     });
    //      if (conferenceName) {
    //      await endAdminCall(io, conferenceName);
    //         } else {
    //           // Last resort: sipIdentity se pendingOutboundConference mein dhundo
    //           for (const [, entry] of pendingOutboundConference.entries()) {
    //             if (entry.customerNumber) {
    //               // Conference naam directly outboundCallLifecycle se bhi mil sakta hai
    //             }
    //           }
    //           // agentCallSid ke through conference dhundo
    //           console.warn("conferenceName not found for outbound cleanup, CallSid:", CallSid);
    //         }

    
    //     await emitCallLog(io, {
    //       sessionId: CallSid,
    //       direction: "outbound",
    //       type,
    //       number: To,
    //       startTime,
    //       endTime,
    //       duration,
    //       recordingUrl: recordingUrl || null,
    //       agentId: state.agentId,
    //     });
       

    //     outboundCallLifecycle.delete(key);
    //     return res.sendStatus(200);
    //   }
    // }
for (const [key, state] of outboundCallLifecycle.entries()) {
  if (state.customerCallSid === CallSid && !state.logged) {
    state.logged = true;
    const startTime = call.startTime ? toAppTzAsUtc(call.startTime) : new Date();
    const endTime   = call.endTime   ? toAppTzAsUtc(call.endTime)   : new Date();
    const duration = Number(call.duration || 0);
    const type = state.customerAnswered ? "connected" : "no-answer";

    await prisma.callSession.create({
      data: {
        sessionId: CallSid,
        direction: "outbound",
        fromNumber: From,
        toNumber: To,
        type,
        status: "completed",
        startTime,
        endTime,
        duration,
        recordingUrl: recordingUrl || null,
        userId: state.agentId,
      },
    });

    await createLeadLogFromCall({
      phoneNumber: To,
      direction: "outbound",
      type,
      duration,
      userId: state.agentId,
    });

    io?.to(`user:${state.agentId}`).emit("call-ended", {
      callSid: state.agentCallSid,
      reason: "customer_hung_up",
    });

    // ✅ TRIPLE FALLBACK — koi na koi milega
    const conferenceName =
      await callConferenceMap.get(CallSid) ||           // customer CallSid se
      await callConferenceMap.get(state.agentCallSid) || // agent CallSid se
      state.conferenceName;                        // directly stored ✅

    if (conferenceName) {
      await endAdminCall(io, conferenceName);
    } else {
      console.error("❌ conferenceName nahi mila outbound cleanup ke liye:", {
        customerCallSid: CallSid,
        agentCallSid: state.agentCallSid,
      });
    }

    await emitCallLog(io, {
      sessionId: CallSid,
      direction: "outbound",
      type,
      number: To,
      startTime,
      endTime,
      duration,
      recordingUrl: recordingUrl || null,
      agentId: state.agentId,
    });

    outboundCallLifecycle.delete(key);
    return res.sendStatus(200);
  }
}
  } catch (err) {
    console.error("CALL STATUS CALLBACK ERROR:", err);
  }

  return res.sendStatus(200);
};













// =========================================================
// 17. DECLINE INCOMING CALL (Agent presses "Decline")
// =========================================================
// chal rhi te export const declineIncomingCall = async (req, res) => {
//   const { customerCallSid, agentName, agentId } = req.body;

//   if (!customerCallSid) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing customerCallSid",
//     });
//   }

//   try {
//     let pstnCallSid = customerCallSid;
//     let agentCallSid: string | null = null;

//     // 🔍 Resolve PSTN vs Agent leg
//     for (const [parent, child] of parentChildCallMap.entries()) {
//       if (child === customerCallSid) {
//         pstnCallSid = parent;
//         agentCallSid = child;
//         break;
//       }
//       if (parent === customerCallSid) {
//         pstnCallSid = parent;
//         agentCallSid = child;
//         break;
//       }
//     }

//     // 🔁 TRANSFER CASE → ONLY kill transfer leg
//     if (agentCallSid && callMetadata.get(agentCallSid)?.isTransfer) {
//       await twilioClient.calls(agentCallSid).update({ status: "completed" });
//       return res.json({
//         success: true,
//         message: "Transfer agent declined",
//       });
//     }

//     // 📡 Notify frontend immediately
//     const io = req.app.get("io");
//     io?.to(`user:${agentId}`).emit("incoming-call-ended", {
//       callSid: pstnCallSid,
//       reason: "declined_by_agent",
//     });

//     // 🔴 KILL AGENT LEG FIRST
//     if (agentCallSid && agentCallSid !== pstnCallSid) {
//       await twilioClient.calls(agentCallSid)
//         .update({ status: "completed" })
//         .catch(() => {});
//     }

//     // ⏳ short delay (important)
//     await new Promise(r => setTimeout(r, 300));

//     // 🔥 HARD KILL CUSTOMER CALL (THIS IS THE FIX)
//     await twilioClient.calls(pstnCallSid).update({
//       status: "completed",
//     });

//     // 🧹 cleanup
//     parentChildCallMap.delete(pstnCallSid);

//     return res.json({
//       success: true,
//       message: "Incoming call declined successfully",
//     });

//   } catch (err) {
//     console.error("DECLINE ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to decline call",
//       error: err.message,
//     });
//   }
// };
export const declineIncomingCall = async (req, res) => {
  const { customerCallSid, agentName, agentId } = req.body;

  if (!customerCallSid) {
    return res.status(400).json({ success: false });
  }

  try {
    let pstnCallSid = customerCallSid;
    let agentCallSid: string | null = null;

    // Resolve PSTN vs Agent leg
    for (const [parent, child] of parentChildCallMap.entries()) {
      if (child === customerCallSid) {
        pstnCallSid = parent;
        agentCallSid = child;
        break;
      }
      if (parent === customerCallSid) {
        pstnCallSid = parent;
        agentCallSid = child;
        break;
      }
    }

    // 🔁 Transfer → only kill transfer leg
    if (agentCallSid && callMetadata.get(agentCallSid)?.isTransfer) {
      await twilioClient.calls(agentCallSid).update({ status: "completed" });
      return res.json({ success: true });
    }

    const pstnCall = await twilioClient.calls(pstnCallSid).fetch();

    // 🔔 Notify frontend
    const io = req.app.get("io");
    io?.to(`user:${agentId}`).emit("incoming-call-ended", {
      callSid: pstnCallSid,
      reason: "declined_to_voicemail",
    });

    // 🔴 Kill agent leg
    if (agentCallSid && agentCallSid !== pstnCallSid) {
      await twilioClient.calls(agentCallSid)
        .update({ status: "completed" })
        .catch(() => {});
    }

    await new Promise(r => setTimeout(r, 300));

    // 🎯 REDIRECT CUSTOMER TO VOICEMAIL (KEY FIX)
    await twilioClient.calls(pstnCallSid).update({
      url: `${config.serverUrl}/voice/voicemail-twiml?callSid=${pstnCallSid}&agentName=${encodeURIComponent(agentName || "")}&agentNumber=${encodeURIComponent(pstnCall.to)}`,
      method: "POST",
    });

    parentChildCallMap.delete(pstnCallSid);

    return res.json({
      success: true,
      message: "Call declined → voicemail",
    });

  } catch (err) {
    console.error("DECLINE ERROR:", err);
    return res.status(500).json({ success: false });
  }
};


// voiceVoicemailTwiml.ts
export const voicemailTwiml = async (req, res) => {
  const { agentName, agentNumber, callSid } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    { voice: "alice" },
    `The agent is currently busy. Please leave a message after the tone.`
  );

  twiml.record({
    maxLength: 120,
    transcribe: true,
    transcribeCallback: `${config.serverUrl}/voice/voicemail-callback?callSid=${callSid}&agentNumber=${encodeURIComponent(agentNumber)}`,
    recordingStatusCallback: `${config.serverUrl}/voice/voicemail-recording-callback?callSid=${callSid}&agentNumber=${encodeURIComponent(agentNumber)}`,
    recordingStatusCallbackEvent: ["completed"],
  });

  twiml.hangup();

  res.type("text/xml").send(twiml.toString());
};



// Add these to your voice controller file (same file you posted)

// ─────────────────────────────────────────────────────────────────────────────
//  RECORDING – START (WORKS 100% – NO MORE "Customer leg not found")
// ─────────────────────────────────────────────────────────────────────────────
export const startRecording = async (req: Request, res: Response) => {
  const { conferenceFriendlyName } = req.body;

  if (!conferenceFriendlyName) {
    return res.status(400).json({ success: false, message: "Missing conference name" });
  }

  try {
    // 1. Find ANY CallSid that belongs to this conference
    let pstnCallSid: string | undefined;

    for (const [callSid, confName] of  callConferenceMap.entries()) {
        
      if (confName === conferenceFriendlyName) {
          
        // Prefer the leg that is NOT a client: (i.e. the real phone call)
        const call = await twilioClient.calls(callSid).fetch();
        if (call.to && !call.to.startsWith("client:")) {
          pstnCallSid = callSid;
          break;
        }
        // Fallback: if we only have the agent leg, use it (still works, just mono)
        if (!pstnCallSid) pstnCallSid = callSid;
      }
    }

    if (!pstnCallSid) {
      return res.status(404).json({
        success: false,
        message: "No call leg found for this conference",
      });
    }

    // 2. Start recording on that CallSid
    const recording = await twilioClient.calls(pstnCallSid).recordings.create({
      recordingChannels: "dual", // stereo: left = customer, right = agent
      recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
      recordingStatusCallbackEvent: ["completed"],
    });

    // 3. Store temporarily so callback can link it later
    await prisma.callRecordingTemp.create({
      data: {
        recordingSid: recording.sid,
        conferenceName: conferenceFriendlyName,
        status: "in-progress",
      },
    });

    console.log(`Recording started → ${recording.sid} on call ${pstnCallSid}`);

    return res.json({
      success: true,
      recordingSid: recording.sid,
    });
  } catch (err: any) {
    console.error("Start recording failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const stopRecording = async (req: Request, res: Response) => {
  const { recordingSid } = req.body;
  if (!recordingSid) return res.status(400).json({ message: "recordingSid required" });

  try {
    await twilioClient.recordings(recordingSid).update({ status: "stopped" });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Stop recording error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const recordingCallback = async (req: Request, res: Response) => {
  const { RecordingSid, RecordingStatus, RecordingUrl, RecordingDuration } = req.body;
  console.log('Recordig call back');
  console.log(req.body)

  if (RecordingStatus !== "completed" || !RecordingUrl) {
    return res.sendStatus(200);
  }

  try {
    const temp = await prisma.callRecordingTemp.findUnique({
      where: { recordingSid: RecordingSid },
    });

    if (!temp) return res.sendStatus(200);

    // Find the call session
    const session = await prisma.callSession.findFirst({
      where: { conferenceName: temp.conferenceName },
      orderBy: { startTime: "desc" },
    });

    if (!session) return res.sendStatus(200);

    // Save to your existing CallRecording model
    await prisma.callRecording.create({
      data: {
        callId: session.id,
        agentId: session.userId,
        url: RecordingUrl + ".mp3",
      },
    });

    // Optional: update session
    await prisma.callSession.update({
      where: { id: session.id },
      data: {
        recordingUrl: RecordingUrl + ".mp3",
        recordingDuration: parseInt(RecordingDuration || "0"),
      },
    });

    // Cleanup
    await prisma.callRecordingTemp.delete({ where: { recordingSid: RecordingSid } });

    res.sendStatus(200);
  } catch (err: any) {
    console.error("Recording callback error:", err);
    res.sendStatus(500);
  }
};



// controllers/contactController.ts
export const getContactCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    // 1. Get contact phones
    const contact = await prisma.contact.findUnique({
      where: { id: parseFloat(contactId) },
      include: {
        phones: { select: { numberE164: true } },
      },
    });

    if (!contact || !contact.phones.length) {
      return res.json({ success: true, data: [] });
    }

    const numbers = contact.phones.map(p => p.numberE164);

    // 2. Fetch call sessions (LIMITED)
    const calls = await prisma.callSession.findMany({
      where: {
        userId,
        OR: [
          { fromNumber: { in: numbers } },
          { toNumber: { in: numbers } },
        ],
      },
      orderBy: { startTime: "desc" },
      take: 50, // 🔥 LIMIT (performance)
    });

    return res.json({
      success: true,
      data: calls.map(c => ({
        sessionId: c.sessionId,
        direction: c.direction,
        type: c.type,
        number:
          c.direction === "inbound" ? c.fromNumber : c.toNumber,
        startTime: c.startTime,
        duration: c.duration || 0,
      })),
    });
  } catch (e) {
    console.error("CONTACT CALL HISTORY ERROR:", e);
    res.status(500).json({ success: false });
  }
};


export const saveCallNotes = async (req, res) => {
  const { callSessionId, notes } = req.body;
  console.log(req.body);
    const session = await prisma.callSession.findFirst({
        where:{
            sessionId: callSessionId
        }
    })
  try{
      if (!callSessionId || !Array.isArray(notes)) {
    return res.status(400).json({ success: false });
  }

  await prisma.callTranscript.createMany({
    data: notes.map(n => ({
      callSessionId:session.id,
      speaker: n.speaker,
      text: n.text,
    })),
  });

  return res.status(200).json({
    success: true,
    message: "Call notes saved successfully",
  });
  }catch(error){
      console.log(error.message)
  }
};



export const voicemailRecordingCallback = async (req: Request, res: Response) => {
  const { RecordingSid, RecordingUrl, RecordingDuration, CallSid, agentNumber } = req.body;
  if (!CallSid || !RecordingUrl) return res.sendStatus(200);  // Ignore incomplete

  try {
    const call = await twilioClient.calls(CallSid).fetch();  // Fetch metadata
    const normalizedAgentNumber = normalizeE164(agentNumber || call.to);
    const agent = await prisma.user.findFirst({ where: { phoneNumber: normalizedAgentNumber } });

    if (!agent) {
      console.error(`No agent found for voicemail: ${normalizedAgentNumber}`);
      return res.sendStatus(200);
    }

    // Upsert voicemail (create if new, update URL/duration if exists)
    await prisma.voicemail.upsert({
      where: { callSid: CallSid },
      create: {
        callSid: CallSid,
        fromNumber: call.from,
        toNumber: normalizedAgentNumber,
        recordingSid: RecordingSid,
        recordingUrl: RecordingUrl + '.mp3',  // Twilio sends without .mp3
        duration: parseInt(RecordingDuration || '0', 10),
        userId: agent.id,
      },
      update: {
        recordingSid: RecordingSid,
        recordingUrl: RecordingUrl + '.mp3',
        duration: parseInt(RecordingDuration || '0', 10),
      },
    });

    // Socket: Notify agent of new voicemail
    const io = req.app.get("io");
    const fromE164 = normalizeE164(call.from);
    io?.to(`user:${agent.id}`).emit('new-voicemail', { callSid: CallSid });  // Use rooms for per-user notifications
    if (agent?.fcmToken) {
    await sendFcmNotification({
      token: agent.fcmToken,
      title: "📩 New voicemail received",
      body: `From ${fromE164}`,
      data: {
        phoneNumber: fromE164,
        type: "NEW_VOICEMAIL",
      },
    });
  }

    console.log(`Voicemail recording saved: ${CallSid}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('Voicemail recording callback error:', err);
    res.sendStatus(500);
  }
};
export const voicemailCallback = async (req: Request, res: Response) => {
  const { TranscriptionText, TranscriptionStatus, CallSid } = req.body;
  if (TranscriptionStatus !== 'completed' || !TranscriptionText) return res.sendStatus(200);

  try {
    // Update existing voicemail with transcription
    const updated = await prisma.voicemail.updateMany({
      where: { callSid: CallSid },
      data: { transcription: TranscriptionText },
    });

    if (updated.count > 0) {
      const voicemail = await prisma.voicemail.findUnique({ where: { callSid: CallSid } });
      if (voicemail) {
        const io = req.app.get("io");
        io?.to(`user:${voicemail.userId}`).emit('voicemail-transcribed', { callSid: CallSid });
      }
      console.log(`Voicemail transcribed: ${CallSid}`);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Voicemail transcription callback error:', err);
    res.sendStatus(500);
  }
};
export const getVoicemails = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const where: any = { userId };
  if (unreadOnly === 'true' || unreadOnly === true) {
    where.listenedAt = null; // more reliable than { isSet: false }
  }

  const total = await prisma.voicemail.count({ where });

  const voicemails = await prisma.voicemail.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    select: {
      id: true,
      fromNumber: true,
      createdAt: true,
      duration: true,
      transcription: true,
      listenedAt: true,
      recordingUrl: true,
    },
  });

  // Fetch all contact names in parallel
  const enrichedVoicemails = await Promise.all(
    voicemails.map(async (vm) => ({
      ...vm,
      fromFormatted: formatPretty(vm.fromNumber),
      contactName: await getCallerName(vm.fromNumber),
      isUnread: !vm.listenedAt,
    }))
  );

  res.json({
    success: true,
    data: enrichedVoicemails,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
  });
};
export const listenVoicemail = async (req: Request, res: Response) => {
  const { voicemailId } = req.params;
  const userId = req.user.id;

  const voicemail = await prisma.voicemail.findUnique({
    where: { id: parseInt(voicemailId) },
  });

  if (!voicemail || voicemail.userId !== userId) {
    return res.status(404).json({ success: false, message: 'Voicemail not found' });
  }

  if (!voicemail.listenedAt) {
    await prisma.voicemail.update({
      where: { id: voicemail.id },
      data: { listenedAt: new Date() },
    });
    const io = req.app.get("io");
    io?.to(`user:${userId}`).emit('voicemail-listened', { voicemailId });
  }

  res.json({
    success: true,
    recordingUrl: voicemail.recordingUrl,
    transcription: voicemail.transcription,
  });
};
export const deleteVoicemail = async (req: Request, res: Response) => {
  const { voicemailId } = req.params;
  const userId = req.user.id;

  const voicemail = await prisma.voicemail.findUnique({ where: { id: parseInt(voicemailId) } });
  if (!voicemail || voicemail.userId !== userId) {
    return res.status(404).json({ success: false });
  }

  // Optional: Delete Twilio recording
  if (voicemail.recordingSid) {
    await twilioClient.recordings(voicemail.recordingSid).remove().catch(console.error);
  }

  await prisma.voicemail.delete({ where: { id: voicemail.id } });
  res.json({ success: true });
};





export const proxyTwilioRecording = async (req: Request, res: Response) => {
  // Full CORS setup – this fixes ORB in 99% cases
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.setHeader('Vary', 'Origin'); // Very important for ORB

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 for preflight
  }

  const { recordingSid } = req.params;
  const { recordingUrl } = req.query;

  try {
    let urlToFetch: string;

    if (recordingUrl) {
      urlToFetch = recordingUrl as string;
    } else if (recordingSid) {
      const recording = await twilioClient.recordings(recordingSid).fetch();
      urlToFetch = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } else {
      return res.status(400).json({ success: false, error: "Missing recordingSid or recordingUrl" });
    }

    console.log("Proxy fetching:", urlToFetch);

    const twilioResponse = await fetch(urlToFetch, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64')}`,
        Range: req.headers.range || 'bytes=0-', // Support partial requests (seeking)
      },
      redirect: 'follow',
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text().catch(() => '');
      console.error(`Twilio ${twilioResponse.status}: ${errorText}`);
      return res.status(twilioResponse.status).send(errorText || 'Twilio error');
    }

    // Critical headers for <audio> to accept the response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', twilioResponse.headers.get('Content-Length') || '');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Range', twilioResponse.headers.get('Content-Range') || '');

    // Stream
    if (twilioResponse.body) {
      const nodeStream = Readable.fromWeb(twilioResponse.body as any);
      nodeStream.pipe(res);

      nodeStream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).end();
      });
    } else {
      res.status(500).send('No audio body');
    }
  } catch (err: any) {
    console.error("Proxy crash:", err);
    res.status(500).json({ error: err.message });
  }
};
export const supervisedTransferExternal = async (req: Request, res: Response) => {
  const { conferenceFriendlyName, phoneNumber } = req.body;

  const conferences = await client.conferences.list({
    friendlyName: conferenceFriendlyName,
    limit: 1,
  });

  const conf = conferences[0];
  if (!conf) return res.status(404).json({ message: "Conf not found" });

  const participants = await client
    .conferences(conf.sid)
    .participants.list();

  const customer = participants.find(p => !p.to?.startsWith("client:"));
  const initiatingAgent =
    participants.find(p => p.to?.startsWith("client:"))?.to?.replace("client:", "") || "unknown";

  const customerNumber = customer?.to || "";
  const callerName = await getCallerName(customerNumber);

  // 📞 CALL AGENT / CONTACT NUMBER
  const newLeg = await client.calls.create({
    to: phoneNumber, // 👈 EXTERNAL NUMBER
    from: config.twilio.callerNumber,
    url: `${config.serverUrl}/voice/transfer-twiml?conferenceFriendlyName=${conferenceFriendlyName}&fromAgent=${initiatingAgent}&customer=${customerNumber}`,
    statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
      customer?.callSid || ""
    )}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  callConferenceMap.set(newLeg.sid, conferenceFriendlyName);
  callMetadata.set(newLeg.sid, {
    from: customerNumber,
    callerName,
    isTransfer: true,
    transferFrom: initiatingAgent,
  });

  return res.json({ success: true });
};


// POST /voice/admin/calls/:conferenceName/monitor
export const adminJoinCallMonitor = async (req, res) => {
  const { conferenceName } = req.params;
  const admin = req.user; // role = ADMIN
 console.log(req.user);
 console.log(admin);
  const call = await twilioClient.calls.create({
    to: `client:admin@example.com`,
    from: config.twilio.callerNumber,
    url: `${config.serverUrl}/voice/admin/monitor-twiml?conference=${conferenceName}`,
  });
  return res.json({ success: true, callSid: call.sid });
};
export const adminMonitorTwiml = (req, res) => {

  const { conference } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  const dial = twiml.dial({
    answerOnBridge: true,
  });

  dial.conference(conference, {
    startConferenceOnEnter: false,
    endConferenceOnExit: false,
    beep: false,

    // 🔥 CRITICAL
    muted: true,

    // optional
    waitUrl: "",
  });

  res.type("text/xml");

  res.send(twiml.toString());

};
export const agentJoinCallMonitor = async (req, res) => {
  const { conferenceName } = req.params;
  const admin = req.user; // role = ADMIN
  const monitorIdentity = `monitor-${admin.id}`;
  const call = await twilioClient.calls.create({
    to: `client:${monitorIdentity}`,
    from: config.twilio.callerNumber,
    url: `${config.serverUrl}/voice/agent/agent-monitor-twiml?conference=${conferenceName}&mode=MONITOR`,
  });
  return res.json({ success: true, callSid: call.sid });
};
export const agentMonitorTwiml = (req, res) => {
  const { conference } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  const dial = twiml.dial({
    answerOnBridge: true,
  });

  dial.conference(conference, {
    startConferenceOnEnter: false,
    endConferenceOnExit: false,
    beep: false,
    muted: true,        // 🔥 ADMIN MUTED
    statusCallbackEvent: "start join",
  });

  res.type("text/xml").send(twiml.toString());
};


// =======================================================
// 🔴 ADMIN – GET LIVE CALLS (DB SOURCE OF TRUTH)
// =======================================================
export const getAdminLiveCalls = async (req: Request, res: Response) => {
  try {
    // 🔐 Optional: Admin guard
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const now = Date.now();

    const liveCalls = await prisma.liveCall.findMany({
      orderBy: {
        startedAt: "desc",
      },
    });

    const data = liveCalls.map(call => {
      const startedAt =
        call.startedAt instanceof Date
          ? call.startedAt.getTime()
          : new Date(call.startedAt).getTime();

      return {
        conferenceName: call.conferenceName,
        direction: call.direction,
        customerNumber: call.customerNumber,
        customerName: call.customerName || null,

        agentId: call.agentId || null,
        agentName: call.agentName || null,

        isTransfer: call.isTransfer,

        startedAt,
        duration: Math.floor((now - startedAt) / 1000), // 🔥 realtime seconds
      };
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err: any) {
    console.error("GET ADMIN LIVE CALLS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch live calls",
    });
  }
};


async function endAdminCall(io, conferenceName: string) {
  await adminActiveCalls.delete(conferenceName);
  await deleteLiveCall(conferenceName);

  // cleanup callConferenceMap entries for this conference
  const entries = await callConferenceMap.entries();
  for (const [sid, conf] of entries) {
    if (conf === conferenceName) {
      await callConferenceMap.delete(sid);
    }
  }

  io?.emit("admin-call-ended", { conferenceName });
}


