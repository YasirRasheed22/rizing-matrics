// src/context/useCallEngine.ts
// @ts-nocheck

import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import { Device, Call } from "@twilio/voice-sdk";
import { useAuth } from "../context/AuthContext";

export function useCallEngine() {
  const { user, token } = useAuth();

  const deviceRef = useRef<Device | null>(null);
  const activeConnRef = useRef<Call | null>(null);
  const seenCallSids = useRef(new Set<string>()); // Prevents duplicate incoming calls

  const [status, setStatus] = useState("OFFLINE");

  const [incoming, setIncoming] = useState<any>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [conferenceName, setConferenceName] = useState<string | null>(null);

  // Persistent caller details (shown in active call bar)
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");

  const [isOnHold, setIsOnHold] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferType, setTransferType] = useState("blind");
  const [transferAgent, setTransferAgent] = useState<any>(null);
  const [isSupervisedMode, setIsSupervisedMode] = useState(false);

  // ----------------------------------------------------------------------
  // TIMER
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (status !== "ON_CALL") {
      clearInterval(timerRef.current);
      setDuration(0);
      return;
    }

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [status]);

  // ----------------------------------------------------------------------
  // INIT TWILIO DEVICE
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!user?.sipIdentity || !token) return;

    const init = async () => {
      try {
        const { data } = await api.get(
          `/token/sip?identity=${user.sipIdentity}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const device = new Device(data.token, {
          logLevel: 1,
          codecPreferences: ["opus", "pcmu"],
          enableRingingState: true,
          edge: "singapore", // Faster connection & stops duplicate invites
        });

        deviceRef.current = device;

        device.on("registered", () => setStatus("READY"));
        device.on("unregistered", () => setStatus("OFFLINE"));
        device.on("error", (e) => console.error("TWILIO ERROR:", e));

        // ---- INCOMING CALL HANDLER ----
        device.on("incoming", async (conn) => {
          const sid = conn.parameters.CallSid;

          // Ignore duplicate incoming for same call
          if (seenCallSids.current.has(sid)) {
            conn.ignore();
            return;
          }
          seenCallSids.current.add(sid);

          setStatus("INCOMING");
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

          setIncoming({
            conn,
            from,
            customerName: name,
            isTransfer: conf.data?.isTransfer,
            transferFrom: conf.data?.transferFrom,
            customerCallSid: sid,
          });

          // If caller hangs up before you answer
          conn.once("cancel", () => {
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
        setAgentList(agents.data);
      } catch (error) {
        console.error('error', error.message);
      }
    };

    getAgentsList();
    init();

    return () => {
      deviceRef.current?.destroy();
      seenCallSids.current.clear();
    };
  }, [user, token]);

  // ----------------------------------------------------------------------
  // ACCEPT INCOMING
  // ----------------------------------------------------------------------
  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;

    const conn = incoming.conn;
    const sid = incoming.customerCallSid;

    // Prevent cancel from resetting UI after accept
    conn.removeAllListeners("cancel");

    conn.accept();
    activeConnRef.current = conn;

    // Save caller info for active call bar
    setCustomerNumber(incoming.from);
    setCustomerName(incoming.customerName || "Unknown Caller");

    setCallSid(sid);

    const conf = await api.get(`/voice/call/${sid}/conference`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setConferenceName(conf.data?.conferenceName);
    setIncoming(null);
    setStatus("ON_CALL");

    conn.on("disconnect", () => {
      seenCallSids.current.delete(sid);
      setStatus("READY");
      activeConnRef.current = null;
      setDuration(0);
    });

    conn.on("error", () => {
      seenCallSids.current.delete(sid);
      setStatus("READY");
      activeConnRef.current = null;
    });
  }, [incoming, token]);

  // ----------------------------------------------------------------------
  // REJECT INCOMING
  // ----------------------------------------------------------------------
  const rejectIncoming = useCallback(async () => {
    if (incoming?.customerCallSid) {
      await api.post("/voice/decline", {
        customerCallSid: incoming.customerCallSid,
        agentName: user?.name,
      });
    }

    incoming?.conn.reject();
    seenCallSids.current.delete(incoming?.customerCallSid);
    setIncoming(null);
    setStatus("READY");
  }, [incoming, user]);

  // ----------------------------------------------------------------------
  // OUTGOING CALL
  // ----------------------------------------------------------------------
  const startCall = useCallback(
    async (e164) => {
      const device = deviceRef.current;
      setStatus("DIALING");

      // ✅ V2 FLOW: Step 1 - Prepare outbound call (get conference)
      const { data: prepareData } = await api.post(
        "/voice/outbound-v2",
        { To: e164 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const conferenceFriendlyName = prepareData.conferenceFriendlyName;
      const sessionId = prepareData.sessionId;

      setCustomerNumber(e164);
      setCustomerName("Calling...");

      // ✅ V2 FLOW: Step 2 - Connect agent to conference
      const conn = await device.connect({
        params: {
          To: e164,
          identity: user.sipIdentity,
          conference: conferenceFriendlyName,
        },
      });

      activeConnRef.current = conn;

      conn.on("accept", async () => {
        setStatus("ON_CALL");
        setConferenceName(conferenceFriendlyName);
        setCallSid(conn.parameters.CallSid);

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

      conn.on("disconnect", () => {
        setStatus("READY");
        activeConnRef.current = null;
        setDuration(0);
      });
    },
    [user, token]
  );

  // ----------------------------------------------------------------------
  // HANGUP
  // ----------------------------------------------------------------------
  const hangup = useCallback(async () => {
    if (!conferenceName) return;

    await api.post(
      "/voice/hangup-all",
      { conferenceFriendlyName: conferenceName, agentCallSid: callSid },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    activeConnRef.current?.disconnect();
    activeConnRef.current = null;

    if (callSid) seenCallSids.current.delete(callSid);

    setStatus("READY");
    setConferenceName(null);
    setCallSid(null);
    setIncoming(null);
    setDuration(0);
    setCustomerName("");
    setCustomerNumber("");
  }, [conferenceName, callSid, token]);

  // ----------------------------------------------------------------------
  // HOLD
  // ----------------------------------------------------------------------
  const toggleHold = useCallback(async () => {
    if (!conferenceName || !callSid) return;

    const next = !isOnHold;

    await api.post(
      "/voice/hold",
      {
        conferenceFriendlyName: conferenceName,
        participantCallSid: callSid,
        hold: next,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setIsOnHold(next);
  }, [conferenceName, callSid, isOnHold, token]);

  // ----------------------------------------------------------------------
  // TRANSFER
  // ----------------------------------------------------------------------
  const executeTransfer = useCallback(async () => {
    if (!callSid || !conferenceName || !transferAgent) return;

    try {
      if (transferType === "blind") {
        await api.post(
          "/voice/blind-transfer",
          {
            conferenceFriendlyName: conferenceName,
            currentAgentCallSid: callSid,
            targetIdentity: transferAgent,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        hangup(); // Agent leaves immediately
      } else {
        await api.post(
          "/voice/supervised-transfer",
          {
            conferenceFriendlyName: conferenceName,
            targetIdentity: transferAgent.value || transferAgent,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsSupervisedMode(true);
      }
    } catch (error) {
      console.error("Transfer failed:", error);
      alert("Transfer failed. Please try again.");
    } finally {
      setTransferOpen(false);
      setTransferAgent(null);
    }
  }, [
    callSid,
    conferenceName,
    transferAgent,
    transferType,
    token,
    hangup,
  ]);

  return {
    // state
    status,
    incoming,
    agentList,
    callSid,
    conferenceName,
    activeConn: activeConnRef,

    isOnHold,
    isMuted,
    isSupervisedMode,
    duration,

    transferOpen,
    transferType,
    transferAgent,

    customerName,
    customerNumber,

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
  };
}