// // @ts-nocheck
// import { Request, Response } from "express";
// import twilio from "twilio";
// import { prisma } from "../config/prisma.js";
// import { config } from "../config/index.js";
// import { twilioClient } from "../config/twilioConfig.js";
// import { parsePhoneNumberFromString } from "libphonenumber-js";
// import { formatPretty } from "../utils/phone.js";
// import {
//   activeSessions,
//   createSession,
//   appendLeg,
//   updateLegStatus,
//   completeSession,
// } from "../services/callSessionService.js";
// import { buildDateFilter } from "./adminController.js";

// const client = twilio(config.twilio.accountSid, config.twilio.authToken);

// // =========================================================
// // GLOBAL MAPS
// // =========================================================
// export const callConferenceMap = new Map<string, string>(); // CallSid -> ConferenceName
// export const callMetadata = new Map<
//   string,
//   { from: string; callerName: string; isTransfer: boolean; transferFrom?: string }
// >(); // CallSid -> Metadata

// export const pendingOutboundConference = new Map<
//   string,
//   {
//     friendlyName: string;
//     customerNumber: string;
//     callerId: string;
//     conferenceSid: string | null;
//   }
// >();

// // NEW: Parent PSTN leg -> Agent leg mapping (for canceling ringing agent on PSTN hangup)
// export const parentChildCallMap = new Map<string, string>(); // parentCallSid (PSTN) -> agentCallSid

// // =========================================================
// // HELPER: Get Caller Name from Number
// // =========================================================
// async function getCallerName(number: string): Promise<string> {
//   if (!number) return "Unknown Caller";
//   const incomingNumber = number.replace(/\s+/g, "");
//   const contactPhone = await prisma.contactPhone.findFirst({
//     where: { numberE164: incomingNumber },
//     include: { contact: true },
//   });
//   if (contactPhone?.contact) {
//     return `${contactPhone.contact.firstName} ${
//       contactPhone.contact.lastName ?? ""
//     }`.trim();
//   }
//   const agentUser = await prisma.user.findFirst({
//     where: { phoneNumber: incomingNumber },
//   });
//   if (agentUser) {
//     return `${agentUser.name} (Agent)`;
//   }
//   return "Unknown Caller";
// }

// // =========================================================
// // HELPER: Get User Name from SIP Identity
// // =========================================================
// async function getUserName(sipIdentity: string): Promise<string> {
//   const user = await prisma.user.findFirst({
//     where: { sipIdentity },
//   });
//   return user?.name || sipIdentity;
// }

// // =========================================================
// // PHONE NORMALIZER
// // =========================================================
// const normalizeE164 = (num: string): string => {
//   if (!num) return "";
//   const cleaned = num.replace(/\s+/g, "");
//   try {
//     const parsed = parsePhoneNumberFromString(cleaned);
//     if (parsed) return parsed.format("E.164");
//   } catch {}
//   if (cleaned.startsWith("+")) return cleaned.replace(/[^\d+]/g, "");
//   const parsed2 = parsePhoneNumberFromString(cleaned, "US");
//   if (parsed2?.isValid()) return parsed2.format("E.164");
//   return cleaned;
// };

// // =========================================================
// // 1. INCOMING PSTN CALL
// // =========================================================
// export const handleIncomingCall = async (req: Request, res: Response) => {
//   const { From, To, CallSid } = req.body;

//   const dialedNumberE164 = normalizeE164(To);

//   console.log("INCOMING CALL DEBUG:", {
//     rawTo: To,
//     normalizedTo: dialedNumberE164,
//     from: From,
//   });

//   const agent = await prisma.user.findFirst({
//     where: {
//       phoneNumber: dialedNumberE164,
//       status: "AVAILABLE",
//     },
//   });

//   const callerName = await getCallerName(From);

//   if (!agent) {
//     console.log(`No agent found for number: ${dialedNumberE164}`);

//     const twiml = new twilio.twiml.VoiceResponse();
//     twiml.say(
//       { voice: "alice" },
//       "The person you are trying to reach is not available right now."
//     );
//     twiml.say({ voice: "alice" }, "Please leave a message after the tone.");
//     twiml.record({
//       maxLength: 120,
//       transcribe: true,
//       transcribeCallback: `${config.serverUrl}/voice/voicemail-callback?agentNumber=${encodeURIComponent(
//         dialedNumberE164
//       )}`,
//     });
//     twiml.hangup();

//     return res.type("text/xml").send(twiml.toString());
//   }

