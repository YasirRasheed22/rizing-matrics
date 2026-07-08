// components/ContactDetailPanel.tsx
// @ts-nocheck

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, X, Mail, Building2, MapPin,
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, FileText, User,
} from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import api from "../api";
import { useTheme } from "../context/ThemeContext";

/* ─── types ──────────────────────────────────────────── */
type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  title?: string;
  notes?: string;
  phones?: Array<{ numberE164: string; label: string }>;
  addresses?: Array<{ address: string; city: string; state: string; zip: string; label: string }>;
};
type Props = {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onCall: (number: string) => void;
};

/* ─── helpers ────────────────────────────────────────── */
const getInitials = (first: string, last: string) =>
  `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";

const AVATAR_COLORS = ["#5B5BD6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316"];
function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const fmt = (e164: string): string => {
  try {
    const p = parsePhoneNumberFromString(e164);
    if (p?.isValid()) return p.formatInternational();
  } catch {}
  return e164;
};

const fmtDuration = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;

function callMeta(call: any, isDark = false) {
  if (call.type === "missed" || call.status === "no-answer" || call.status === "busy")
    return { icon: PhoneMissed,   color: isDark ? "#F87171" : "#EF4444", bg: isDark ? "rgba(248,113,113,0.15)" : "rgba(239,68,68,0.10)",   label: "Missed"   };
  if (call.direction === "inbound")
    return { icon: PhoneIncoming, color: "#10B981", bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)",  label: "Incoming" };
  return   { icon: PhoneOutgoing, color: isDark ? "#7C7CF0" : "#5B5BD6", bg: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)",   label: "Outgoing" };
}

/* ─── InfoRow ────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, children, isDark = false }: any) {
  const divider    = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const iconBg     = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";
  const iconColor  = isDark ? "#7C7CF0"                : "#5B5BD6";
  const labelColor = isDark ? "#68687A"                : "#9E9EAD";

  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${divider}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────── */
export default function ContactDetailPanel({ contact, open, onClose, onCall }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab]       = useState<"info" | "calls">("info");
  const [callHistory, setCallHistory]   = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  // ── Design tokens ──
  const panelBg      = isDark ? "#17171F"                 : "#fff";
  const tabsBg       = isDark ? "#17171F"                 : "#fff";
  const tabBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary  = isDark ? "#F0F0F5"                 : "#0D0D12";
  const textSecondary = isDark ? "#68687A"                : "#9E9EAD";
  const textMuted    = isDark ? "#A0A0B0"                 : "#6B6B7B";
  const accentMain   = isDark ? "#7C7CF0"                 : "#5B5BD6";
  const divider      = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const notesBg      = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const notesBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const durationBg   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const durationBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  useEffect(() => {
    if (!contact || activeTab !== "calls") return;
    setLoadingCalls(true);
    api
      .get(`/voice/contacts/${contact.id}/call-history`)
      .then(res => setCallHistory(res.data.data || []))
      .finally(() => setLoadingCalls(false));
  }, [activeTab, contact?.id]);

  if (!contact) return null;

  const fullName     = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown";
  const color        = nameColor(fullName);
  const initials     = getInitials(contact.firstName || "", contact.lastName || "");
  const primaryPhone = contact.phones?.find(p => p.label === "Mobile") || contact.phones?.[0];

  const TABS = [
    { key: "info",  label: "Information" },
    { key: "calls", label: "Call History" },
  ] as const;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.22)", zIndex: 1040, backdropFilter: "blur(2px)" }}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1, transition: { type: "spring", damping: 28, stiffness: 260 } }}
            exit={{ x: "100%", opacity: 0, transition: { duration: 0.22 } }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
              background: panelBg, zIndex: 1050,
              display: "flex", flexDirection: "column",
              fontFamily: "'Inter', -apple-system, sans-serif",
              boxShadow: isDark ? "-16px 0 48px rgba(0,0,0,0.50)" : "-16px 0 48px rgba(0,0,0,0.14)",
            }}
          >

            {/* ── Header (gradient — same in both modes, accent changes) ── */}
            <div style={{
              background: isDark
                ? "linear-gradient(135deg, #4A4ABA 0%, #3535A0 100%)"
                : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)",
              padding: "28px 24px 22px", position: "relative", flexShrink: 0,
            }}>
              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                onClick={onClose}
                style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={16} color="#fff" />
              </motion.button>

              {/* Avatar */}
              <div style={{ width: 72, height: 72, borderRadius: 20, background: `${color}35`, border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 auto 14px", letterSpacing: "0.01em" }}>
                {initials}
              </div>

              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
                {fullName}
              </h2>
              {contact.title && (
                <p style={{ textAlign: "center", fontSize: 12.5, color: "rgba(255,255,255,0.72)", margin: "0 0 16px" }}>
                  {contact.title}
                </p>
              )}
              {!contact.title && primaryPhone && <div style={{ marginBottom: 14 }} />}

              {/* Call CTA */}
              {primaryPhone && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => onCall(primaryPhone.numberE164)}
                  style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto", padding: "9px 24px", background: "#fff", color: accentMain, border: "none", borderRadius: 50, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px rgba(0,0,0,0.18)" }}
                >
                  <Phone size={15} /> Call Now
                </motion.button>
              )}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${tabBorder}`, background: tabsBg, flexShrink: 0 }}>
              {TABS.map(({ key, label }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      flex: 1, padding: "13px 0", border: "none", background: "none",
                      cursor: "pointer", fontSize: 13.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? accentMain : textSecondary,
                      borderBottom: isActive ? `2.5px solid ${accentMain}` : "2.5px solid transparent",
                      marginBottom: -1, transition: "all 0.15s", fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 40px" }}>
              <AnimatePresence mode="wait">

                {/* Info tab */}
                {activeTab === "info" && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Phone numbers */}
                    {contact.phones && contact.phones.length > 0 && (
                      <InfoRow icon={Phone} label="Phone Numbers" isDark={isDark}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {contact.phones.map((p, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary, fontFamily: "monospace, monospace" }}>
                                  {fmt(p.numberE164)}
                                </div>
                                <div style={{ fontSize: 11, color: textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                                  {p.label}
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                                onClick={() => onCall(p.numberE164)}
                                style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)", color: accentMain, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                              >
                                <Phone size={14} />
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      </InfoRow>
                    )}

                    {/* Email */}
                    {contact.email && (
                      <InfoRow icon={Mail} label="Email" isDark={isDark}>
                        <a
                          href={`mailto:${contact.email}`}
                          style={{ fontSize: 13.5, color: accentMain, fontWeight: 600, textDecoration: "none" }}
                        >
                          {contact.email}
                        </a>
                      </InfoRow>
                    )}

                    {/* Company */}
                    {contact.company && (
                      <InfoRow icon={Building2} label="Company" isDark={isDark}>
                        <div style={{ fontSize: 13.5, color: textPrimary, fontWeight: 600 }}>{contact.company}</div>
                      </InfoRow>
                    )}

                    {/* Address */}
                    {contact.addresses?.[0] && (
                      <InfoRow icon={MapPin} label="Address" isDark={isDark}>
                        <div style={{ fontSize: 13.5, color: textPrimary, fontWeight: 600, lineHeight: 1.55 }}>
                          {contact.addresses[0].address}<br />
                          {contact.addresses[0].city}, {contact.addresses[0].state} {contact.addresses[0].zip}
                        </div>
                      </InfoRow>
                    )}

                    {/* Notes */}
                    {contact.notes && (
                      <InfoRow icon={FileText} label="Notes" isDark={isDark}>
                        <p style={{ margin: 0, fontSize: 13.5, color: textMuted, lineHeight: 1.6, background: notesBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${notesBorder}` }}>
                          {contact.notes}
                        </p>
                      </InfoRow>
                    )}

                    {/* Empty state */}
                    {!contact.phones?.length && !contact.email && !contact.company && !contact.addresses?.length && !contact.notes && (
                      <div style={{ textAlign: "center", padding: "48px 0" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                          <User size={20} color={accentMain} />
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5, color: textSecondary }}>No contact details available</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Call history tab */}
                {activeTab === "calls" && (
                  <motion.div
                    key="calls"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    style={{ paddingTop: 8 }}
                  >
                    {loadingCalls ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <span style={{ fontSize: 13, color: textSecondary }}>Loading call history…</span>
                      </div>

                    ) : callHistory.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                          <Phone size={20} color={accentMain} />
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: textPrimary }}>No calls yet</p>
                        <p style={{ margin: 0, fontSize: 12.5, color: textSecondary }}>No call history with this contact</p>
                      </div>

                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {callHistory.map((call, i) => {
                          const cm       = callMeta(call, isDark);
                          const CallIcon = cm.icon;
                          return (
                            <motion.div
                              key={call.sessionId || i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${divider}` }}
                            >
                              {/* Icon tile */}
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: cm.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CallIcon size={17} color={cm.color} />
                              </div>

                              {/* Text */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: cm.label === "Missed" ? (isDark ? "#F87171" : "#EF4444") : textPrimary }}>
                                  {cm.label} Call
                                </div>
                                <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                  {new Date(call.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  {" · "}
                                  {new Date(call.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </div>
                              </div>

                              {/* Duration badge */}
                              {call.duration > 0 && (
                                <span style={{ fontSize: 11.5, color: textSecondary, display: "flex", alignItems: "center", gap: 4, background: durationBg, padding: "3px 9px", borderRadius: 20, flexShrink: 0, border: `1px solid ${durationBorder}` }}>
                                  <Clock size={10} />{fmtDuration(call.duration)}
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
