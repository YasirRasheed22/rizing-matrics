// components/DeleteContactModal.tsx
// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2 } from "lucide-react";

/* ─── localStorage theme hook ───────────────────────── */
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

/* ─── design tokens ─────────────────────────────────── */
function getTokens(isDark: boolean) {
  return {
    OVERLAY:      isDark ? "rgba(0,0,0,0.70)"              : "rgba(0,0,0,0.40)",
    BG:           isDark ? "#1A1A28"                        : "#ffffff",
    SHADOW:       isDark
      ? "0 24px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 24px 64px rgba(0,0,0,0.20)",

    ICON_BG:      isDark ? "rgba(239,68,68,0.14)"          : "rgba(239,68,68,0.10)",
    ICON_BORDER:  isDark ? "rgba(239,68,68,0.25)"          : "rgba(239,68,68,0.15)",

    TITLE:        isDark ? "#F0F0F8"                        : "#0D0D12",
    TITLE_BOLD:   isDark ? "#F0F0F8"                        : "#0D0D12",
    DESC:         isDark ? "#9090A8"                        : "#6B7280",

    PHONE_BG:     isDark ? "rgba(239,68,68,0.08)"          : "rgba(239,68,68,0.05)",
    PHONE_BORDER: isDark ? "rgba(239,68,68,0.20)"          : "rgba(239,68,68,0.12)",
    PHONE_TEXT:   isDark ? "#B0B0C8"                        : "#6B7280",

    BORDER_HDR:   isDark ? "rgba(255,255,255,0.07)"        : "transparent",

    CANCEL_BG:    isDark ? "#22223A"                        : "#ffffff",
    CANCEL_BORDER:isDark ? "rgba(255,255,255,0.10)"        : "#D0D5DD",
    CANCEL_TEXT:  isDark ? "#C0C0D8"                        : "#344054",
    CANCEL_BG_H:  isDark ? "#2A2A42"                        : "#F9FAFB",
  };
}

/* ─── interfaces ─────────────────────────────────────── */
interface Props {
  open: boolean;
  contact: any | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export const DeleteContactModal: React.FC<Props> = ({
  open, contact, onClose, onConfirm, loading = false,
}) => {
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);

  if (!open || !contact) return null;

  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "this contact";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={!loading ? onClose : undefined}
            style={{
              position: "fixed", inset: 0,
              background: tk.OVERLAY,
              zIndex: 1060, backdropFilter: "blur(3px)",
            }}
          />

          {/* Modal */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 1070,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px", pointerEvents: "none",
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(420px, 100%)",
                background: tk.BG,
                borderRadius: 16,
                fontFamily: "'Inter', -apple-system, sans-serif",
                boxShadow: tk.SHADOW,
                border: `1px solid ${tk.BORDER_HDR}`,
                overflow: "hidden",
                pointerEvents: "all",
              }}
            >
              {/* Top icon + text */}
              <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: tk.ICON_BG,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  border: `1px solid ${tk.ICON_BORDER}`,
                }}>
                  <AlertTriangle size={24} color="#EF4444" />
                </div>

                <h2 style={{
                  fontSize: 16, fontWeight: 800, color: tk.TITLE,
                  margin: "0 0 8px", letterSpacing: "-0.02em",
                }}>
                  Delete Contact?
                </h2>

                <p style={{ fontSize: 13.5, color: tk.DESC, margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: tk.TITLE_BOLD }}>{fullName}</strong>
                  {" "}will be permanently deleted. This action cannot be undone.
                </p>

                {/* Phone numbers preview */}
                {contact.phones?.length > 0 && (
                  <div style={{
                    marginTop: 14, padding: "10px 14px",
                    background: tk.PHONE_BG,
                    border: `1px solid ${tk.PHONE_BORDER}`,
                    borderRadius: 10, textAlign: "left",
                  }}>
                    {contact.phones.map((p: any, i: number) => (
                      <div key={i} style={{
                        fontSize: 12.5,
                        color: tk.PHONE_TEXT,
                        fontFamily: "monospace, monospace",
                      }}>
                        {p.numberE164}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div style={{ padding: "16px 24px 24px", display: "flex", gap: 10 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 9,
                    border: `1px solid ${tk.CANCEL_BORDER}`,
                    background: tk.CANCEL_BG,
                    fontSize: 13, fontWeight: 600,
                    color: tk.CANCEL_TEXT,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: loading ? 0.6 : 1,
                    transition: "background 0.14s",
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = tk.CANCEL_BG_H; }}
                  onMouseLeave={e => { e.currentTarget.style.background = tk.CANCEL_BG; }}
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileHover={!loading ? { scale: 1.02, boxShadow: "0 4px 16px rgba(239,68,68,0.35)" } : {}}
                  whileTap={!loading ? { scale: 0.97 } : {}}
                  onClick={onConfirm}
                  disabled={loading}
                  style={{
                    flex: 1.5, padding: "10px", borderRadius: 9,
                    border: "none",
                    background: loading ? "#FCA5A5" : "#EF4444",
                    fontSize: 13, fontWeight: 600, color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        animation: "spin 0.6s linear infinite",
                      }} />
                      Deleting…
                    </>
                  ) : (
                    <><Trash2 size={14} /> Delete Contact</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
};