//   const conferenceFriendlyName = `in_${Date.now()}_${agent.id}`;
//   const twiml = new twilio.twiml.VoiceResponse();

//   const dial = twiml.dial({
//     answerOnBridge: true,
//     callerId: From,
//   });
 
//     const stream = twiml.start().stream({
//       url: "wss://api.aiocaller.com/media-stream",
//     });
//     stream.parameter({
//     conference: conferenceFriendlyName,
//     role: 'customer'
//     });
 
//   (dial as any).conference(conferenceFriendlyName, {
//     startConferenceOnEnter: true,
//     endConferenceOnExit: true,
//     waitUrl: "https://com.twilio.sounds.music.s3.amazonaws.com/MUSICAL-ECHO-1.mp3",
//     waitMethod: "GET",
//   });

//   if (CallSid) {
//     callConferenceMap.set(CallSid, conferenceFriendlyName);
//   }

//   client.calls
//     .create({
//       to: `client:${agent.sipIdentity}`,
//       from: From,
//       url: `${config.serverUrl}/voice/join-conference?conferenceFriendlyName=${conferenceFriendlyName}&role=agent&callerName=${encodeURIComponent(
//         callerName
//       )}&customerNumber=${encodeURIComponent(From)}`,
//       // IMPORTANT: link agent leg to PSTN leg via parentCallSid (for later cancel)
//       statusCallback: `${config.serverUrl}/voice/status-callback${
//         CallSid ? `?parentCallSid=${encodeURIComponent(CallSid)}` : ""
//       }`,
//       statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
//     })
//     .then((leg) => {
//       console.log(`Ringing agent ${agent.name || agent.sipIdentity} → ${leg.sid}`);
//       callConferenceMap.set(leg.sid, conferenceFriendlyName);
//       callMetadata.set(leg.sid, {
//         from: From,
//         callerName,
//         isTransfer: false,
//       });

//       if (CallSid) {
//         // Map parent PSTN call to this agent leg
//         parentChildCallMap.set(CallSid, leg.sid);
//       }
//     })
//     .catch((err) => {
//       console.error("Failed to ring agent:", err);
//     });

//   return res.type("text/xml").send(twiml.toString());
// };

// // =========================================================
// // 2. TWIML - A LEG JOINS CONFERENCE
// // =========================================================
// export const joinConference = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, role, callerName } = req.query;

//   const twiml = new twilio.twiml.VoiceResponse();

//   if (role === "agent") {
//     twiml.say(
//       `Incoming call from ${
//         callerName ? callerName : "an unknown caller"
//       }.`
//     );
//     twiml.pause({ length: 1 });
//   }
 
//    const stream = twiml.start().stream({
//       url: "wss://api.aiocaller.com/media-stream",
//     });
    
//     stream.parameter({
//     conference: conferenceFriendlyName,
//     role:'agent' 
//     });
//   const dial = twiml.dial({ answerOnBridge: true });
//   (dial as any).conference(String(conferenceFriendlyName), {
//     startConferenceOnEnter: true,
//     endConferenceOnExit: role === "agent",
//     beep: false,
//   });

//   return res.type("text/xml").send(twiml.toString());
// };

// // =========================================================
// // 3. OUTBOUND CALL (AGENT CALLS CUSTOMER)
// // =========================================================
// export const handleOutboundCall = async (req: Request, res: Response) => {
//   const { To, From } = req.body;
//   const sipId = From.replace("client:", "");

//   const agent = await prisma.user.findFirst({
//     where: { sipIdentity: sipId },
//   });

//   if (!agent)
//     return res.status(400).json({ message: "Invalid agent identity" });

//   const friendlyName = `out_${Date.now()}`;

//   pendingOutboundConference.set(sipId, {
//     friendlyName,
//     customerNumber: To,
//     callerId: agent.phoneNumber || config.twilio.callerNumber,
//     conferenceSid: null,
//   });

//   return res.json({
//     success: true,
//     conferenceFriendlyName: friendlyName,
//   });
// };

// // =========================================================
// // 4. TWIML FOR OUTBOUND - AGENT JOINS CONF
// // =========================================================
// export const outboundTwiml = async (req: Request, res: Response) => {
//   const { identity } = req.body;
//   const sipId = identity.replace("client:", "");

//   const entry = pendingOutboundConference.get(sipId);
//   if (!entry) {
//     return res
//       .type("text/xml")
//       .send(`<Response><Say>No conference found</Say></Response>`);
//   }

