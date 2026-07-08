// src/components/NotesSidebar.tsx
//@ts-nocheck
import { X, Mic, MicOff } from "lucide-react";
import { useCall } from "../context/CallContext";
import { useEffect, useRef } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotesSidebar({ isOpen, onClose }: NotesSidebarProps) {
  const call = useCall();
  const customerName    = call?.customerName;
  const customerNumber  = call?.customerNumber;
  const callSid         = call?.callSid;
  // conversationLog and isNotesOpen are not yet in the call engine; fall back
  // to safe defaults so the sidebar doesn't crash on .length / .map.
  const conversationLog: any[] = (call as any)?.conversationLog ?? [];
  const isNotesOpen = isOpen; // driven by the prop, not by context
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationLog]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.30)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 9997 }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.20 }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            style={{
              position: "fixed", right: 0, top: 0, height: "100%", width: 384, zIndex: 9999,
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
              borderLeft: "1px solid rgba(255,255,255,0.60)",
              display: "flex", flexDirection: "column",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0D0D12" }}>Call Notes & Transcript</div>
            <div style={{ fontSize: 12, color: "#9E9EAD", marginTop: 2 }}>
              {customerName || "Unknown"} · {customerNumber || "Unknown Number"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.07)", background: "#F6F7F9",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6B6B7B",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Transcript Area */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12, background: "#F6F7F9" }}
        >
          {conversationLog.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9E9EAD", marginTop: 40 }}>
              <Mic style={{ width: 40, height: 40, margin: "0 auto 12px", color: "#BBBBC8" }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>Live transcription will appear here</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Speak to begin</div>
            </div>
          ) : (
            conversationLog.map((log, i) => {
              const isAgent = log.speaker.startsWith("agent");
              return (
                <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px", borderRadius: isAgent ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isAgent ? "#5B5BD6" : "#fff",
                    color: isAgent ? "#fff" : "#0D0D12",
                    border: isAgent ? "none" : "1px solid rgba(0,0,0,0.08)",
                    boxShadow: isAgent ? "0 4px 14px rgba(91,91,214,0.20)" : "0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.72, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {isAgent ? "Agent" : customerName || "Customer"}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{log.text}</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Live indicator */}
          {isNotesOpen && conversationLog.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#6B6B7B", fontSize: 13, fontWeight: 500 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 100, 200].map((delay) => (
                    <div key={delay} style={{
                      width: 8, height: 8, borderRadius: "50%", background: "#5B5BD6",
                      animation: `bounce 1.2s ${delay}ms ease-in-out infinite`,
                    }} />
                  ))}
                </div>
                AI is transcribing...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.80)" }}>
          <button
            onClick={async (e) => {
              e.preventDefault();
              const response = await api.post("/voice/call-notes/save", { notes: conversationLog, callSessionId: callSid });
              if (response.data.success) onClose();
            }}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
              background: "#5B5BD6", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(91,91,214,0.28)",
            }}
          >
            Save Notes
          </button>
        </div>
        <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }`}</style>
         </motion.div>
      
      </>
      )}
      </AnimatePresence>
    </>
  );
}