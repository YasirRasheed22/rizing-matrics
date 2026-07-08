// src/components/GlobalCallUI.tsx
// @ts-nocheck

import { useState ,useEffect} from "react";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import { ActiveCallBar } from "./ActiveCallBar";
import IncomingModalAllOver from "./IncomingModalAllOver";
import NotesSidebar from "./NotesSidebar";
import TransferModal from "./TransferModalv1";
import LeadSaleModal from "./LeadSaleModalv1";
import CallLeadSaleModal from "./LeadSaleModal";
import AgentAutoDialPanel from "./AgentAutoDialPanel";
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light"))
        setTheme(e.newValue);
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(() => {
      try {
        const val = localStorage.getItem("theme") as "dark" | "light" | null;
        if (val === "dark" || val === "light") setTheme(val);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);
  return theme;
}
export default function GlobalCallUI() {
  const call = useCall();
  const { user } = useAuth();
  const theme  = useLocalTheme();
  const isDark = theme === "dark";

  // UI-only state — these never belonged in the call engine hook
  const [isNotesOpen, setIsNotesOpen]     = useState(false);
  const [transferOpen, setTransferOpen]   = useState(false);
  const [transferType, setTransferType]   = useState("supervisor");
  const [transferAgent, setTransferAgent] = useState(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // In the Electron call window the native API is present; this component is
  // not needed there (GlobalCallUI is already excluded via App.tsx) but guard
  // defensively so a hot-reload doesn't break the standalone window.
  if (window?.electronAPI?.notify) return null;

  return (
    <>
      {/* Incoming call overlay */}
      <IncomingModalAllOver
        show={!!call?.incoming}
        from={call?.incoming?.from}
        customerName={call?.incoming?.customerName}
        isTransfer={call?.incoming?.isTransfer}
        transferFrom={call?.incoming?.transferFrom}
        onAccept={call?.acceptIncoming}
        onReject={call?.rejectIncoming}
      />

      {/* Active call bar — only while on a call */}
      {call?.status === "ON_CALL" && (
        <ActiveCallBar
          isMuted={call.isMuted}
          isOnHold={call.isOnHold}
          duration={call.duration}
          customerName={call.customerName}
          customerNumber={call.customerNumber}
          onMute={call.toggleMute}
          onHold={call.toggleHold}
          onAdd={() => {
            setTransferType("supervisor");
            setTransferOpen(true);
          }}
          onNotes={() => setIsNotesOpen((v) => !v)}
          onMakeLead={() => setIsLeadModalOpen(true)}
          onHangup={call.hangup}
          privileges={user?.agentPrivilege}
          participants={call?.participants || []}
          selfCallSid={call?.callSid || null}
          onRemoveParticipant={(sid: string) => call?.removeParticipant?.(sid)}
        />
      )}

      <NotesSidebar
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />

      <TransferModal
        show={transferOpen}
        type={transferType}
        agentList={call?.agentList || []}
        agent={transferAgent}
        setAgent={setTransferAgent}
        onTransfer={call?.executeTransfer}
        contacts={call?.contacts || []}
        onCancel={() => {
          setTransferOpen(false);
          setTransferAgent(null);
        }}
      />

      <CallLeadSaleModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        customerName={call?.customerName}
        customerNumber={call?.customerNumber}
        contactInfo={call?.contactInfo}
        fetchContactInfo={call?.fetchContactInfo}
        isDark={isDark}
      />

      {/* Agent Auto-Dial Panel — only for agents, not Electron window */}
      
    </>
  );
}