//   const { friendlyName, customerNumber, callerId } = entry;

//   const twiml = new twilio.twiml.VoiceResponse();
  
//     const stream = twiml.start().stream({
//       url: "wss://api.aiocaller.com/media-stream",
//     });
//     stream.parameter({
//     conference: conferenceFriendlyName,
//     role: 'agent'
//     });
//   const dial = twiml.dial({
//     answerOnBridge: true,
//   });
  
//   (dial as any).conference(friendlyName, {
//     startConferenceOnEnter: true,
//     endConferenceOnExit: true,
//     beep: false,
//   });

//   res.type("text/xml").send(twiml.toString());

//   setTimeout(async () => {
//     try {
//       await twilioClient
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
//       console.log("OUTBOUND: Customer dialed", customerNumber);
//     } catch (err) {
//       console.error("OUTBOUND DIAL FAILED:", err);
//     }
//   }, 300);
// };

// // =========================================================
// // 5. HOLD / RESUME
// // =========================================================
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

// // =========================================================
// // 6. BLIND TRANSFER
// // =========================================================
// export const blindTransfer = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, targetIdentity, currentAgentCallSid } =
//     req.body;

//   const conferences = await client.conferences.list({
//     friendlyName: conferenceFriendlyName,
//     limit: 1,
//   });

//   const conf = conferences[0];
//   if (!conf) return res.status(404).json({ message: "Conf not found" });

//   const participants: any[] = await client
//     .conferences(conf.sid)
//     .participants.list();

//   const customer = participants.find((p) => !p.to?.startsWith("client:"));
//   const customerNumber = customer?.to || "";

//   const initiatingAgent =
//     participants.find((p) => p.to?.startsWith("client:"))?.to?.replace(
//       "client:",
//       ""
//     ) || "unknown";

//   const callerName = await getCallerName(customerNumber);

//   await client
//     .conferences(conf.sid)
//     .participants(currentAgentCallSid)
//     .update({ status: "completed" as any });

//   const newLeg = await client.calls.create({
//     to: `client:${targetIdentity}`,
//     from: config.twilio.callerNumber,
//     url: `${config.serverUrl}/voice/transfer-twiml?conferenceFriendlyName=${conferenceFriendlyName}&fromAgent=${initiatingAgent}&customer=${customerNumber}&toAgent=${targetIdentity}`,
//     statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
//       customer?.callSid || ""
//     )}`,
//     statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
//   });

//   callConferenceMap.set(newLeg.sid, conferenceFriendlyName);
//   callMetadata.set(newLeg.sid, {
//     from: customerNumber,
//     callerName,
//     isTransfer: true,
//     transferFrom: initiatingAgent,
//   });

//   return res.json({
//     success: true,
//     newAgentCallSid: newLeg.sid,
//   });
// };

// // =========================================================
// // 7. SUPERVISED TRANSFER
// // =========================================================
// export const supervisedTransfer = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, targetIdentity } = req.body;

//   const conferences = await client.conferences.list({
//     friendlyName: conferenceFriendlyName,
//     limit: 1,
//   });

//   const conf = conferences[0];
//   if (!conf) return res.status(404).json({ message: "Conf not found" });

//   const participants: any[] = await client
//     .conferences(conf.sid)
//     .participants.list();

//   const customer = participants.find((p) => !p.to?.startsWith("client:"));
//   const customerNumber = customer?.to || "";

//   const initiatingAgent =
//     participants.find((p) => p.to?.startsWith("client:"))?.to?.replace(
//       "client:",
//       ""
//     ) || "unknown";

//   const callerName = await getCallerName(customerNumber);

//   const newLeg = await client.calls.create({
//     to: `client:${targetIdentity}`,
//     from: config.twilio.callerNumber,
//     url: `${config.serverUrl}/voice/transfer-twiml?conferenceFriendlyName=${conferenceFriendlyName}&fromAgent=${initiatingAgent}&customer=${customerNumber}&toAgent=${targetIdentity}`,
//     statusCallback: `${config.serverUrl}/voice/status-callback?parentCallSid=${encodeURIComponent(
//       customer?.callSid || ""
//     )}`,
//     statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
//   });

//   callConferenceMap.set(newLeg.sid, conferenceFriendlyName);
//   callMetadata.set(newLeg.sid, {
//     from: customerNumber,
//     callerName,
//     isTransfer: true,
//     transferFrom: initiatingAgent,
//   });

//   return res.json({ success: true });
// };

