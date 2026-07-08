//@ts-nocheck
// src/context/TeamCallContext.tsx
// Global provider for the free P2P Team Call feature. Mounted once at the
// app root (alongside, but independent of, CallProvider) so incoming
// agent↔agent calls ring no matter which page the user is on.
//
// Electron: a separate BrowserWindow (teamcall.html) pops for incoming/
// active calls, mirroring how the Twilio call window works but on its
// own IPC channel — never touches CallContext/call.tsx.
// Web (no Electron): the same engine state drives a global in-page
// overlay (TeamCallWebOverlay) instead of a real OS window.
import { createContext, useContext, useEffect, useRef } from "react";
import { useTeamCallEngine } from "../hooks/useTeamCallEngine";
import { useTeamCallIPCBridge } from "../hooks/useTeamCallIPC";

type TeamCallContextValue = ReturnType<typeof useTeamCallEngine> | null;
const TeamCallContext = createContext<TeamCallContextValue>(null);

export function TeamCallProvider({
  children,
  isElectronTeamCallWindow = false,
}: {
  children: React.ReactNode;
  isElectronTeamCallWindow?: boolean;
}) {
  // The dedicated teamcall.html window has its own engine instance via
  // useTeamCallIPCState instead — disabled here so it doesn't open a
  // second socket/WebRTC stack. (Hook is always called, per Rules of
  // Hooks — `disabled` just short-circuits its internal effect.)
  const engine = useTeamCallEngine({ disabled: isElectronTeamCallWindow });

  const lastWindowStateRef = useRef<string>("");
  const openTimerRef  = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const lightState = engine
    ? { status: engine.status, peer: engine.peer, duration: engine.duration, isMuted: engine.isMuted, isOnHold: engine.isOnHold, remoteMuted: engine.remoteMuted, remoteOnHold: engine.remoteOnHold }
    : {};

  const { openTeamCallWindow, closeTeamCallWindow } = useTeamCallIPCBridge(lightState, {
    onAccept: () => engine?.accept(),
    onReject: () => engine?.reject(),
    onMute:   () => engine?.toggleMute(),
    onHold:   () => engine?.toggleHold(),
    onHangup: () => engine?.hangup(),
  });

  // Electron only — open/close the dedicated window based on status,
  // same debounced pattern as CallContext (avoids popping on a single
  // transient flicker).
  useEffect(() => {
    if (isElectronTeamCallWindow || !engine || !window.electronAPI?.openTeamCallWindow) return;

    const shouldOpen = engine.status === "INCOMING" || engine.status === "OUTGOING" || engine.status === "ON_CALL";

    if (shouldOpen) {
      if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
      if (lastWindowStateRef.current !== "open" && openTimerRef.current === null) {
        openTimerRef.current = window.setTimeout(() => {
          openTimerRef.current = null;
          const stillShouldOpen = engine.status === "INCOMING" || engine.status === "OUTGOING" || engine.status === "ON_CALL";
          if (stillShouldOpen && lastWindowStateRef.current !== "open") {
            lastWindowStateRef.current = "open";
            openTeamCallWindow();
          }
        }, 200);
      }
    } else {
      if (openTimerRef.current) { window.clearTimeout(openTimerRef.current); openTimerRef.current = null; }
      if (lastWindowStateRef.current === "open" && closeTimerRef.current === null) {
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          const stillShouldClose = engine.status !== "INCOMING" && engine.status !== "OUTGOING" && engine.status !== "ON_CALL";
          if (stillShouldClose) {
            lastWindowStateRef.current = "close";
            closeTeamCallWindow();
          }
        }, 300);
      }
    }
  }, [isElectronTeamCallWindow, engine?.status, openTeamCallWindow, closeTeamCallWindow]);

  return (
    <TeamCallContext.Provider value={engine}>
      {children}
    </TeamCallContext.Provider>
  );
}

export function useTeamCall() {
  return useContext(TeamCallContext);
}
