//@ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CallAction, LightCallState } from "../types/call";

const DEFAULT_STATE: LightCallState = {
  status: "READY",
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
  incoming: null,
  agentList: [],
  contacts: [],
  participants: [],              // ← NEW
  activeSpeakerDeviceId: null,   // ← NEW
};

function stableSerialize(value: unknown) {
  try { return JSON.stringify(value); }
  catch { return ""; }
}

export function useCallIPCBridge(
  state: Partial<LightCallState>,
  handlers: {
    onAccept?:           () => void;
    onReject?:           () => void;
    onMute?:             () => void;
    onHold?:             () => void;
    onHangup?:           () => void;
    onTransfer?:         (payload?: unknown) => void;
    onRemoveParticipant?: (payload?: { participantCallSid: string }) => void;  // ← NEW
    onFetchContactInfo?: (payload?: { number: string }) => void;
    onDTMF?:             (payload?: { digit: string }) => void;
    onSpeaker?:          (payload: { deviceId: string }) => void;  // ← NEW
  }
) {
  const throttleRef      = useRef<number | null>(null);
  const lastSerializedRef = useRef("");

  // State sync → electron main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const payload: LightCallState = { ...DEFAULT_STATE, ...state };
    const serialized = stableSerialize(payload);
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;

    if (throttleRef.current) window.clearTimeout(throttleRef.current);

    throttleRef.current = window.setTimeout(() => {
      window.electronAPI?.replaceCallState(payload);
    }, 100);

    return () => {
      if (throttleRef.current) window.clearTimeout(throttleRef.current);
    };
  }, [state]);

  // Listen for actions from call window
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribe = window.electronAPI.onCallAction((action: CallAction) => {
      switch (action.type) {
        case "ACCEPT":
          handlers.onAccept?.();
          break;
        case "REJECT":
          handlers.onReject?.();
          break;
        case "MUTE":
          handlers.onMute?.();
          break;
        case "HOLD":
          handlers.onHold?.();
          break;
        case "HANGUP":
          handlers.onHangup?.();
          break;
        case "TRANSFER":
          handlers.onTransfer?.(action.payload);
          break;
        case "REMOVE_PARTICIPANT":
          handlers.onRemoveParticipant?.(action.payload as { participantCallSid: string });
          break;
        case "FETCH_CONTACT_INFO":
          handlers.onFetchContactInfo?.(action.payload);
          break;
        case "DTMF":
          handlers.onDTMF?.(action.payload);
          break;
        case "SPEAKER":                                          // ← NEW
          handlers.onSpeaker?.(action.payload as { deviceId: string });
          break;
        default:
          break;
      }
    });

    return () => { unsubscribe?.(); };
  }, [
    handlers.onAccept,
    handlers.onReject,
    handlers.onMute,
    handlers.onHold,
    handlers.onHangup,
    handlers.onTransfer,
    handlers.onRemoveParticipant,   // ← NEW
    handlers.onFetchContactInfo,
    handlers.onDTMF,
    handlers.onSpeaker,   // ← NEW
  ]);

  const openCallWindow  = useCallback(() => { window.electronAPI?.openCallWindow();  }, []);
  const closeCallWindow = useCallback(() => { window.electronAPI?.closeCallWindow(); }, []);

  return { openCallWindow, closeCallWindow };
}

export function useCallIPCState() {
  const [state, setState] = useState<LightCallState>(DEFAULT_STATE);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribe = window.electronAPI.onCallState((nextState) => {
      setState(nextState || DEFAULT_STATE);
    });

    window.electronAPI.requestInitialCallState();

    const onFocus = () => { window.electronAPI?.requestInitialCallState(); };
    window.addEventListener("focus", onFocus);

    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const sendAction    = useCallback((action: CallAction) => { window.electronAPI?.sendCallAction(action); }, []);
  const minimizeWindow = useCallback(() => { window.electronAPI?.minimizeCallWindow();   }, []);
  const closeWindow   = useCallback(() => { window.electronAPI?.closeCallWindowFrame(); }, []);

  return useMemo(
    () => ({ state, sendAction, minimizeWindow, closeWindow }),
    [state, sendAction, minimizeWindow, closeWindow]
  );
}