// // =========================================================
// // 8. COMPLETE SUPERVISED TRANSFER
// // =========================================================
// export const completeTransfer = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, currentAgentCallSid } = req.body;

//   const conferences = await client.conferences.list({
//     friendlyName: conferenceFriendlyName,
//     limit: 1,
//   });

//   const conf = conferences[0];
//   if (!conf) return res.status(404).json({ message: "Conf not found" });

//   await client
//     .conferences(conf.sid)
//     .participants(currentAgentCallSid)
//     .update({ status: "completed" as any });

//   return res.json({ success: true });
// };

// // =========================================================
// // 9. CONFERENCE STATUS CALLBACK (CUSTOMER/AGENT LEAVE)
// // =========================================================
// export const conferenceStatusCallback = async (req: Request, res: Response) => {
//   const event = req.body.StatusCallbackEvent;
//   const conferenceSid = req.body.ConferenceSid;

//   console.log("CONF EVENT:", event, { conferenceSid });

//   if (!conferenceSid) return res.sendStatus(200);

//   try {
//     const participants: any[] = await twilioClient
//       .conferences(conferenceSid)
//       .participants.list();

//     const agents = participants.filter((p) => p.to?.startsWith("client:"));
//     const customers = participants.filter((p) => !p.to?.startsWith("client:"));

//     // CUSTOMER LEFT → end full conference
//     if (event === "participant-leave" && !req.body.To?.startsWith("client:")) {
//       console.log("CUSTOMER LEFT → ending entire conference");

//       // Twilio will hangup all remaining participants (agents, etc.)
//       await twilioClient.conferences(conferenceSid).update({
//         status: "completed",
//       });

//       return res.sendStatus(200);
//     }

//     // AGENT LEFT
//     if (event === "participant-leave" && req.body.To?.startsWith("client:")) {
//       console.log("AGENT LEFT");

//       if (agents.length === 0) {
//         console.log("NO AGENTS LEFT → ending conference");
//         await twilioClient.conferences(conferenceSid).update({
//           status: "completed",
//         });
//       }
//     }
//   } catch (err) {
//     console.error("CONF-CB ERROR:", err);
//   }

//   res.sendStatus(200);
// };

// // =========================================================
// // 10. ENSURE CONFERENCE HEALTH
// // =========================================================
// async function ensureConferenceHealth(conferenceSid: string) {
//   try {
//     const participants: any[] = await twilioClient
//       .conferences(conferenceSid)
//       .participants.list();

//     const agents = participants.filter((p) => p.to?.startsWith("client:"));
//     const customers = participants.filter((p) => !p.to?.startsWith("client:"));

//     if (customers.length === 0 && agents.length > 0) {
//       console.log("CUSTOMER LEFT — NOT ENDING CONFERENCE");
//       for (const agent of agents) {
//         await twilioClient.calls(agent.callSid).update({
//           twiml:
//             "<Response><Say>Customer has left the call.</Say></Response>",
//         });
//       }
//       return;
//     }

//     if (agents.length === 0) {
//       console.log("NO AGENTS LEFT → ENDING CONFERENCE");
//       await twilioClient.conferences(conferenceSid).update({
//         status: "completed",
//       });
//       return;
//     }
//   } catch (err) {
//     console.error("CONF HEALTH ERROR:", err);
//   }
// }

// // =========================================================
// // 11. GET CONFERENCE BY CallSid
// // =========================================================
// export const getConferenceNameByCallSid = (req: Request, res: Response) => {
//   const { callSid } = req.params;

//   const conf = callConferenceMap.get(callSid);
//   if (!conf) return res.status(404).json({ message: "Not found" });

//   return res.json({ conferenceName: conf });
// };

// // =========================================================
// // 12. GET CALL INFO BY CallSid (for frontend)
// // =========================================================
// export const getCallInfo = (req: Request, res: Response) => {
//   const { callSid } = req.params;

//   const metadata = callMetadata.get(callSid);
//   if (!metadata) return res.status(404).json({ message: "Not found" });

//   return res.json(metadata);
// };

// // =========================================================
// // 13. FORCE HANGUP (AGENT ENDS CALL)
// // =========================================================
// export const forceHangup = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, agentCallSid } = req.body;

//   try {
//     const conferences = await twilioClient.conferences.list({
//       friendlyName: conferenceFriendlyName,
//       limit: 1,
//     });

//     const conf = conferences[0];
//     if (!conf) {
//       return res.status(404).json({ message: "Conference not found" });
//     }

