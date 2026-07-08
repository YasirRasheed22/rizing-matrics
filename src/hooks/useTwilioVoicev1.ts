// src/context/useCallEngine.ts
// @ts-nocheck

// naumanshan@gmail.com

import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import { Device, Call } from "@twilio/voice-sdk";
import { useAuth } from "../context/AuthContext";
import {io} from 'socket.io-client'
import { toast } from "react-hot-toast";
import { API_URL } from "../main";

export function useCallEngine() {
  const { user, token } = useAuth();
  const incomingRef = useRef<any>(null);
  const agentCallSidRef = useRef<string | null>(null);
  const isHangingUp = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const activeConnRef = useRef<Call | null>(null);
  const seenCallSids = useRef(new Set<string>()); // Prevents duplicate incoming calls
  const socketRef = useRef<any>(null);
  const messageSocket = useRef<any>(null);
  const [status, setStatus] = useState("READY");
  const [incoming, setIncoming] = useState<any>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [conferenceName, setConferenceName] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState([]);
  const [endWindowScreen, setEndWindowScreen] = useState(false);
  // Persistent caller details (shown in active call bar)
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferType, setTransferType] = useState("supervisor");
  const [transferAgent, setTransferAgent] = useState<any>(null);
  const [isSupervisedMode, setIsSupervisedMode] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [contacts, setContacts] = useState([])
  // New: Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSid, setRecordingSid] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  // New: Notes/Transcription state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [conversationLog, setConversationLog] = useState<{ speaker: 'agent' | 'customer'; text: string }[]>([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ name?: string; address?: string } | null>(null);
  const [missedCount, setMissedCount] = useState<number>(() => {
    return Number(localStorage.getItem(`missed_call_count_${user?.id}`) || 0);
  });
  const [messageCount, setMessageCount] = useState<number>(() => {
    return Number(localStorage.getItem(`message_count_${user?.id}`) || 0);
  });
  // ----------------------------------------------------------------------
  // TIMER
  // ----------------------------------------------------------------------
  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    number: string;
    reason?: string;
    blockedByThisAgent: boolean;
  } | null>(null);

  
  const incrementMissed = () => {
    setMissedCount((prev) => {
      
      const next = prev + 1;
      localStorage.setItem(`missed_call_count_${user?.id}`, String(next));
      return next;
    });
  };
  const incrementMessage = () => {
    if (window?.electronAPI?.notify) {
      window.electronAPI.notify(
        "New Message",
        `A new message received`
      );
   }
    setMessageCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(`message_count_${user?.id}`, String(next));
      return next;
    });
    
  };
  const resetMissed = () => {
    localStorage.removeItem(`missed_call_count_${user?.id}`);
    setMissedCount(0);
  };
  const resetMessage = () => {
    localStorage.removeItem(`message_count_${user?.id}`);
    setMessageCount(0);
  };
  const getCallSnapshot = () => ({
    status,
    incoming: incoming ? {  // sirf safe fields
      from: incoming.from,
      customerName: incoming.customerName,
      customerCallSid: incoming.customerCallSid,
      isTransfer: incoming.isTransfer,
      transferFrom: incoming.transferFrom,
    } : null,
    agentList,
    callSid,
    conferenceName,
    contacts,
  
    isOnHold,
    isMuted,
    isSupervisedMode,
    duration,
  
    transferOpen,
    transferType,
    transferAgent,
  
    customerName,
    customerNumber,
  
    isRecording,
    recordingUrl,
  
    isNotesOpen,
    conversationLog,
  
    isLeadModalOpen,
    contactInfo,
  
    blockModal,
  
    missedCount,
    messageCount,
  
    user: {
      agentPrivilege: user?.agentPrivilege,
    },
  });
  const emitCallState = useCallback((overrides = {}) => {
    window.electronAPI?.updateCallState({
      ...getCallSnapshot(),
      ...overrides,
    });
  }, [
    status,
    incoming,
    agentList,
    callSid,
    conferenceName,
    contacts,
    isOnHold,
    isMuted,
    isSupervisedMode,
    duration,
    transferOpen,
    transferType,
    transferAgent,
    customerName,
    customerNumber,
    isRecording,
    recordingUrl,
    isNotesOpen,
    conversationLog,
    isLeadModalOpen,
    contactInfo,
    blockModal,
    missedCount,
    messageCount,
    user,
  ]);
  

  
  // ── Socket connection ────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    messageSocket.current = io('https://api.rizingmatrics.com', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    return () => {
      messageSocket.current?.disconnect();
      messageSocket.current = null;
    };
  }, [token]);

  // ── Join/Leave user room ─────────────────────────────────────
  useEffect(() => {
    const socket = messageSocket.current;
    if (!socket || !user?.id) return;

    socket.emit('join-user-room', { userId: user && user.id });

    return () => {
      socket.emit('leave-user-room', { userId: user.id });
    };
  }, [user?.id]);
  useEffect(() => {
    if (status !== "ON_CALL") {
      clearInterval(timerRef.current);
      setDuration(0);
      return;
    }
  
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  
    return () => clearInterval(timerRef.current);
  }, [status]);

  
  const updateAgentStatus = async (status: string) => {
    try {
      await api.put("/auth/status/"+user?.id, { status });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };


  
  // ----------------------------------------------------------------------
  // INIT TWILIO DEVICE
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!user?.sipIdentity || !token) return;

    const init = async () => {
      if(user?.role === 'ADMIN' ) return;
      try {
        const { data } = await api.get(
          `/token/sip?identity=${user.sipIdentity}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const device = new Device(data.token, {
          // logLevel: 1,
          codecPreferences: ["opus", "pcmu"],
          enableRingingState: true,
          
         
        });

        deviceRef.current = device;

        device.on("registered", () => setStatus("READY"));
        device.on("unregistered", () => setStatus("OFFLINE"));
        device.on("error", (e) => console.error("TWILIO ERROR:", e));

        // ---- INCOMING CALL HANDLER ----
        device.on("incoming", async (conn) => {
          const to = conn.parameters?.To || "";
          const sid = conn.parameters.CallSid;
          
          if (to.startsWith("client:monitor-")) {
            conn.ignore();
            return;
          }
          

          // Ignore duplicate incoming for same call
          if (status !== "READY" ) {
            console.log(`Ignored unexpected incoming (status=${status}, sid=${conn.parameters.CallSid})`);
            conn.ignore();
            return;
          }
          if (seenCallSids.current.has(sid)) {
            conn.ignore();
            return;
          }
          seenCallSids.current.add(sid);
          const from = conn.parameters.From;
          setCustomerNumber(from);
          const caller = await api
            .get(`/contacts/lookup?number=${from}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: {} }));

          const conf = await api
            .get(`/voice/call/${sid}/conference`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: {} }));

          const name = caller.data?.callerName || "Unknown Caller";
          setCustomerName(name);
          const incomingObj = {
            conn,
            from,
            customerName: name,
            isTransfer: conf.data?.isTransfer,
            transferFrom: conf.data?.transferFrom,
            agentCallSid: sid,          // ← rename + clear
            customerCallSid: null,
          };
          incomingRef.current = incomingObj;
          setStatus("INCOMING");
        
          if (window?.electronAPI?.notify) {
            window.electronAPI.notify(
              "Incoming Call",
              `Incoming call from ${name || from}`
            );
            emitCallState({
              status: 'INCOMING',
              incoming:{
                from,
                customerName: name,
                isTransfer: conf.data?.isTransfer,
                transferFrom: conf.data?.transferFrom,
                agentCallSid: sid,          // ← rename + clear
                customerCallSid: null,
              }
            });
            window.electronAPI?.updateCallState({
              status: "INCOMING",
              customerName: name,
              customerNumber: from,
              incoming: {
                from,
                customerName: name,
                isTransfer: conf.data?.isTransfer,
                transferFrom: conf.data?.transferFrom,
                agentCallSid: sid,          // ← rename + clear
                customerCallSid: null,
              },  // explicit
            });
            setIncoming({
              conn,
              from,
              customerName: name,
              customerCallSid: sid,
              isTransfer: conf.data?.isTransfer,
              transferFrom: conf.data?.transferFrom,
          })
            window.electronAPI.openCallWindow();  
         }else{
            setIncoming({
              conn,
              from,
              customerName: name,
              customerCallSid: sid,
              isTransfer: conf.data?.isTransfer,
              transferFrom: conf.data?.transferFrom,
          })
         }
      
        
          conn.once("cancel", () => {
            seenCallSids.current.delete(sid);
            setIncoming(null);
            setStatus("READY");
          });
          conn.once("disconnect", () => {
            seenCallSids.current.delete(sid);
            setIncoming(null);
            setStatus("READY");

          });
        });

        await device.register();
      } catch (err) {
        console.error("TWILIO INIT FAILED:", err);
      }
    };

    const getAgentsList = async () => {
      try {
        const agents = await api.get('/auth/available');
        const filterCommes = agents.data.filter((item)=>item.phoneNumber !== null);
        
        setAgentList(filterCommes);
      } catch (error) {
        console.error('error', error.message);
      }
    };

    getAgentsList();
    init();
    if (!socketRef.current) {
      socketRef.current = io('https://api.rizingmatrics.com', {
        transports: ["websocket"],
        auth: { token },
      });
    }
   
    return () => {
      deviceRef.current?.destroy();
      seenCallSids.current.clear();
      // socketRef.current?.disconnect();
    };
  }, [user, token]);


  const fetchContactInfo = useCallback(async (number: string) => {
    if (!number) return;
    try {
      const { data } = await api.get(`/contacts/lookup?number=${number}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContactInfo({ name: data.callerName, address: data.address || '' });  // Assume API returns these
    } catch (err) {
      console.error("Failed to fetch contact:", err);
      setContactInfo(null);
    }
  }, [token]);
  // --------------------------------------------------
// SOCKET EVENT LISTENERS (STATE SAFE)
// --------------------------------------------------
useEffect(() => {
  const socket = socketRef.current;
  const sock = messageSocket.current;
  if (!socket) return;

  

  // 🔔 Incoming call ended BEFORE pickup
  const onIncomingEnded = async ({ callSid,type,number }) => {
    
    
    window?.electronAPI?.closeCallWindow();
    if(type == "missed"){
      incrementMissed();
      if (window?.electronAPI?.notify) {
        window.electronAPI.notify(
          "Missed Call",
          `Call from ${number ||"Unknown Caller"}`
        );
      }
    }

    try {
      // 1️⃣ Stop ringing connection if exists
      setIncoming((prev) => {
        if (prev?.conn) {
          try {
            prev.conn.ignore(); // stop ringtone
          } catch {}
        }
        return null;
      });

      // 2️⃣ HARD STOP — safety net
      deviceRef.current?.disconnectAll();

    } catch (err) {
      console.warn("incoming-ended cleanup failed:", err);
    }

    seenCallSids.current.delete(callSid);
    setStatus("READY");
    await updateAgentStatus("AVAILABLE");
  };

  // ✅ Call connected
  const onCallConnected = ({ conferenceName }) => {
    if (conferenceName) {
      
      setConferenceName(conferenceName);
    
    }
  };
  const stopMicrophone = async () => {
    try {
      // 🔴 Stop ALL active audio tracks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => {
        track.stop();
      });
  
      
    } catch (err) {
      console.warn("Mic already stopped or permission issue", err);
    }
  };
  // ❌ Call ended (customer OR agent)
  const onCallEnded = async ({ reason }) => {
    
    
  
    try {
      // 1️⃣ End Twilio connections
      if (activeConnRef.current) {
        activeConnRef.current.disconnect();
        activeConnRef.current = null;
      }
  
      // 2️⃣ Kill device connections
      deviceRef.current?.disconnectAll();
  
      // 3️⃣ HARD STOP MIC 🔥🔥🔥
      await stopMicrophone();
  
      // 4️⃣ Reset UI & state
      await updateAgentStatus("AVAILABLE");
      // openLeadIfValidCall();
      setEndWindowScreen(true);

      setIncoming(null);
      emitCallState({status: 'READY'})
      setStatus("READY");
      
      window?.electronAPI?.closeCallWindow(); 
      setConferenceName(null);
      setCallSid(null);
      setDuration(0);
      setCustomerName("");
      setCustomerNumber("");
      setIsNotesOpen(false);
      setConversationLog([]);
  
    } catch (err) {
      console.error("Error while ending call:", err);
    }
  };
  const onNewMessage = async ()=>{
    incrementMessage();

  }
  const newVoiceMail = async ({number})=>{
    if (window?.electronAPI?.notify) {
      window.electronAPI.notify(
        "New voicemail",
        `New voicemail is recieved from ${number ||"Unknown Caller"}`
      );
    }
  }

  sock.on("incoming-call-ended", onIncomingEnded);
  sock.on("call-connected", onCallConnected);
  sock.on("call-ended", onCallEnded);
  sock.on("voicemail-transcribed", ()=>console.log('New Voicemail recieved'));
  sock.on("new-voicemail", newVoiceMail);
  sock.on("new-message", onNewMessage);
  
  return () => {
    sock.off("incoming-call-ended", onIncomingEnded);
    sock.off("call-connected", onCallConnected);
    sock.off("call-ended", onCallEnded);
    sock.off("new-message", ()=>console.log('Maybeiam'));
  };
}, []);


  // ----------------------------------------------------------------------
  // ACCEPT INCOMING
  // ----------------------------------------------------------------------
  const acceptIncoming = useCallback(async () => {
    const incoming = incomingRef.current;
    
    if (!incoming) {
      console.warn("No incoming call in ref");
      return;
    }
  
    const { conn, customerCallSid: sid  , agentCallSid} = incoming;
    conn.removeAllListeners("cancel");
    await updateAgentStatus("ON_CALL");
    conn.accept();
    activeConnRef.current = conn;

    // Save caller info for active call bar
    setCustomerNumber(incoming.from);
    setCustomerName(incoming.customerName || "Unknown Caller");
    agentCallSidRef.current = agentCallSid || conn.parameters.CallSid; // safety
    setCallSid(sid ? sid: agentCallSid);

    const conf = await api.get(`/voice/call/${sid ? sid : agentCallSid}/conference`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setConferenceName(conf.data?.conferenceName);
    setIncoming(null);
    incomingRef.current = null; // ref bhi clear
    if (window?.electronAPI?.notify) {
      emitCallState({
        status: "ON_CALL",
        incoming: null,                 // force null
        customerName: incoming.customerName,
        customerNumber: incoming.from,
        duration: 0,
        isMuted: false,
        isOnHold: false,
        conferenceName: conf.data?.conferenceName,
        callSid: sid ? sid : agentCallSid,
        isTransfer: null,               // extra cleanup
        transferFrom: null,
      });
    }else{
      setStatus("ON_CALL");
    }
    // syncCallState({ status: "ON_CALL" });
    conn.on("disconnect", async () => {
      seenCallSids.current.delete(sid);
      setStatus("READY");
      emitCallState({ status: "READY" });
      await updateAgentStatus("AVAILABLE")
      activeConnRef.current = null;
      setDuration(0);
    });
    conn.on("error", async () => {
      seenCallSids.current.delete(sid);
      setStatus("READY");
      await updateAgentStatus("AVAILABLE")
      activeConnRef.current = null;
    });
  }, [incoming, token]);
  const openLeadIfValidCall = useCallback(() => {
    console.log('duration'+duration)
    // ❌ Missed / zero duration calls ignore
    if (duration <= 0) return;
  
    // ❌ Agar already open hai to dobara mat kholo
    if (isLeadModalOpen) return;
  
    // ✅ Actual data ke sath modal open
    setIsLeadModalOpen(true);
  }, [duration, isLeadModalOpen]);
  // ----------------------------------------------------------------------
  // REJECT INCOMING
  // ----------------------------------------------------------------------
  const rejectIncoming = useCallback(async () => {
    const incoming = incomingRef.current;
    console.log(incoming.agentCallSid)
    if (!incoming) {
     return;};
   
    incoming.conn.reject();
    
    seenCallSids.current.delete(incoming.customerCallSid  || incoming?.agentCallSid);
    setIncoming(null);
    setStatus("READY");
    emitCallState({status: 'READY'})
    await updateAgentStatus("AVAILABLE")
    if (incoming?.customerCallSid || incoming?.agentCallSid) {
      await api.post("/voice/decline", {
        customerCallSid: incoming.customerCallSid || incoming?.agentCallSid,
        agentName: user?.name,
        agentId:user?.id
      });
    }
    // incoming?.conn.reject();
    seenCallSids.current.delete(incoming.customerCallSid || incoming?.agentCallSid);
    setIncoming(null);
    setStatus("READY");
    emitCallState({status: 'READY'})
    window?.electronAPI?.closeCallWindow();
    await updateAgentStatus("AVAILABLE")
  }, [incoming, user]);
  // ----------------------------------------------------------------------
  // OUTGOING CALL
  // ----------------------------------------------------------------------
  const startCall = useCallback(
    async (e164) => {
      try {
        const device = deviceRef.current;
        if (!device) return;

        // ✅ V2 FLOW: Step 1 - Prepare outbound call (get conference)
        const { data: prepareData } = await api.post(
          "/voice/outbound-v2",
          { To: e164 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        window.electronAPI?.openCallWindow();

        const conferenceFriendlyName = prepareData.conferenceFriendlyName;
        const sessionId = prepareData.sessionId;

        // ✅ 2️⃣ SET DIALING STATE (ActiveCallBar dikhe)
        setStatus("DIALING");
        setCustomerNumber(e164);
        setCustomerName("Calling...");

        emitCallState({
          status: "DIALING",
          customerNumber: e164,
          customerName: "Calling...",
          duration: 0,
          isMuted: false,
          isOnHold: false,
        });

        // ✅ V2 FLOW: Step 2 - Connect agent to conference
        const conn = await device.connect({
          params: {
            To: e164,
            identity: user.sipIdentity,
            conference: conferenceFriendlyName,
          },
        });

        activeConnRef.current = conn;

        // ✅ 3️⃣ CALL ACCEPTED → ON_CALL
        conn.on("accept", async () => {
          setStatus("ON_CALL");
          await updateAgentStatus("ON_CALL");

          setConferenceName(conferenceFriendlyName);
          agentCallSidRef.current = conn.parameters.CallSid;
          setCallSid(conn.parameters.CallSid);

          emitCallState({
            status: "ON_CALL",
            customerNumber: e164,
            customerName,
            transferOpen:false,
          });

          // ✅ V2 FLOW: Step 3 - Dial customer via COMMIO/BYOC
          try {
            await api.post(
              "/voice/outbound-v2/dial-customer",
              { conferenceFriendlyName },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("✅ Customer dialed via V2");
          } catch (dialErr) {
            console.error("Failed to dial customer:", dialErr);
          }
        });

        // ✅ 4️⃣ CALL ENDED
        conn.on("disconnect", async () => {
          setStatus("READY");
          emitCallState({ status: "READY" });

          activeConnRef.current = null;
          setDuration(0);
          await updateAgentStatus("AVAILABLE");

          window.electronAPI?.closeCallWindow();
        });

      } catch (error) {
        console.error(error);
        toast.error(error.response.data.message || "Could not place call");
      }
    },
    [user, token, emitCallState]
  );
  // ----------------------------------------------------------------------
  // HANGUP
  // ----------------------------------------------------------------------
  const hangup = useCallback(async () => {
    if (isHangingUp.current || !conferenceName || !callSid) {
      console.log("Hangup skipped: already hanging or missing data");
      return;
    }
  
    isHangingUp.current = true;
    try {
      await api.post(
        "/voice/hangup-all",
        { conferenceFriendlyName: conferenceName, agentCallSid: callSid },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await updateAgentStatus("AVAILABLE");
  
      // Recording/notes cleanup (existing)
  
      activeConnRef.current?.disconnect();
      activeConnRef.current = null;
      window?.electronAPI?.closeCallWindow();
      setEndWindowScreen(true)
      if (callSid) seenCallSids.current.delete(callSid);
  
      setStatus("READY");
      setConferenceName(null);
      setCallSid(null);
      setIncoming(null);
      setDuration(0);
      setCustomerName("");
      setCustomerNumber("");
      setIsNotesOpen(false);
      setConversationLog([]);
      emitCallState({ status: "READY" });
      window.electronAPI?.updateCallState({ status: "READY" });
      
    } catch (err) {
      console.error("Hangup failed:", err);
    } finally {
      isHangingUp.current = false;
    }
  }, [conferenceName, callSid, token, isRecording, recordingSid, isNotesOpen, conversationLog, customerNumber, emitCallState]);
  // ----------------------------------------------------------------------
  // HOLD
  // ----------------------------------------------------------------------
  const toggleHold = useCallback(async () => {
    
    const next = !isOnHold;
    console.log(`Toggle hold: ${next ? 'hold' : 'unhold'}, participantCallSid: ${callSid}, conference: ${conferenceName}`);
    if (!conferenceName || !callSid) return


    await api.post(
      "/voice/hold",
      {
        conferenceFriendlyName: conferenceName,
        participantCallSid:callSid,
        hold: next,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setIsOnHold(next);
    emitCallState({ isOnHold: next });
  }, [conferenceName, callSid, isOnHold, token]);
  // ----------------------------------------------------------------------
  // TRANSFER
  // ----------------------------------------------------------------------
  const executeTransfer = useCallback(async (payload) => {
    if (!conferenceName || !callSid) return;
  
    try {
      // ==============================
      // 1️⃣ AGENT → AGENT TRANSFER
      // ==============================
      if (payload.mode === "agent") {
        const targetName = payload.target.name
        await api.post(
          "/voice/supervised-transfer",
          {
            conferenceFriendlyName: conferenceName,
            targetIdentity: payload.target, // full agent object
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        setIsSupervisedMode(true);
        emitCallState({
          isTransferring: false,
          transferStatus: "SUCCESS",
          transferredTo:targetName
        });
      }

  
      // ==============================
      // 2️⃣ AGENT → CONTACT / DIALPAD
      // ==============================
      if (payload.mode === "contact" || payload.mode === "dialpad") {
        const targetName = payload.number
        await api.post(
          "/voice/supervised-transfer-external",
          {
            conferenceFriendlyName: conferenceName,
            phoneNumber: payload.number,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        emitCallState({
          isTransferring: false,
          transferStatus: "SUCCESS",
          transferredTo:targetName
        });
        setIsSupervisedMode(true);
      }
    
    } catch (err) {
      console.error("Transfer failed", err);
      alert("Transfer failed");
    } finally {
      setTransferOpen(false);
      setTransferAgent(null);
    }
  }, [conferenceName, callSid, token]);
  useEffect(() => {
    
    if (!user?.id) return;
    // if (document.hidden && window?.electronAPI?.notify) {
    // }
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        path: "/socket.io",
        transports: ["websocket"], // polling ❌ hatao
        auth: { token },
      });
      socketRef.current.emit("join-user-room", { userId: user && user.id });
    }

    const onNewLog = (newLog) => {
      if (newLog.agent_id !== user.id) return;

      setCallLogs((prev) => {
        if (prev.some((l) => l.sessionId === newLog.sessionId)) return prev;
        return [newLog, ...prev];
      });
    };

    socketRef.current.on("onCallLogsUpdates", onNewLog);

    // ✅ Listen for outbound call contact info
    const onOutboundCallPrepared = (data: any) => {
      if (data?.contactName) {
        setCustomerName(data.contactName);
        console.log("✅ Contact name received:", data.contactName);
      }
    };
    socketRef.current.on("outbound-call-prepared", onOutboundCallPrepared);

    return () => {
      socketRef.current.off("onCallLogsUpdates", onNewLog);
      socketRef.current.off("outbound-call-prepared", onOutboundCallPrepared);
    };
  }, [user?.id, token]);
  // New: Toggle Recording (assumes backend handles Twilio conference recording)
  const toggleRecord = useCallback(async () => {
    if (!conferenceName) return;

    const next = !isRecording;

    try {
      if (next) {
        // Start recording
        const { data } = await api.post(
          "/voice/record/start",
          { conferenceFriendlyName: conferenceName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordingSid(data.recordingSid);
      } else {
        // Stop recording
        const { data } = await api.post(
          "/voice/record/stop",
          { recordingSid, conferenceFriendlyName: conferenceName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordingUrl(data.url);
        if (data.url) {
          window.open(data.url, '_blank');
        }
        setRecordingSid(null);
      }
      setIsRecording(next);
    } catch (error) {
      console.error("Recording operation failed:", error);
      alert("Failed to toggle recording. Please try again.");
    }
  }, [isRecording, conferenceName, recordingSid, token]);

  // New: Toggle Notes (opens notes UI, starts transcription if implemented)
 const toggleNotes = useCallback(async () => {
  const open = !isNotesOpen;
  setIsNotesOpen(open);

  const socket = socketRef.current;
  if (!socket || !conferenceName) return;

  // ---------------------------
  // CLOSE NOTES
  // ---------------------------
  if (!open) {
    socket.emit("leave-transcript", { conferenceName });
    socket.off("transcript");
    return;
  }

  // ---------------------------
  // OPEN NOTES
  // ---------------------------
  setConversationLog([]); // reset for new call

  socket.emit("join-transcript", { conferenceName });

  socket.on("transcript", (msg) => {
    setConversationLog((prev) => {
      // Live typing effect
      const last = prev[prev.length - 1];

      // Same speaker + partial → update last line
      if (
        last &&
        last.speaker === msg.speaker &&
        msg.type === "partial"
      ) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: msg.text,
        };
        return updated;
      }

      // New sentence
      return [
        ...prev,
        { speaker: msg.speaker, text: msg.text },
      ];
    });
  });
}, [isNotesOpen, conferenceName]);

  // New: Function to add manual note (fallback if auto STT not implemented)
  const addNote = useCallback((speaker: 'agent' | 'customer', text: string) => {
    setConversationLog(prev => [...prev, { speaker, text }]);
  }, []);
  const fetchContacts = async () => {
    try {
      const res = await api.get("/contacts");
      
      setContacts(res.data.data);
      // setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(()=>{
    if(token) fetchContacts();
  },[1])
  // src/context/useCallEngine.ts (hook ke andar, states ke neeche)

// Helper to set + emit (reusable for all UI states)
const setAndEmit = useCallback((updates: Partial<ReturnType<typeof getCallSnapshot>>) => {
  // Update states individually (kyunki multiple setters ek saath call kar sakte ho)
  if ('transferOpen' in updates) setTransferOpen(updates.transferOpen);
  if ('transferType' in updates) setTransferType(updates.transferType);
  if ('transferAgent' in updates) setTransferAgent(updates.transferAgent);
  if ('isLeadModalOpen' in updates) setIsLeadModalOpen(updates.isLeadModalOpen);
  if ('isNotesOpen' in updates) setIsNotesOpen(updates.isNotesOpen);
  // Add more as needed: isOnHold, isMuted, etc. (but woh already toggle functions mein emit kar rahe)

  // Emit full snapshot + overrides
  emitCallState(updates);
}, [emitCallState]);
const openTransferModal = (type: 'warm' | 'cold' | 'supervisor' = 'supervisor') => {
  if (!activeConnRef.current) {  // ← Yeh sahi ref use karo
    console.warn("No active call to transfer");
    return;
  }

  setTransferType('supervisor');
  setTransferOpen(true);

  // Immediately sync to CallWindow
  emitCallState({
    transferOpen: true,
    transferType: type,
    agentList,          // ensure list bhi jaaye
    transferAgent,
  });
};
const closeTransferModal = () => {
  setTransferOpen(false);
  setTransferType(null);
  setTransferAgent(null);

  emitCallState({
    transferOpen: false,
    transferType: null,
    transferAgent: null,
  });
};
const setTransferAgentFn = (agent: any) => {
  setTransferAgent(agent);
  emitCallState({ transferAgent: agent });
};

const toggleMute = useCallback(() => {
  if (!activeConnRef.current) {
    console.warn("No active conn for mute");
    return;
  }
  const next = !isMuted;
  console.log(`Muting inbound/outbound: ${next ? 'mute' : 'unmute'}, conn sid: ${activeConnRef.current.parameters?.CallSid}`);
  activeConnRef.current.mute(next);
  setIsMuted(next);
  emitCallState({ isMuted: next });
}, [isMuted, emitCallState]);

useEffect(() => {
  if (!window.electronAPI) return;

  // Preload se onCallAction unsubscribe return karta hai
  const unsubscribe = window.electronAPI.onCallAction(({ type, payload }) => {
    console.log("Electron Call Action received:", type, payload); // debug ke liye

    switch (type) {
      case "ACCEPT":
        acceptIncoming();
        break;
      case "REJECT":
        rejectIncoming();
        break;
      case "MUTE":
        toggleMute();  // ← new function call
        break;
      case "HOLD":
        toggleHold();
        break;
      case "HANGUP":
        hangup();
        break;
      case "NOTES":
        toggleNotes();
        break;
      case "TRANSFER":
        openTransferModal();  // default 'supervisor'
        break;
      case "CLOSE_TRANSFER":
        closeTransferModal();
        break;
      case "SET_TRANSFER_AGENT":
        setTransferAgent(payload);
        emitCallState({ transferAgent: payload }); // immediate sync
        break;
      case "EXECUTE_TRANSFER":
        emitCallState({
          isTransferring: true,
          transferTarget: payload,
          transferStatus: "INITIATED"
        });
        executeTransfer(payload);
        
        break;
      case "LEAD":
        setIsLeadModalOpen((prev) => !prev);
        emitCallState({ isLeadModalOpen: !isLeadModalOpen });
        break;
      case "FETCH_CONTACT":
        fetchContactInfo(customerNumber);
        break;
      case "UNBLOCK":
        // unblockNumber(payload);
        async (number: string) => {
          await api.post(`/voice/unblock-number`,{number:payload?.number}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Success hone par modal close + call start kar sakte ho
        }
        
        break;
      default:
        console.log("Unhandled Electron action:", type);
    }
  });

  return () => {
    unsubscribe?.();  // safe cleanup
  };
}, [
  // Deps: sab actions jo use ho rahe hain (useCallback se stable)
  acceptIncoming,
  rejectIncoming,
  toggleMute,          // new
  toggleHold,
  hangup,
  toggleNotes,
  openTransferModal,
  closeTransferModal,
  executeTransfer,
  fetchContactInfo,
  customerNumber,
  isLeadModalOpen,
  emitCallState,
]);
  useEffect(() => {
    if (window.electronAPI) {
      // Yeh full state bhej do har update pe
      window.electronAPI.updateCallState(getCallSnapshot());
    }
  }, [
    status,
   incoming,
    callSid,
    conferenceName,
    customerName,
    customerNumber,
    duration,
    isOnHold,
    isMuted,
    isRecording,
    isSupervisedMode,
    transferOpen,
    transferType,
    transferAgent,
    agentList?.length,      // array length change pe trigger
    contacts?.length,       // same
    isNotesOpen,
    isLeadModalOpen,
  blockModal,
  ]);
  

  return {
    // state
    endWindowScreen,
    callLogs,
    toggleMute,
    status,
    openTransferModal,
    closeTransferModal,
    incoming,
    agentList,
    callSid,
    conferenceName,
    activeConn: activeConnRef,
    contacts: contacts.length == 0 ? [] : contacts,
    isOnHold,
    isMuted,
    isSupervisedMode,
    duration,
    setTransferAgentFn: setTransferAgentFn,
    transferOpen,
    transferType,
    transferAgent,

    customerName,
    customerNumber,

    // New states
    isRecording,
    recordingUrl,
    isNotesOpen,
    conversationLog,
    isLeadModalOpen,
    toggleLeadModal: () => setIsLeadModalOpen((prev) => !prev),
    fetchContactInfo,
    contactInfo,

    // actions
    acceptIncoming,
    rejectIncoming,
    startCall,
    hangup,
    toggleHold,
    executeTransfer,

    setTransferOpen,
    setTransferType,
    setTransferAgent,
    setIsSupervisedMode,

    // New actions
    toggleRecord,
    toggleNotes,
    addNote,  // For manual notes; use in UI
    updateAgentStatus,
    blockModal,
    setBlockModal,
  closeBlockModal: () => setBlockModal(null),
  missedCount,
  resetMissed,
  messageCount,
  resetMessage,
  // Unblock function (agar nahi bana to yahan define kar do)
  unblockNumber: async (number: string) => {
    await api.post(`/voice/unblock-number`,{number:number}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Success hone par modal close + call start kar sakte ho
  },
  onEndPopClose : ()=>{
    setEndWindowScreen(!endWindowScreen)
    setCallLogs([])
  },
  onAfterSaveEndPopClose : ()=>{
    setEndWindowScreen(!endWindowScreen)
    setCallLogs([])
  }
  };
}