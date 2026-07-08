//@ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { io, Socket } from "socket.io-client";
import api from "../api";
import { useAuth } from "../context/AuthContext";

type CallStatus = "READY" | "INCOMING" | "DIALING" | "ON_CALL" | "OFFLINE";

type IncomingCallState = null | {
  from: string;
  customerName: string;
  callSid: string;
  isTransfer?: boolean;
  transferFrom?: string;
  conn: Call;
};

const API_URL = "https://api.rizingmatrics.com";

export function useTwilioDevice({ disabled = false }: { disabled?: boolean } = {}) {
  const { user, token } = useAuth();

  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const incomingCallRef = useRef<IncomingCallState>(null);
  const timerRef = useRef<number | null>(null);
  const seenIncomingCallSidRef = useRef<Set<string>>(new Set());
  const statusRef = useRef<CallStatus>("OFFLINE");
  const socketRef = useRef<Socket | null>(null);
  const messageSocketRef = useRef<Socket | null>(null);
  // Live mirrors of call identifiers so long-lived socket handlers (registered
  // once) always read the CURRENT value instead of a stale closure capture.
  const conferenceNameRef = useRef<string | null>(null);
  const callSidRef = useRef<string | null>(null);

  const [agentList, setAgentList] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [status, setStatus] = useState<CallStatus>("OFFLINE");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [conferenceName, setConferenceName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [contactInfo, setContactInfo] = useState<{ name?: string; address?: string } | null>(null);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [endWindowScreen, setEndWindowScreen] = useState(false);

  const [missedCount, setMissedCount] = useState<number>(() => {
    return Number(localStorage.getItem(`missed_call_count_${user?.id}`) || 0);
  });

  const [messageCount, setMessageCount] = useState<number>(() => {
    return Number(localStorage.getItem(`message_count_${user?.id}`) || 0);
  });

  const [incoming, setIncoming] = useState<IncomingCallState>(null);

  // Keep refs in sync so socket handlers see the live conference/call ids.
  useEffect(() => { conferenceNameRef.current = conferenceName; }, [conferenceName]);
  useEffect(() => { callSidRef.current = callSid; }, [callSid]);

  const safeSetStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Close the standalone Electron call window immediately. We call this on
  // every terminal call event (local SDK disconnect/cancel/error, agent
  // hangup, agent decline) so the window never waits on the backend "call-ended"
  // webhook (which can lag 10-12s) or a UI grace timer to disappear.
  const closeCallWindowNow = useCallback(() => {
    try { window?.electronAPI?.closeCallWindow?.(); } catch {}
  }, []);

  const resetCallViewState = useCallback(() => {
    clearTimer();
    setIncoming(null);
    incomingCallRef.current = null;
    setConferenceName(null);
    setCallSid(null);
    setDuration(0);
    setCustomerName("");
    setCustomerNumber("");
    setContactInfo(null);
    setIsMuted(false);
    setIsOnHold(false);
  }, [clearTimer]);

  const updateAgentStatus = useCallback(
    async (nextStatus: string) => {
      if (!user?.id) return;
      try {
        await api.put(`/auth/status/${user.id}`, { status: nextStatus });
      } catch (err) {
        console.error("Failed to update agent status:", err);
      }
    },
    [user?.id]
  );

  const incrementMissed = useCallback(() => {
    setMissedCount((prev) => {
      const next = prev + 1;
      if (user?.id) localStorage.setItem(`missed_call_count_${user.id}`, String(next));
      return next;
    });
  }, [user?.id]);

  const incrementMessage = useCallback(() => {
    if (window?.electronAPI?.notify) {
      window.electronAPI.notify("New Message", "A new message received");
    }
    setMessageCount((prev) => {
      const next = prev + 1;
      if (user?.id) localStorage.setItem(`message_count_${user.id}`, String(next));
      return next;
    });
  }, [user?.id]);

  const resetMissed = useCallback(() => {
    if (user?.id) localStorage.removeItem(`missed_call_count_${user.id}`);
    setMissedCount(0);
  }, [user?.id]);

  const resetMessage = useCallback(() => {
    if (user?.id) localStorage.removeItem(`message_count_${user.id}`);
    setMessageCount(0);
  }, [user?.id]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get("/contacts");
      setContacts(res.data?.data || []);
    } catch (err) {
      console.error("fetchContacts error:", err);
    }
  }, []);

  const getAgentsList = useCallback(async () => {
    try {
      const agents = await api.get("/auth/available-for-transfer");
      const filtered = (agents.data.agents || []).filter((item: any) => item.phoneNumber !== null);
      
      setAgentList(filtered);
    } catch (error: any) {
      console.error("getAgentsList error:", error?.message || error);
    }
  }, []);

  const fetchContactInfo = useCallback(
    async (number?: string) => {
      if (!number || !token) return;
      try {
        const { data } = await api.get(`/contacts/lookup?number=${number}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContactInfo({ name: data?.callerName, address: data?.address || "" });
      } catch (err) {
        console.error("Failed to fetch contact:", err);
        setContactInfo(null);
      }
    },
    [token]
  );

  // ─────────────────────────────────────────────────────────
  // NEW: sendDTMF — sends a DTMF tone on the active call
  // Twilio Voice SDK Call.sendDigits() accepts: 0-9, *, #, w (pause)
  // ─────────────────────────────────────────────────────────
  const sendDTMF = useCallback((digit: string) => {
    const call = activeCallRef.current;
    
    if (!call) {
      console.warn("sendDTMF: no active call");
      return;
    }
    const validChars = /^[0-9*#w]+$/;
    if (!validChars.test(digit)) {
      console.warn("sendDTMF: invalid digit", digit);
      return;
    }
    try {
      call.sendDigits(digit);
    } catch (err) {
      console.error("sendDTMF failed:", err);
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    if (!token) return;
    fetchContacts();
    getAgentsList();
  }, [disabled, token, fetchContacts, getAgentsList]);

  useEffect(() => {
    if (disabled) return;
    if (status !== "ON_CALL") {
      clearTimer();
      setDuration(0);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => { clearTimer(); };
  }, [disabled, status, clearTimer]);

  useEffect(() => {
    if (disabled) return;
    if (!token || !user?.id) return;

    const messageSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    messageSocketRef.current = messageSocket;
    messageSocket.emit("join-user-room", { userId: user.id });

    return () => {
      messageSocket.emit("leave-user-room", { userId: user.id });
      messageSocket.disconnect();
      messageSocketRef.current = null;
    };
  }, [disabled, token, user?.id]);

  useEffect(() => {
    if (disabled) return;
    if (!user?.id || !token) return;

    const mainSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = mainSocket;
    mainSocket.emit("join-user-room", { userId: user.id });

    const onNewLog = (newLog: any) => {
      console.log(newLog)
      if (newLog.agent_id !== user?.id) return;
      setCallLogs((prev) => {
        if (prev.some((l) => l.sessionId === newLog.sessionId)) return prev;
        return [newLog, ...prev];
      });
    };

    mainSocket.on("onCallLogsUpdates", onNewLog);

    // ✅ Listen for outbound call contact info
    const onOutboundCallPrepared = (data: any) => {
      if (data?.contactName) {
        setCustomerName(data.contactName);
        console.log("✅ Contact name received:", data.contactName);
      }
    };
    mainSocket.on("outbound-call-prepared", onOutboundCallPrepared);

    // ✅ Listen for real-time call status updates (INITIATED, RINGING, ANSWERED, COMPLETED)
    const onCallStatusUpdate = (data: any) => {
      // ✅ SECURITY: Verify agentId matches current user
      if (data.agentId && data.agentId !== user?.id) {
        console.warn(`❌ Received call-status-update for wrong agent. Expected: ${user?.id}, Got: ${data.agentId}`);
        return false;
      }

      console.log("📊 [REAL-TIME] Call status update:", {
        callSid: data.callSid,
        status: data.status,
        duration: data.duration,
        agentId: data.agentId,
      });

      // Update UI based on status
      if (data.status === "initiated") {
        console.log("📞 Call initiated - dialing...");
        safeSetStatus("DIALING");
      } else if (data.status === "answered" || data.status === "in-progress") {
        console.log("✅ Call answered - updating UI");
        safeSetStatus("ON_CALL");
      } else if (data.status === "completed" || data.status === "no-answer") {
        console.log("📞 Call ended - closing window");
        window?.electronAPI?.closeCallWindow?.();
        setEndWindowScreen(true);
      }
    };
    messageSocketRef.current.on("call-status-update", onCallStatusUpdate);

    // ✅ Listen for customer answered event (faster than status-update)
    const onCallCustomerAnswered = (data: any) => {
      console.log("✅ [REAL-TIME] Customer answered:", {
        callSid: data.callSid,
        duration: data.duration,
      });
      safeSetStatus("ON_CALL");
    };
    mainSocket.on("call-customer-answered", onCallCustomerAnswered);

    // ✅ Listen for ringing event (phone is ringing)
    const onCallRinging = (data: any) => {
      console.log("📞 [REAL-TIME] Customer phone ringing:", {
        callSid: data.callSid,
        status: data.status,
      });
      // Frontend keeps showing DIALING status during ringing
      // Don't change to ON_CALL yet
    };
    mainSocket.on("call-ringing", onCallRinging);

    return () => {
      mainSocket.off("onCallLogsUpdates", onNewLog);
      mainSocket.off("outbound-call-prepared", onOutboundCallPrepared);
      mainSocket.off("call-status-update", onCallStatusUpdate);
      mainSocket.off("call-customer-answered", onCallCustomerAnswered);
      mainSocket.off("call-ringing", onCallRinging);
      mainSocket.disconnect();
      socketRef.current = null;
    };
  }, [disabled, user?.id, token]);

  useEffect(() => {
    if (disabled) return;

    const messageSocket = messageSocketRef.current;
    if (!messageSocket) return;

    const onIncomingEnded = async ({
      callSid: endedCallSid,
      type,
      number,
    }: { callSid?: string; type?: string; number?: string }) => {
      window?.electronAPI?.closeCallWindow?.();

      if (type === "missed") {
        incrementMissed();
        if (window?.electronAPI?.notify) {
          window.electronAPI.notify("Missed Call", `Call from ${number || "Unknown Caller"}`);
        }
      }

      try {
        setIncoming((prev) => {
          if (prev?.conn) { try { prev.conn.ignore(); } catch {} }
          return null;
        });
        incomingCallRef.current = null;
        deviceRef.current?.disconnectAll();
      } catch (err) {
        console.warn("Incoming-ended cleanup failed:", err);
      }

      if (endedCallSid) seenIncomingCallSidRef.current.delete(endedCallSid);

      resetCallViewState();
      safeSetStatus("READY");
      await updateAgentStatus("AVAILABLE");
    };

    const onCallConnected = ({ conferenceName }: { conferenceName?: string }) => {
      if (conferenceName) setConferenceName(conferenceName);
    };

    const onCallEnded = async (data: any) => {
      console.log("onCallEnded event received:", data)
      // Ignore only events that clearly belong to a DIFFERENT conference than
      // the one this agent is currently on. Read the live value via ref —
      // this handler is registered once, so a captured `conferenceName` would
      // be stale and could wrongly bail out on the agent's own call, leaving
      // the call window frozen open when the customer hangs up.
      const myConf = conferenceNameRef.current;
      const evtConf = data?.conferenceFriendlyName;
      if (evtConf && myConf && evtConf !== myConf) {
        return;
      }

      try { activeCallRef.current?.disconnect(); } catch {}

      activeCallRef.current = null;
      resetCallViewState();
      safeSetStatus("READY");
      window?.electronAPI?.closeCallWindow?.();
      setEndWindowScreen(true);
      await updateAgentStatus("AVAILABLE");
    };

    const onNewMessage = async () => { incrementMessage(); };

    const onNewVoicemail = async ({ number }: { number?: string }) => {
      if (window?.electronAPI?.notify) {
        window.electronAPI.notify(
          "New voicemail",
          `New voicemail received from ${number || "Unknown Caller"}`
        );
      }
    };

    messageSocket.on("incoming-call-ended", onIncomingEnded);
    messageSocket.on("call-connected", onCallConnected);
    messageSocket.on("call-ended", onCallEnded);
    messageSocket.on("new-message", onNewMessage);
    messageSocket.on("new-voicemail", onNewVoicemail);

    return () => {
      messageSocket.off("incoming-call-ended", onIncomingEnded);
      messageSocket.off("call-connected", onCallConnected);
      messageSocket.off("call-ended", onCallEnded);
      messageSocket.off("new-message", onNewMessage);
      messageSocket.off("new-voicemail", onNewVoicemail);
    };
  }, [
    disabled,
    incrementMissed,
    incrementMessage,
    resetCallViewState,
    safeSetStatus,
    updateAgentStatus,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (!token || !user?.sipIdentity || user?.role === "ADMIN") return;

    let mounted = true;

    const init = async () => {
      try {
        const { data } = await api.get(`/token/sip?identity=${user.sipIdentity}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const device = new Device(data.token, {
          codecPreferences: ["opus", "pcmu"] as unknown as Device.Options["codecPreferences"],
          // @ts-ignore
          enableRingingState: true,
        });

        deviceRef.current = device;

        device.on("registered",   () => { if (!mounted) return; safeSetStatus("READY"); });
        device.on("unregistered", () => { if (!mounted) return; safeSetStatus("OFFLINE"); });
        device.on("error",        (error) => { console.error("Twilio Device Error:", error); });

        device.on("incoming", async (conn: Call) => {
          const sid  = (conn.parameters as any)?.CallSid;
          const from = (conn.parameters as any)?.From;
          const to   = (conn.parameters as any)?.To || "";

          if (to.startsWith("client:monitor-")) { conn.ignore(); return; }
          if (!sid || seenIncomingCallSidRef.current.has(sid)) { try { conn.ignore(); } catch {} return; }
          if (statusRef.current !== "READY") { try { conn.ignore(); } catch {} return; }

          seenIncomingCallSidRef.current.add(sid);

          let displayName = "Unknown Caller";
          let transferInfo: { isTransfer?: boolean; transferFrom?: string } = {};

          try {
            const caller = await api.get(`/contacts/lookup?number=${from}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            displayName = caller.data?.callerName || "Unknown Caller";
          } catch (err) {
            console.warn("Caller lookup failed:", err);
          }

          try {
            const conf = await api.get(`/voice/call/${sid}/conference`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            transferInfo = {
              isTransfer: conf.data?.isTransfer,
              transferFrom: conf.data?.transferFrom,
            };
          } catch {}

          const incomingPayload: IncomingCallState = {
            from, customerName: displayName, callSid: sid, conn, ...transferInfo,
          };

          incomingCallRef.current = incomingPayload;
          setIncoming(incomingPayload);
          setCustomerName(displayName);
          setCustomerNumber(from);
          setContactInfo(null);
          safeSetStatus("INCOMING");

          if (window?.electronAPI?.notify) {
            window.electronAPI.notify("Incoming Call", `Incoming call from ${displayName || from}`);
          }

          conn.once("cancel", async () => {
            seenIncomingCallSidRef.current.delete(sid);
            resetCallViewState();
            safeSetStatus("READY");
            closeCallWindowNow();
            await updateAgentStatus("AVAILABLE");
          });

          conn.once("disconnect", async () => {
            seenIncomingCallSidRef.current.delete(sid);
            resetCallViewState();
            safeSetStatus("READY");
            closeCallWindowNow();
            await updateAgentStatus("AVAILABLE");
          });
        });

        await device.register();
      } catch (err) {
        console.error("Twilio init failed:", err);
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimer();
      try { deviceRef.current?.destroy(); } catch {}
      deviceRef.current = null;
      activeCallRef.current = null;
      incomingCallRef.current = null;
      seenIncomingCallSidRef.current.clear();
    };
  }, [
    disabled, token, user?.sipIdentity, user?.role,
    clearTimer, resetCallViewState, safeSetStatus, updateAgentStatus,
  ]);

  const acceptIncoming = useCallback(async () => {
    const payload = incomingCallRef.current;
    if (!payload) return;

    try {
      await updateAgentStatus("ON_CALL");
      payload.conn.accept();
      activeCallRef.current = payload.conn;

      setCallSid(payload.callSid);
      setCustomerName(payload.customerName || "Unknown Caller");
      setCustomerNumber(payload.from);
      setIncoming(null);
      incomingCallRef.current = null;
      safeSetStatus("ON_CALL");

      try {
        const conference = await api.get(`/voice/call/${payload.callSid}/conference`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConferenceName(conference.data?.conferenceName || null);
      } catch (confErr) {
        console.error("Failed to fetch inbound conference:", confErr);
        setConferenceName(null);
      }

      // Customer hangs up an inbound call → conference ends → this agent leg
      // disconnects. Close the window right here so it never relies on the
      // (possibly missing) backend "call-ended" webhook. This is the fix for
      // the "call window never closes after customer hangs up" bug.
      payload.conn.on("disconnect", async () => {
        activeCallRef.current = null;
        resetCallViewState();
        safeSetStatus("READY");
        closeCallWindowNow();
        await updateAgentStatus("AVAILABLE");
      });

      payload.conn.on("error", async (err) => {
        console.error("Inbound accepted call error:", err);
        activeCallRef.current = null;
        resetCallViewState();
        safeSetStatus("READY");
        closeCallWindowNow();
        await updateAgentStatus("AVAILABLE");
      });
    } catch (err) {
      console.error("acceptIncoming failed:", err);
    }
  }, [token, resetCallViewState, safeSetStatus, updateAgentStatus]);

  const rejectIncoming = useCallback(async () => {
    const payload = incomingCallRef.current;
    if (!payload) return;

    try {
      payload.conn.reject();
      await api.post(
        "/voice/decline",
        { customerCallSid: payload.callSid, agentId: user?.id, agentName: user?.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("rejectIncoming failed:", err);
    } finally {
      seenIncomingCallSidRef.current.delete(payload.callSid);
      resetCallViewState();
      safeSetStatus("READY");
      closeCallWindowNow();
      await updateAgentStatus("AVAILABLE");
    }
  }, [token, user?.id, user?.name, resetCallViewState, safeSetStatus, updateAgentStatus, closeCallWindowNow]);

  const startCall = useCallback(
    async (phoneNumber: string) => {
      const device = deviceRef.current;
      if (!device || !user?.sipIdentity) return;

      try {
        safeSetStatus("DIALING");
        setCustomerNumber(phoneNumber);
        setCustomerName("Calling...");
        setContactInfo(null);
        setDuration(0);
        setCallSid(null);
        setConferenceName(null);
        setIsMuted(false);
        setIsOnHold(false);

        // ✅ V2 FLOW: Step 1 - Prepare outbound call (get conference)
        const { data: prepareData } = await api.post(
          "/voice/outbound-v2",
          { To: phoneNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const conferenceFriendlyName = prepareData.conferenceFriendlyName;
        const sessionId = prepareData.sessionId;

        // ✅ V2 FLOW: Step 2 - Connect agent to conference
        const conn = await device.connect({
          params: {
            To: phoneNumber,
            identity: user.sipIdentity,
            conference: conferenceFriendlyName,
          },
        });

        activeCallRef.current = conn;

        conn.on("accept", async () => {
          setConferenceName(conferenceFriendlyName);
          setCallSid((conn.parameters as any)?.CallSid || null);
          safeSetStatus("ON_CALL");
          await updateAgentStatus("ON_CALL");

          // ✅ DIRECT-DIAL V2: customer ab agent ke TwiML (outboundTwimlV2) ke
          // andar hi Commio SIP se dial ho jaata hai — koi alag conference nahi
          // banti. Isliye yahan ka purana /voice/outbound-v2/dial-customer call
          // hata diya hai (warna customer do baar dial hota). Conference sirf
          // transfer/hold/monitor pe promoteToConference se banegi.
          console.log("✅ Outbound connected (direct-dial via Commio, no conference)");
        });

        // Customer hangs up an outbound call → this leg disconnects. Close the
        // window immediately instead of waiting on the backend webhook.
        conn.on("disconnect", async () => {
          activeCallRef.current = null;
          resetCallViewState();
          safeSetStatus("READY");
          closeCallWindowNow();
          await updateAgentStatus("AVAILABLE");
        });

        conn.on("error", async (err) => {
          console.error("Outgoing call error:", err);
          activeCallRef.current = null;
          resetCallViewState();
          safeSetStatus("READY");
          closeCallWindowNow();
          await updateAgentStatus("AVAILABLE");
        });
      } catch (err) {
        console.error("startCall failed:", err);
        resetCallViewState();
        safeSetStatus("READY");
        closeCallWindowNow();
      }
    },
    [token, user?.sipIdentity, resetCallViewState, safeSetStatus, updateAgentStatus, closeCallWindowNow]
  );

  const hangup = useCallback(async () => {
    try {
      if (conferenceName && callSid) {
        await api.post(
          "/voice/hangup-all",
          { conferenceFriendlyName: conferenceName, agentCallSid: callSid },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error("hangup failed:", err);
    } finally {
      try { activeCallRef.current?.disconnect(); } catch {}
      activeCallRef.current = null;
      resetCallViewState();
      safeSetStatus("READY");
      setEndWindowScreen(true);
      // Agent ended the call → close the window now, don't wait for the 8s
      // grace timer / backend webhook.
      closeCallWindowNow();
      await updateAgentStatus("AVAILABLE");
    }
  }, [conferenceName, callSid, token, resetCallViewState, safeSetStatus, updateAgentStatus, closeCallWindowNow]);

  const toggleMute = useCallback(() => {
    if (!activeCallRef.current) return;
    const next = !isMuted;
    activeCallRef.current.mute(next);
    setIsMuted(next);
  }, [isMuted]);

  const toggleHold = useCallback(async () => {
    if (!conferenceName || !callSid) return;
    const next = !isOnHold;
    try {
      await api.post(
        "/voice/hold",
        { conferenceFriendlyName: conferenceName, participantCallSid: callSid, hold: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsOnHold(next);
    } catch (err) {
      console.error("toggleHold failed:", err);
    }
  }, [conferenceName, callSid, isOnHold, token]);

  const executeTransfer = useCallback(
    async (payload: any) => {
      if (!conferenceName || !callSid) {
        console.warn("Transfer skipped: missing conferenceName or callSid");
        return;
      }

      try {
        if (payload?.mode === "agent") {
          if (!payload?.target) return;
          await api.post(
            "/voice/supervised-transfer",
            { conferenceFriendlyName: conferenceName, targetIdentity: payload.target },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return;
        }

        if (payload?.mode === "contact" || payload?.mode === "dialpad") {
          if (!payload?.number) return;
          await api.post(
            "/voice/supervised-transfer-external",
            { conferenceFriendlyName: conferenceName, phoneNumber: payload.number },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return;
        }

        console.warn("Unknown transfer payload:", payload);
      } catch (err) {
        console.error("Transfer failed:", err);
      }
    },
    [conferenceName, callSid, token]
  );

  const lightState = useMemo(
    () => ({
      status,
      customerName,
      customerNumber,
      duration,
      isMuted,
      isOnHold,
      conferenceName,
      callSid,
      missedCount,
      messageCount,
      contactInfo,
      agentList: agentList || [],
      contacts: contacts || [],
      incoming: incoming
        ? {
            from: incoming.from,
            customerName: incoming.customerName,
            isTransfer: incoming.isTransfer,
            transferFrom: incoming.transferFrom,
          }
        : null,
    }),
    [
      status, customerName, customerNumber, duration,
      isMuted, isOnHold, conferenceName, callSid,
      missedCount, messageCount, contactInfo,
      agentList, contacts, incoming,
    ]
  );

  if (disabled) {
    return {
      status: "READY" as CallStatus,
      incoming: null,
      callLogs: [],
      endWindowScreen: false,
      agentList: [],
      contacts: [],
      customerName: "",
      customerNumber: "",
      duration: 0,
      isMuted: false,
      isOnHold: false,
      callSid: null,
      conferenceName: null,
      missedCount: 0,
      messageCount: 0,
      contactInfo: null,
      lightState: {
        status: "READY" as const,
        customerName: "",
        customerNumber: "",
        duration: 0,
        isMuted: false,
        isOnHold: false,
        conferenceName: null,
        callSid: null,
        missedCount: 0,
        messageCount: 0,
        contactInfo: null,
        agentList: [],
        contacts: [],
        incoming: null,
      },
      acceptIncoming:      async () => {},
      rejectIncoming:      async () => {},
      startCall:           async (_phoneNumber: string) => {},
      hangup:              async () => {},
      toggleMute:          () => {},
      toggleHold:          async () => {},
      resetMissed:         () => {},
      resetMessage:        () => {},
      setMissedCount:      (_value: number) => {},
      setMessageCount:     (_value: number) => {},
      updateAgentStatus:   async (_nextStatus: string) => {},
      executeTransfer:     async (_payload: any) => {},
      fetchContactInfo:    async (_number?: string) => {},
      sendDTMF:            (_digit: string) => {},   // NEW stub
      onEndPopClose:       () => {},
      onAfterSaveEndPopClose: () => {},
    };
  }

  return {
    status,
    incoming,
    callLogs,
    endWindowScreen,
    agentList,
    contacts,
    customerName,
    customerNumber,
    duration,
    isMuted,
    isOnHold,
    callSid,
    conferenceName,
    missedCount,
    messageCount,
    contactInfo,
    lightState,

    acceptIncoming,
    rejectIncoming,
    startCall,
    hangup,
    toggleMute,
    toggleHold,
    resetMissed,
    resetMessage,
    setMissedCount,
    setMessageCount,
    updateAgentStatus,
    executeTransfer,
    fetchContactInfo,
    sendDTMF,   // NEW
    onEndPopClose: () => {
      setEndWindowScreen(false);
      setCallLogs([]);
    },
    onAfterSaveEndPopClose: () => {
      setEndWindowScreen(false);
      setCallLogs([]);
    },
  };
}