//     const participants: any[] = await twilioClient
//       .conferences(conf.sid)
//       .participants.list();
//     console.log(participants.length);

//     if (participants.length > 2) {
//       console.log("Other participants exist → removing only agent leg");

//       if (!agentCallSid) {
//         return res.status(400).json({
//           success: false,
//           message: "Agent CallSid missing for partial hangup",
//         });
//       }

//       await (twilioClient
//         .conferences(conf.sid)
//         .participants(agentCallSid) as any).update({ status: "completed" });

//       return res.json({
//         success: true,
//         message: "Agent leg removed, conference stays active",
//       });
//     }

//     console.log("No participants left → ending conference");

//     for (const p of participants) {
//       await (twilioClient
//         .conferences(conf.sid)
//         .participants(p.callSid) as any).update({ status: "completed" });
//     }

//     await twilioClient.conferences(conf.sid).update({
//       status: "completed",
//     });

//     return res.json({
//       success: true,
//       message: "Conference ended completely",
//     });
//   } catch (err: any) {
//     console.error("FORCE HANGUP ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// };

// // =========================================================
// // 14. TWIML FOR TRANSFER (Agent → Agent)
// // =========================================================
// export const transferTwiml = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName, fromAgent, customer } = req.query;

//   const twiml = new twilio.twiml.VoiceResponse();

//   const fromAgentName = await getUserName(fromAgent as string);
//   const callerName = await getCallerName(customer as string);

//   twiml.say(
//     `Incoming transfer from ${fromAgentName}. Caller is ${callerName}.`
//   );
//   twiml.pause({ length: 1 });

//   const dial = twiml.dial({ answerOnBridge: true });

//   (dial as any).conference(String(conferenceFriendlyName), {
//     startConferenceOnEnter: true,
//     endConferenceOnExit: true,
//     beep: false,
//   });

//   console.log(twiml.toString());
//   return res.type("text/xml").send(twiml.toString());
// };

// // =========================================================
// // 15. GET CALL LOGS BY USER (SESSIONS)
// // =========================================================

// export const getCallLogsByUser = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user.id;
//     const { filter = "all", startDate, endDate } = req.query as any;

//     // ==========================
//     // 1. Fetch Agent Phone #
//     // ==========================
//     const agent = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { phoneNumber: true },
//     });

//     if (!agent?.phoneNumber) {
//       return res.status(400).json({ success: false, message: "Agent has no phone number" });
//     }

//     const agentPhone = agent.phoneNumber;

//     // ==========================
//     // 2. Date Filters
//     // ==========================
//     const dateFilter = buildDateFilter(filter, startDate, endDate);
//     const startTimeAfter = dateFilter.gte ? new Date(dateFilter.gte) : undefined;
//     const startTimeBefore = dateFilter.lte ? new Date(dateFilter.lte) : undefined;

//     // ==========================
//     // 3. Fetch Twilio Logs
//     // ==========================
//     const twilioCalls = await twilioClient.calls.list({
//       startTimeAfter,
//       startTimeBefore,
//       limit: 200,
//     });

//     const phoneCache = new Map<string, string>();
//     const logs: any[] = [];

//     // ==========================
//     // 4. Process Calls
//     // ==========================
//     for (const call of twilioCalls) {
//       // Ignore internal Twilio SIP clients
//       if (String(call.from).startsWith("client:") || String(call.to).startsWith("client:")) {
//         continue;
//       }

//       const isInbound = call.to === agentPhone;
//       const isOutbound = call.from === agentPhone;

//       // Not related to this agent
//       if (!isInbound && !isOutbound) continue;

//       // Determine direction
//       const remoteNumber = isInbound ? call.from : call.to;
//       if (!remoteNumber) continue;

//       // Normalize for contact lookup
//       const normalized = remoteNumber.replace(/\D/g, "").slice(-10);

//       // Determine missed calls
//       const isMissed = ["no-answer", "busy", "failed", "canceled"].includes(call.status);
//       const direction = isMissed && isInbound ? "missed" : isInbound ? "inbound" : "outbound";

//       // Lookup Contact Name
//       let contactName = "Unknown Caller";
//       if (normalized) {
//         if (!phoneCache.has(normalized)) {
//           const contactPhone = await prisma.contactPhone.findFirst({
//             where: { numberE164: `+1${normalized}` },
//             include: {
//               contact: {
//                 select: { firstName: true, lastName: true, nickName: true },
//               },
//             },
//           });

