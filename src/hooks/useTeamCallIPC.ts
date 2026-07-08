//@ts-nocheck
// src/hooks/useTeamCallIPC.ts — Electron IPC bridge for the Team Call
// (free P2P) window. Mirrors useCallIPC.ts exactly but on its own
// channel namespace — fully decoupled from the Twilio call window.
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamCallAction, TeamCallLightState } from "../types/teamcall";

const DEFAULT_STATE: TeamCallLightState = {
  status: "IDLE", peer: null, duration: 0, isMuted: false, isOnHold: false, remoteMuted: false, remoteOnHold: false,
};

function stableSerialize(value: unknown) {
  try { return JSON.stringify(value); } catch { return ""; }
}

export function useTeamCallIPCBridge(
  state: Partial<TeamCallLightState>,
  handlers: {
    onAccept?: () => void;
    onReject?: () => void;
    onMute?:   () => void;
    onHold?:   () => void;
    onHangup?: () => void;
  }
) {
  const throttleRef = useRef<number | null>(null);
  const lastSerializedRef = useRef("");

  useEffect(() => {
    if (!window.electronAPI?.updateTeamCallState) return;

    const payload: TeamCallLightState = { ...DEFAULT_STATE, ...state };
    const serialized = stableSerialize(payload);
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;

    if (throttleRef.current) window.clearTimeout(throttleRef.current);
    throttleRef.current = window.setTimeout(() => {
      window.electronAPI?.replaceTeamCallState?.(payload);
    }, 100);

    return () => { if (throttleRef.current) window.clearTimeout(throttleRef.current); };
  }, [state]);

  useEffect(() => {
    if (!window.electronAPI?.onTeamCallAction) return;
    const unsubscribe = window.electronAPI.onTeamCallAction((action: TeamCallAction) => {
      switch (action.type) {
        case "ACCEPT": handlers.onAccept?.(); break;
        case "REJECT": handlers.onReject?.(); break;
        case "MUTE":   handlers.onMute?.();   break;
        case "HOLD":   handlers.onHold?.();   break;
        case "HANGUP": handlers.onHangup?.(); break;
        default: break;
      }
    });
    return () => { unsubscribe?.(); };
  }, [handlers.onAccept, handlers.onReject, handlers.onMute, handlers.onHold, handlers.onHangup]);

  const openTeamCallWindow  = useCallback(() => { window.electronAPI?.openTeamCallWindow?.();  }, []);
  const closeTeamCallWindow = useCallback(() => { window.electronAPI?.closeTeamCallWindow?.(); }, []);

  return { openTeamCallWindow, closeTeamCallWindow };
}

export function useTeamCallIPCState() {
  const [state, setState] = useState<TeamCallLightState>(DEFAULT_STATE);

  useEffect(() => {
    if (!window.electronAPI?.onTeamCallState) return;

    const unsubscribe = window.electronAPI.onTeamCallState((next) => setState(next || DEFAULT_STATE));
    window.electronAPI.requestInitialTeamCallState?.();

    const onFocus = () => { window.electronAPI?.requestInitialTeamCallState?.(); };
    window.addEventListener("focus", onFocus);

    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const sendAction     = useCallback((action: TeamCallAction) => { window.electronAPI?.sendTeamCallAction?.(action); }, []);
  const minimizeWindow = useCallback(() => { window.electronAPI?.minimizeTeamCallWindow?.(); }, []);
  const closeWindow    = useCallback(() => { window.electronAPI?.closeTeamCallWindowFrame?.(); }, []);

  return { state, sendAction, minimizeWindow, closeWindow };
}
