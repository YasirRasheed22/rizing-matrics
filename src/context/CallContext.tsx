//@ts-nocheck

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useTwilioDevice } from "../hooks/useTwilioVoice";
import { useCallIPCBridge } from "../hooks/useCallIPC";

type CallContextValue = ReturnType<typeof useTwilioDevice> | null;

const CallContext = createContext<CallContextValue>(null);

const EMPTY_STATE = {
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
  participants: [],              // ← NEW
  incoming: null,
  activeSpeakerDeviceId: null,   // ← NEW
};

export function CallProvider({
  children,
  isElectronCallWindow = false,
}: {
  children: React.ReactNode;
  isElectronCallWindow?: boolean;
}) {
  const engine = useTwilioDevice({ disabled: isElectronCallWindow });
  const lastWindowStateRef = useRef<string>("");
  const closeTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);

  // Light state for IPC sync
  const lightState = useMemo(() => {
    if (!engine) return EMPTY_STATE;

    return {
      status: engine.status,
      customerName: engine.customerName,
      customerNumber: engine.customerNumber,
      duration: engine.duration,
      isMuted: engine.isMuted,
      isOnHold: engine.isOnHold,
      conferenceName: engine.conferenceName,
      callSid: engine.callSid,
      missedCount: engine.missedCount,
      messageCount: engine.messageCount,
      contactInfo: engine.contactInfo,
      agentList: engine.agentList || [],
      contacts: engine.contacts || [],
      participants: engine.participants || [],   // ← NEW
      incoming: engine.incoming
        ? {
            from: engine.incoming.from,
            customerName: engine.incoming.customerName,
            isTransfer: engine.incoming.isTransfer,
            transferFrom: engine.incoming.transferFrom,
          }
        : null,
      activeSpeakerDeviceId: engine.activeSpeakerDeviceId ?? null,  // ← NEW
    };
  }, [engine]);

  // Stable callbacks
  const onAccept = useCallback(
    () => engine?.acceptIncoming?.(),
    [engine?.acceptIncoming]
  );
  const onReject = useCallback(
    () => engine?.rejectIncoming?.(),
    [engine?.rejectIncoming]
  );
  const onMute = useCallback(
    () => engine?.toggleMute?.(),
    [engine?.toggleMute]
  );
  const onHold = useCallback(
    () => engine?.toggleHold?.(),
    [engine?.toggleHold]
  );
  const onHangup = useCallback(
    () => engine?.hangup?.(),
    [engine?.hangup]
  );
  const onTransfer = useCallback(
    (p: unknown) => engine?.executeTransfer?.(p),
    [engine?.executeTransfer]
  );
  const onRemoveParticipant = useCallback(
    (p?: { participantCallSid: string }) => {
      if (p?.participantCallSid) engine?.removeParticipant?.(p.participantCallSid);
    },
    [engine?.removeParticipant]
  );
  const onFetchContactInfo = useCallback(
    (p?: { number: string }) => engine?.fetchContactInfo?.(p?.number),
    [engine?.fetchContactInfo]
  );
  const onDTMF = useCallback(
    (p?: { digit: string }) => {
      if (p?.digit) engine?.sendDTMF?.(p.digit);
    },
    [engine?.sendDTMF]
  );

  // ← NEW: speaker callback
  const onSpeaker = useCallback(
    (p: { deviceId: string }) => {
      if (p?.deviceId) engine?.setSpeaker?.(p.deviceId);
    },
    [engine?.setSpeaker]
  );

  const { openCallWindow, closeCallWindow } = useCallIPCBridge(lightState, {
    onAccept,
    onReject,
    onMute,
    onHold,
    onHangup,
    onTransfer,
    onRemoveParticipant,   // ← NEW
    onFetchContactInfo,
    onDTMF,
    onSpeaker,   // ← NEW
  });

  // Debounced window open/close — 8 second grace period
  useEffect(() => {
    if (isElectronCallWindow || !engine) return;

    const shouldOpen =
      engine.status === "INCOMING" ||
      engine.status === "DIALING"  ||
      engine.status === "ON_CALL";

    if (shouldOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      // Symmetric to the close debounce below — a single-render transient
      // flip into INCOMING/DIALING (e.g. a socket reconnect briefly
      // re-emitting state) shouldn't pop the call window on its own. Only
      // open once that status has actually held for a beat.
      if (lastWindowStateRef.current !== "open" && openTimerRef.current === null) {
        openTimerRef.current = window.setTimeout(() => {
          openTimerRef.current = null;
          const stillShouldOpen =
            engine.status === "INCOMING" ||
            engine.status === "DIALING"  ||
            engine.status === "ON_CALL";
          if (stillShouldOpen && lastWindowStateRef.current !== "open") {
            lastWindowStateRef.current = "open";
            openCallWindow();
          }
        }, 200);
      }
    } else {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      if (
        lastWindowStateRef.current === "open" &&
        closeTimerRef.current === null
      ) {
        // Close almost immediately. A tiny debounce only coalesces a transient
        // READY blip between two in-call states — it must NOT be a long grace
        // period, otherwise the call window lingers for several seconds after
        // the call has already ended (the old 8000ms value caused the 10-12s
        // close delay agents were seeing).
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;

          const currentStatus = engine.status;
          const stillShouldClose =
            currentStatus !== "INCOMING" &&
            currentStatus !== "DIALING"  &&
            currentStatus !== "ON_CALL";

          if (stillShouldClose) {
            lastWindowStateRef.current = "close";
            closeCallWindow();
          }
        }, 300);
      }
    }
  }, [isElectronCallWindow, engine?.status, openCallWindow, closeCallWindow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <CallContext.Provider value={engine}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}

export { CallContext };