//           if (contactPhone?.contact) {
//             contactName =
//               `${contactPhone.contact.firstName || ""} ${contactPhone.contact.lastName || ""}`.trim() ||
//               contactPhone.contact.nickName ||
//               "Unknown Caller";
//           }
//           phoneCache.set(normalized, contactName);
//         } else {
//           contactName = phoneCache.get(normalized)!;
//         }
//       }

//       // Recording URL
//       let recordingUrl = null;
//       const rec = await twilioClient.calls(call.sid).recordings.list({ limit: 1 });
//       if (rec[0]) {
//         recordingUrl = `https://api.twilio.com${rec[0].uri.replace(".json", ".mp3")}`;
//       }

//       // Time + duration
//       const startTime = new Date(call.startTime || call.dateCreated);
//       const duration = isMissed ? 0 : parseInt(call.duration || "0", 10);
//       const endTime = call.endTime
//         ? new Date(call.endTime)
//         : new Date(startTime.getTime() + duration * 1000);

//       logs.push({
//         sessionId: call.sid,
//         direction,
//         type: "voice",
//         number: remoteNumber,
//         formatted: formatPretty(remoteNumber),
//         contactName,
//         startTime: startTime.toISOString(),
//         endTime: endTime.toISOString(),
//         duration,
//         recording: recordingUrl,
//       });
//     }

//     // ==========================
//     // 5. FINAL DEDUPLICATION FIX
//     // ==========================
//     // Fix duplicate logs for same call occurring due to Twilio legs
//     const uniqueMap = new Map();

//     for (const log of logs) {
//       const key =
//         log.number +
//         "|" +
//         log.startTime.slice(0, 16) + // round to minute
//         "|" +
//         log.duration;

//       if (!uniqueMap.has(key)) {
//         uniqueMap.set(key, log);
//       }
//     }

//     const uniqueLogs = Array.from(uniqueMap.values())
//       .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
//       .slice(0, 150);

//     // ==========================
//     // 6. Send Response
//     // ==========================
//     return res.json({ success: true, data: uniqueLogs });

//   } catch (err) {
//     console.error("getCallLogsByUser ERROR:", err);
//     return res.status(500).json({ success: false, message: "Failed to load call logs" });
//   }
// };


// // =========================================================
// // 16. CORE STATUS CALLBACK (NO DUP LOGS + CORRECT DIRECTION)
// // =========================================================
// export const callStatusCallback = async (req: Request, res: Response) => {
//   const {
//     CallSid,
//     CallStatus,
//     ParentCallSid,
//     From,
//     To,
//     RecordingUrl,
//     Direction,
//   } = req.body;

//   const parentFromQuery =
//     (req.query.parentCallSid as string | undefined) ||
//     (req.query.parent as string | undefined) ||
//     (req.body.parentFromQuery as string | undefined);

//   const effectiveParent = ParentCallSid || parentFromQuery || undefined;

//   const fromIsClient = typeof From === "string" && From.startsWith("client:");
//   const toIsClient = typeof To === "string" && To.startsWith("client:");
//   const dirFromTwilio = typeof Direction === "string" ? Direction : "";

//   console.log("========== TWILIO CALLBACK ==========");
//   console.log({
//     CallSid,
//     CallStatus,
//     ParentCallSid,
//     parentFromQuery,
//     effectiveParent,
//     From,
//     To,
//     RecordingUrl,
//     Direction,
//   });

//   // ------------------------------------------------------------
//   // 0. Ignore internal / WebRTC-only legs that cause duplicates
//   // ------------------------------------------------------------

//   // (a) Pure client leg, no PSTN (e.g. client:alice -> Twilio, Direction: inbound)
//   if (
//     fromIsClient &&
//     !toIsClient &&
//     !ParentCallSid &&
//     !parentFromQuery
//   ) {
//     console.log("IGNORING PURE CLIENT LEG:", CallSid);
//     console.log("========== END CALLBACK (IGNORED) ==========\n");
//     return res.sendStatus(200);
//   }

//   // (b) Agent notification leg for inbound call: From = customer, To = client:agent, Direction = outbound-api
//   //     These are already represented by the inbound trunk call (customer -> our DID)
//   if (
//     !fromIsClient &&
//     toIsClient &&
//     dirFromTwilio === "outbound-api" &&
//     !ParentCallSid &&
//     !parentFromQuery
//   ) {
//     console.log(
//       "IGNORING INBOUND AGENT LEG (customer -> client:agent) FOR LOGGING:",
//       CallSid
//     );
//     console.log("========== END CALLBACK (IGNORED) ==========\n");
//     return res.sendStatus(200);
//   }

