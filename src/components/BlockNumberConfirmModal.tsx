// src/components/BlockNumberConfirmModal.tsx
//@ts-nocheck
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Ban, X } from "lucide-react";

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

interface BlockNumberConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  customerNumber: string;
}

export default function BlockNumberConfirmModal({
  isOpen, onClose, onConfirm, customerNumber,
}: BlockNumberConfirmModalProps) {
  const theme  = useLocalTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const overlayBg      = isDark ? "rgba(0,0,0,0.75)"              : "rgba(0,0,0,0.55)";
  const cardBg         = isDark ? "rgba(20,20,30,0.98)"           : "#fff";
  const cardBorder     = isDark ? "rgba(255,255,255,0.08)"        : "rgba(0,0,0,0.06)";
  const cardShadow     = isDark
    ? "0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 24px 64px rgba(0,0,0,0.18)";
  const titleColor     = isDark ? "#F0F0F5"                        : "#0D0D12";
  const textColor      = isDark ? "#A0A0B0"                        : "#4B5563";
  const numberColor    = isDark ? "#F0F0F5"                        : "#0D0D12";
  const iconRingBg     = isDark ? "rgba(239,68,68,0.14)"          : "rgba(239,68,68,0.08)";
  const iconRingBord   = isDark ? "rgba(239,68,68,0.28)"          : "rgba(239,68,68,0.18)";
  const textareaLblClr = isDark ? "#68687A"                        : "#9CA3AF";
  const textareaLbl2   = isDark ? "#A0A0B0"                        : "#374151";
  const textareaBg     = isDark ? "rgba(30,30,42,0.90)"           : "#F9FAFB";
  const textareaBord   = isDark ? "rgba(255,255,255,0.09)"        : "rgba(0,0,0,0.10)";
  const textareaColor  = isDark ? "#F0F0F5"                        : "#0D0D12";
  const textareaFocBrd = isDark ? "rgba(239,68,68,0.55)"          : "rgba(239,68,68,0.55)";
  const textareaFocShd = isDark ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px rgba(239,68,68,0.10)";
  const cancelBg       = isDark ? "rgba(255,255,255,0.07)"        : "#F3F4F6";
  const cancelBord     = isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.08)";
  const cancelColor    = isDark ? "#A0A0B0"                        : "#374151";
  const cancelHovBg    = isDark ? "rgba(255,255,255,0.12)"        : "#E5E7EB";
  const closeBtnBg     = isDark ? "rgba(255,255,255,0.07)"        : "#F3F4F6";
  const closeBtnBord   = isDark ? "rgba(255,255,255,0.09)"        : "rgba(0,0,0,0.08)";
  const footerBg       = isDark ? "rgba(255,255,255,0.02)"        : "rgba(249,250,251,0.80)";
  const footerBord     = isDark ? "rgba(255,255,255,0.07)"        : "rgba(0,0,0,0.06)";

  const [reason,       setReason]       = useState("");
  const [cancelHov,    setCancelHov]    = useState(false);
  const [confirmHov,   setConfirmHov]   = useState(false);
  const [textareaFoc,  setTextareaFoc]  = useState(false);

  useEffect(() => {
    if (!isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <AnimatePresence>
      <motion.div
        key="bcm-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: overlayBg,
          backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}
      >
        <motion.div
          key="bcm-card"
          initial={{ scale: 0.88, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 18 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 440,
            background: cardBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderRadius: 20, border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow, overflow: "hidden",
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, #DC2626, #EF4444)", backgroundSize: "200% 100%", animation: "bcmShimmer 3s linear infinite" }} />

          {/* Header */}
          <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${footerBord}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: iconRingBg, border: `1.5px solid ${iconRingBord}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ban size={22} color="#EF4444" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: titleColor, letterSpacing: "-0.02em" }}>
                  Block this number?
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: textareaLblClr }}>
                  This action will block all calls from this number
                </p>
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${closeBtnBord}`, background: closeBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: textareaLblClr, flexShrink: 0, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.28)"; e.currentTarget.style.color = "#EF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = closeBtnBg; e.currentTarget.style.borderColor = closeBtnBord; e.currentTarget.style.color = textareaLblClr; }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 22px" }}>
            {/* Number chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: isDark ? "rgba(239,68,68,0.08)" : "#FEF2F2", border: `1px solid ${isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.14)"}`, marginBottom: 16 }}>
              <Ban size={14} color="#EF4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: textColor, lineHeight: 1.5, flex: 1 }}>
                Block <strong style={{ color: numberColor, fontFamily: "monospace", fontSize: 13.5 }}>{customerNumber}</strong>? This will prevent all incoming calls from this number permanently.
              </span>
            </div>

            {/* Reason textarea */}
            <div>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: textareaLblClr, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Reason
                </span>
                <span style={{ fontSize: 11, color: textareaLblClr }}>Optional</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                onFocus={() => setTextareaFoc(true)}
                onBlur={() => setTextareaFoc(false)}
                placeholder="e.g. Spam calls, harassment, repeated wrong numbers..."
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 13px", borderRadius: 11, resize: "none",
                  border: `1px solid ${textareaFoc ? textareaFocBrd : textareaBord}`,
                  boxShadow: textareaFoc ? textareaFocShd : "none",
                  background: textareaBg, color: textareaColor,
                  fontSize: 13.5, fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "0 20px 20px", background: footerBg, display: "flex", gap: 10 }}>
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
              Cancel
            </button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleConfirm}
              onMouseEnter={() => setConfirmHov(true)}
              onMouseLeave={() => setConfirmHov(false)}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 11, border: "none",
                background: confirmHov
                  ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
                  : "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                color: "#fff", fontSize: 13.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: isDark
                  ? "0 4px 16px rgba(239,68,68,0.40)"
                  : "0 4px 16px rgba(239,68,68,0.30)",
              }}
            >
              <Ban size={14} /> Yes, Block Number
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
      <style>{`
        @keyframes bcmShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AnimatePresence>
  );
}