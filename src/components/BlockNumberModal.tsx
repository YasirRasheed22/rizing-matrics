// BlockNumberModal.tsx
//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldOff, Shield, X, Phone } from 'lucide-react';

/* ─── Local theme hook ─── */
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

interface BlockModalProps {
  modal: {
    open: boolean;
    number: string;
    reason?: string;
    blockedByThisAgent: boolean;
  } | null;
  onClose: () => void;
  onUnblock: (number: string) => Promise<void>;
}

export const BlockNumberModal: React.FC<BlockModalProps> = ({ modal, onClose, onUnblock }) => {
  const theme  = useLocalTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const overlayBg     = isDark ? "rgba(0,0,0,0.75)"              : "rgba(0,0,0,0.50)";
  const cardBg        = isDark ? "rgba(20,20,30,0.98)"           : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.08)"        : "rgba(0,0,0,0.06)";
  const cardShadow    = isDark
    ? "0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 24px 64px rgba(0,0,0,0.18)";
  const titleColor    = isDark ? "#F0F0F5"                        : "#0D0D12";
  const textColor     = isDark ? "#A0A0B0"                        : "#4B5563";
  const numberColor   = isDark ? "#F0F0F5"                        : "#0D0D12";
  const divider       = isDark ? "rgba(255,255,255,0.07)"        : "rgba(0,0,0,0.06)";
  const cancelBg      = isDark ? "rgba(255,255,255,0.07)"        : "#F3F4F6";
  const cancelBord    = isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.08)";
  const cancelColor   = isDark ? "#A0A0B0"                        : "#374151";
  const cancelHovBg   = isDark ? "rgba(255,255,255,0.12)"        : "#E5E7EB";
  const unblockBg     = isDark ? "rgba(99,102,241,0.14)"         : "#EEF2FF";
  const unblockBord   = isDark ? "rgba(99,102,241,0.30)"         : "rgba(99,102,241,0.25)";
  const unblockColor  = isDark ? "#A5B4FC"                        : "#4338CA";
  const unblockHovBg  = isDark ? "rgba(99,102,241,0.22)"         : "#E0E7FF";
  const iconRingBg    = isDark ? "rgba(239,68,68,0.14)"          : "rgba(239,68,68,0.08)";
  const iconRingBord  = isDark ? "rgba(239,68,68,0.28)"          : "rgba(239,68,68,0.18)";
  const reasonPillBg  = isDark ? "rgba(255,255,255,0.06)"        : "#F9FAFB";
  const reasonPillBord= isDark ? "rgba(255,255,255,0.09)"        : "rgba(0,0,0,0.07)";
  const reasonColor   = isDark ? "#A0A0B0"                        : "#6B7280";

  const [cancelHov,  setCancelHov]  = useState(false);
  const [unblockHov, setUnblockHov] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  if (!modal?.open) return null;
  const { number, reason, blockedByThisAgent } = modal;

  const handleUnblock = async () => {
    setUnblocking(true);
    try {
      await onUnblock(number);
      onClose();
    } catch (err) {
      console.error("Unblock failed", err);
      alert("Failed to unblock. Please try again.");
    } finally { setUnblocking(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="bm-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: overlayBg,
          backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}
      >
        <motion.div
          key="bm-card"
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 420,
            background: cardBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderRadius: 20, border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            overflow: "hidden",
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          {/* Top red accent bar */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, #DC2626)" }} />

          {/* Body */}
          <div style={{ padding: "24px 24px 0" }}>
            {/* Icon */}
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              background: iconRingBg, border: `1.5px solid ${iconRingBord}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 0 16px",
            }}>
              {blockedByThisAgent
                ? <ShieldOff size={24} color="#EF4444" />
                : <Shield size={24} color="#EF4444" />}
            </div>

            {/* Title */}
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: titleColor, letterSpacing: "-0.02em" }}>
              {blockedByThisAgent ? "Number Blocked by You" : "Number is Blocked"}
            </h2>

            {/* Description */}
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: textColor, lineHeight: 1.65 }}>
              {blockedByThisAgent ? (
                <>
                  This number was blocked by you. Do you want to unblock it and make the call?
                </>
              ) : (
                <>
                  The number <strong style={{ color: numberColor, fontFamily: "monospace" }}>{number}</strong> is currently blocked
                  {reason ? " for the following reason:" : " and cannot be called."}
                </>
              )}
            </p>

            {/* Reason pill (non-agent blocked) */}
            {!blockedByThisAgent && reason && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, marginBottom: 18,
                background: reasonPillBg, border: `1px solid ${reasonPillBord}`,
                fontSize: 13, color: reasonColor, lineHeight: 1.5,
              }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4, color: isDark ? "#4A4A5A" : "#9CA3AF" }}>Reason</span>
                {reason}
              </div>
            )}

            {/* Number chip */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 12px", borderRadius: 9999,
              background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)"}`,
              marginBottom: 22,
            }}>
              <Phone size={12} color={isDark ? "#68687A" : "#9CA3AF"} />
              <span style={{ fontSize: 12.5, fontFamily: "monospace", fontWeight: 600, color: numberColor, letterSpacing: "0.04em" }}>
                {number}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "0 20px 20px",
            background: isDark ? "rgba(255,255,255,0.02)" : "transparent",
            display: "flex", gap: 10,
          }}>
            <button
              onClick={onClose}
              onMouseEnter={() => setCancelHov(true)}
              onMouseLeave={() => setCancelHov(false)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 11,
                border: `1px solid ${cancelBord}`,
                background: cancelHov ? cancelHovBg : cancelBg,
                color: cancelColor, fontSize: 13.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}
            >
              {blockedByThisAgent ? "Cancel" : "Close"}
            </button>

            {blockedByThisAgent && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleUnblock}
                disabled={unblocking}
                onMouseEnter={() => setUnblockHov(true)}
                onMouseLeave={() => setUnblockHov(false)}
                style={{
                  flex: 2, padding: "10px 0", borderRadius: 11,
                  border: `1px solid ${unblockBord}`,
                  background: unblockHov ? unblockHovBg : unblockBg,
                  color: unblockColor, fontSize: 13.5, fontWeight: 700,
                  cursor: unblocking ? "wait" : "pointer",
                  fontFamily: "inherit", transition: "all 0.12s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  opacity: unblocking ? 0.7 : 1,
                }}
              >
                {unblocking ? (
                  <>
                    <div style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${unblockColor}40`, borderTopColor: unblockColor, animation: "spin 0.7s linear infinite" }} />
                    Unblocking…
                  </>
                ) : (
                  <><ShieldOff size={14} /> Unblock & Call</>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AnimatePresence>
  );
};