//   // ------------------------------------------------------------
//   // 1. Determine logical leg direction (for reporting)
//   // ------------------------------------------------------------
//   let legDirection: "inbound" | "outbound";

//   if (fromIsClient) {
//     // Agent-originated leg
//     legDirection = "outbound";
//   } else if (toIsClient) {
//     // Leg going toward agent
//     legDirection = "inbound";
//   } else if (dirFromTwilio.startsWith("outbound")) {
//     legDirection = "outbound";
//   } else {
//     legDirection = "inbound";
//   }

//   // ------------------------------------------------------------
//   // 2. Decide how to treat this CallSid (root session vs leg)
//   // ------------------------------------------------------------
//   if (!activeSessions.has(CallSid)) {
//     if (effectiveParent && activeSessions.has(effectiveParent)) {
//       // Child leg of an existing session (e.g. transfer)
//       console.log("➕ APPEND LEG →", CallSid, "parent:", effectiveParent);
//       await appendLeg(CallSid, effectiveParent, {
//         from: From,
//         to: To,
//         direction: legDirection,
//         isTransfer: !!effectiveParent,
//       });
//     } else {
//       // Root session (no known parent) – always use REAL CallSid
//       console.log("🆕 CREATE SESSION FOR:", CallSid);

//       await createSession({
//         callSid: CallSid,
//         from: From,
//         to: To,
//         direction: legDirection,
//       });
//     }
//   }

//   // ------------------------------------------------------------
//   // 3. Update leg status
//   // ------------------------------------------------------------
//   console.log("📌 UPDATE LEG:", CallSid, "→", CallStatus);
//   await updateLegStatus(CallSid, CallStatus, RecordingUrl);

//   // ------------------------------------------------------------
//   // 4. If tracked leg is completed, check for session completion
//   // ------------------------------------------------------------
//   if (CallStatus === "completed" && activeSessions.has(CallSid)) {
//     console.log("⚡ COMPLETE SESSION CHECK FOR:", CallSid);
//     await completeSession(CallSid);
//   }

//   // ------------------------------------------------------------
//   // 5. If this looks like a PSTN root leg completion, cancel its agent leg (if still ringing/active)
//   // ------------------------------------------------------------
//   if (
//     CallStatus === "completed" &&
//     !fromIsClient && // PSTN / DID side
//     !toIsClient      // not a client leg
//   ) {
//     const childAgentCallSid = parentChildCallMap.get(CallSid);
//     if (childAgentCallSid) {
//       console.log(
//         "🔚 PARENT PSTN COMPLETED → cancelling mapped agent leg:",
//         childAgentCallSid
//       );
//       try {
//         await twilioClient.calls(childAgentCallSid).update({
//           status: "completed" as any,
//         });
//       } catch (err) {
//         console.error("Failed to end child agent call:", err);
//       } finally {
//         parentChildCallMap.delete(CallSid);
//       }
//     }
//   }

//   console.log("========== END CALLBACK ==========\n");
//   return res.sendStatus(200);
// };

// // =========================================================
// // 17. DECLINE INCOMING CALL (Agent presses "Decline")
// // =========================================================
// export const declineIncomingCall = async (req, res) => {
//   const { customerCallSid, agentName } = req.body;

//   if (!customerCallSid) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing customerCallSid",
//     });
//   }

//   try {
//     let pstnCallSid = customerCallSid;

//     // 1️⃣ If provided CallSid is AGENT leg → find matching parent PSTN CallSid
//     for (const [parent, child] of parentChildCallMap.entries()) {
//       if (child === customerCallSid) {
//         pstnCallSid = parent;
//         console.log("Mapped agent leg → parent PSTN CallSid:", pstnCallSid);
//       }
//     }

//     // 2️⃣ Fetch the real PSTN call
//     const call = await twilioClient.calls(pstnCallSid).fetch();

//     console.log("DECLINE CALL STATUS:", pstnCallSid, call.status);

//     if (!["ringing", "in-progress", "queued"].includes(call.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Call is ${call.status}. Cannot redirect.`,
//       });
//     }

//     // 3️⃣ Redirect customer to voicemail message
//     await twilioClient.calls(pstnCallSid).update({
//       twiml: `
//         <Response>
//           <Say voice="alice">
//             The agent ${agentName || ""} is currently unavailable.
//             Please leave a message after the tone.
//           </Say>
//           <Record maxLength="120" transcribe="true"
//             transcribeCallback="${config.serverUrl}/voice/voicemail-callback?callSid=${pstnCallSid}" />
//           <Hangup/>
//         </Response>
//       `,
//     });

//     // 4️⃣ Cleanup child mapping
//     parentChildCallMap.delete(pstnCallSid);

//     return res.json({
//       success: true,
//       message: "Customer redirected to voicemail",
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


// // Add these to your voice controller file (same file you posted)

// // ─────────────────────────────────────────────────────────────────────────────
// //  RECORDING – START (WORKS 100% – NO MORE "Customer leg not found")
// // ─────────────────────────────────────────────────────────────────────────────
// export const startRecording = async (req: Request, res: Response) => {
//   const { conferenceFriendlyName } = req.body;

//   if (!conferenceFriendlyName) {
//     return res.status(400).json({ success: false, message: "Missing conference name" });
//   }

//   try {
//     // 1. Find ANY CallSid that belongs to this conference
//     let pstnCallSid: string | undefined;

//     for (const [callSid, confName] of callConferenceMap.entries()) {
//       if (confName === conferenceFriendlyName) {
//         // Prefer the leg that is NOT a client: (i.e. the real phone call)
//         const call = await twilioClient.calls(callSid).fetch();
//         if (call.to && !call.to.startsWith("client:")) {
//           pstnCallSid = callSid;
//           break;
//         }
//         // Fallback: if we only have the agent leg, use it (still works, just mono)
//         if (!pstnCallSid) pstnCallSid = callSid;
//       }
//     }

//     if (!pstnCallSid) {
//       return res.status(404).json({
//         success: false,
//         message: "No call leg found for this conference",
//       });
//     }

//     // 2. Start recording on that CallSid
//     const recording = await twilioClient.calls(pstnCallSid).recordings.create({
//       recordingChannels: "dual", // stereo: left = customer, right = agent
//       recordingStatusCallback: `${config.serverUrl}/voice/record/callback`,
//       recordingStatusCallbackEvent: ["completed"],
//     });

//     // 3. Store temporarily so callback can link it later
//     await prisma.callRecordingTemp.create({
//       data: {
//         recordingSid: recording.sid,
//         conferenceName: conferenceFriendlyName,
//         status: "in-progress",
//       },
//     });

//     console.log(`Recording started → ${recording.sid} on call ${pstnCallSid}`);

//     return res.json({
//       success: true,
//       recordingSid: recording.sid,
//     });
//   } catch (err: any) {
//     console.error("Start recording failed:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const stopRecording = async (req: Request, res: Response) => {
//   const { recordingSid } = req.body;
//   if (!recordingSid) return res.status(400).json({ message: "recordingSid required" });

//   try {
//     await twilioClient.recordings(recordingSid).update({ status: "stopped" });
//     return res.json({ success: true });
//   } catch (err: any) {
//     console.error("Stop recording error:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const recordingCallback = async (req: Request, res: Response) => {
//   const { RecordingSid, RecordingStatus, RecordingUrl, RecordingDuration } = req.body;

//   if (RecordingStatus !== "completed" || !RecordingUrl) {
//     return res.sendStatus(200);
//   }

//   try {
//     const temp = await prisma.callRecordingTemp.findUnique({
//       where: { recordingSid: RecordingSid },
//     });

//     if (!temp) return res.sendStatus(200);

//     // Find the call session
//     const session = await prisma.callSession.findFirst({
//       where: { conferenceName: temp.conferenceName },
//       orderBy: { startTime: "desc" },
//     });

//     if (!session) return res.sendStatus(200);

//     // Save to your existing CallRecording model
//     await prisma.callRecording.create({
//       data: {
//         callId: session.id,
//         agentId: session.userId,
//         url: RecordingUrl + ".mp3",
//       },
//     });

//     // Optional: update session
//     await prisma.callSession.update({
//       where: { id: session.id },
//       data: {
//         recordingUrl: RecordingUrl + ".mp3",
//         recordingDuration: parseInt(RecordingDuration || "0"),
//       },
//     });

//     // Cleanup
//     await prisma.callRecordingTemp.delete({ where: { recordingSid: RecordingSid } });

//     res.sendStatus(200);
//   } catch (err: any) {
//     console.error("Recording callback error:", err);
//     res.sendStatus(500);
//   }
// };


