//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateTimeInput } from "./ui/AppDatePicker";
import Select from "react-select";
import {
  User, Phone, MapPin, Calendar, MessageSquare,
  FileText, Shield, Plus, X, Save,
} from "lucide-react";
import api from "../api";
import { formatDate } from "../hooks/dateFormat";
import { useTheme } from "../context/ThemeContext";

interface DispositionOption { value: number; label: string; color?: string; }
interface Lead {
  id: number; clientName: string; clientPhone: string; clientAddress: string;
  disposition?: { id: number; name: string; color: string };
  nextFollowupDate: string; alternatePhone: string; comments: string;
  tags: string[]; addedBy?: { id: number; name: string };
  createdAt: string; remarks: Remark[]; logs: Log[];
}
interface Remark { id: number; note: string; createdAt: string; user: { id: number; name: string }; }
interface Log { id: number; action: string; message: string; createdAt: string; user: { id: number; name: string }; }
interface LeadDetailsProps {
  lead: Lead | null; leadId: number | null;
  dispositions: DispositionOption[]; onRemarkAdded?: () => void; selectStyles?: any;
}
type TabType = "lead" | "remarks" | "logs";

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" }, { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" }, { bg: "#EFF6FF", text: "#5B5BD6" },
  { bg: "#FFF1F2", text: "#E11D48" }, { bg: "#F0FDFA", text: "#0D9488" },
  { bg: "#FFFBEB", text: "#D97706" }, { bg: "#FDF4FF", text: "#A21CAF" },
];
const AVATAR_COLORS_DARK = [
  { bg: "rgba(79,70,229,0.18)", text: "#818CF8" }, { bg: "rgba(22,163,74,0.18)", text: "#4ADE80" },
  { bg: "rgba(234,88,12,0.18)", text: "#FB923C" }, { bg: "rgba(91,91,214,0.18)", text: "#A5B4FC" },
  { bg: "rgba(225,29,72,0.18)", text: "#FB7185" }, { bg: "rgba(13,148,136,0.18)", text: "#2DD4BF" },
  { bg: "rgba(217,119,6,0.18)", text: "#FCD34D" }, { bg: "rgba(162,28,175,0.18)", text: "#E879F9" },
];

const getAvatarColor = (str: string, dark: boolean) => {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return dark ? AVATAR_COLORS_DARK[idx] : AVATAR_COLORS[idx];
};

const getInitials = (name: string) =>
  (name || "?").trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 500, color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>
      {children}
    </label>
  );
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, leadId, dispositions, onRemarkAdded, selectStyles: externalSelectStyles }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const pageBg        = isDark ? "#0F0F14"                  : "#F8F9FC";
  const headerBg      = isDark ? "rgba(23,23,31,0.97)"      : "#fff";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const cardBg        = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const contentBg     = isDark ? "rgba(15,15,20,0.60)"      : "#F8F9FC";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#A0A0B0"                  : "#344054";
  const textMuted     = isDark ? "#68687A"                  : "#667085";
  const textSoft      = isDark ? "#C0C0D0"                  : "#475467";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.08)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const divider       = isDark ? "rgba(255,255,255,0.06)"   : "#F2F4F7";
  const tabBorder     = isDark ? "rgba(255,255,255,0.06)"   : "#EAECF0";
  const tabActiveLine = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const tabActiveClr  = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const tabInactiveClr= isDark ? "#68687A"                  : "#667085";
  const tabHoverClr   = isDark ? "#C0C0D0"                  : "#344054";
  const emptyIconClr  = isDark ? "#3A3A4A"                  : "#D0D5DD";
  const countBadgeBg  = isDark ? "rgba(255,255,255,0.06)"   : "#F9FAFB";
  const countBadgeBord= isDark ? "rgba(255,255,255,0.08)"   : "#EAECF0";
  const tagBg         = isDark ? "rgba(255,255,255,0.06)"   : "#F2F4F7";
  const tagBorder     = isDark ? "rgba(255,255,255,0.08)"   : "#EAECF0";
  const tagColor      = isDark ? "#A0A0B0"                  : "#475467";
  const remarkItemBord= isDark ? "rgba(255,255,255,0.05)"   : "#F2F4F7";
  const spinBorder    = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.15)";
  const modalOverlay  = isDark ? "rgba(0,0,0,0.75)"         : "rgba(13,13,18,0.45)";
  const modalBg       = isDark ? "rgba(20,20,28,0.98)"      : "#fff";
  const modalBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.07)";
  const modalShadow   = isDark ? "0 24px 64px rgba(0,0,0,0.70)" : "0 24px 64px rgba(0,0,0,0.18)";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.08)"   : "#F0F0F5";
  const cancelBg      = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const cancelBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const textareaStyle = {
    width: "100%", padding: "10px 12px", fontSize: 14,
    color: textPrimary, border: `1px solid ${inputBorder}`, borderRadius: 8,
    outline: "none", background: inputBg, transition: "all 0.15s",
    boxSizing: "border-box" as const, fontFamily: "inherit", resize: "vertical" as const,
    minHeight: 100, lineHeight: 1.6,
  };

  const infoCardStyle = {
    background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 18,
  };

  const builtSelectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 8, background: inputBg, minHeight: 40,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)" }, fontSize: 14,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12, overflow: "hidden",
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: `1px solid ${inputBorder}`,
      boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.60)" : "0 16px 40px rgba(0,0,0,0.14)", zIndex: 9999,
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)") : "transparent",
      color: s.isSelected ? "#fff" : textPrimary, fontSize: 14, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 14 }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: 14 }),
    indicatorSeparator: () => ({ display: "none" }),
    clearIndicator: (p: any) => ({ ...p, color: textMuted }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  const mergedSelectStyles = externalSelectStyles || builtSelectStyles;

  const [activeTab, setActiveTab] = useState<TabType>("lead");
  const [showModal, setShowModal]   = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [selectedDisposition, setSelectedDisposition] = useState<DispositionOption | null>(null);
  const [nextFollowup, setNextFollowup] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (lead && showModal) {
      const currentDisp = dispositions.find((d) => d.value === lead.disposition?.id);
      setSelectedDisposition(currentDisp || null);
      if (lead.nextFollowupDate) {
        const date = new Date(lead.nextFollowupDate);
        setNextFollowup(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
        setNextFollowup("");
      }
    }
  }, [lead, dispositions, showModal]);

  if (!lead || !leadId) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg, borderRadius: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <User size={24} style={{ color: isDark ? "#3A3A4A" : "#9CA3AF" }} />
          </div>
          <p style={{ color: textSecondary, fontWeight: 600, fontSize: 15, margin: 0 }}>No lead data available</p>
        </div>
      </div>
    );
  }

  const handleAddRemark = async () => {
    if (!remarkText.trim()) { setError("Please enter a remark/note"); return; }
    setLoading(true); setError(null);
    try {
      const payload: any = { note: remarkText.trim() };
      if (selectedDisposition?.value) payload.dispositionId = selectedDisposition.value;
      if (nextFollowup) payload.nextFollowupDate = new Date(nextFollowup).toISOString();
      await api.post(`/leads/${leadId}/remarks`, payload);
      setRemarkText(""); setSelectedDisposition(null); setNextFollowup("");
      setShowModal(false); onRemarkAdded?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save remark/update");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => { setShowModal(false); setRemarkText(""); setError(null); };

  const avatar = getAvatarColor(lead.clientName || "Lead", isDark);

  const tabs = [
    { key: "lead",    label: "Lead Info",                       icon: User },
    { key: "remarks", label: `Remarks (${lead.remarks.length})`, icon: MessageSquare },
    { key: "logs",    label: `Logs (${lead.logs.length})`,       icon: FileText },
  ];

  /* ── InfoCard ── */
  const InfoCard = ({ label, icon: Icon, value, children }: any) => (
    <div style={infoCardStyle}>
      <Label color={textMuted}>{label}</Label>
      {children ? children : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          {Icon && <Icon size={16} style={{ color: textMuted, flexShrink: 0 }} />}
          <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary, wordBreak: "break-word" }}>
            {value || "—"}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: pageBg, fontFamily: "'Inter', -apple-system, sans-serif", borderRadius: 18 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatar.bg, color: avatar.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {getInitials(lead.clientName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
              {lead.clientName}
            </h2>
            <p style={{ color: textMuted, fontSize: 13, margin: "3px 0 0" }}>
              Lead details, remarks and activity logs
            </p>
          </div>
        </div>

        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: accentMain, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600, boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)" }}>
          <Plus size={14} /> Add Remark
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${tabBorder}`, padding: "0 24px", display: "flex", gap: 0 }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button key={key}
              onClick={() => setActiveTab(key as TabType)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? tabActiveClr : tabInactiveClr, borderBottom: isActive ? `2px solid ${tabActiveLine}` : "2px solid transparent", transition: "all 0.15s", marginBottom: -1, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = tabHoverClr; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = tabInactiveClr; }}
            >
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 24, background: contentBg, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
        <AnimatePresence mode="wait">

          {/* Lead Info Tab */}
          {activeTab === "lead" && (
            <motion.div key="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <InfoCard label="Client Name"     icon={User}     value={lead.clientName} />
                <InfoCard label="Phone Number"    icon={Phone}    value={lead.clientPhone} />
                <InfoCard label="Alternate Phone" icon={Phone}    value={lead.alternatePhone || "—"} />
                <InfoCard label="Address"         icon={MapPin}   value={lead.clientAddress || "—"} />

                <InfoCard label="Disposition">
                  {lead.disposition ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: lead.disposition.color || accentMain, color: "#fff", fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.9 }} />
                      {lead.disposition.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, color: textMuted }}>—</span>
                  )}
                </InfoCard>

                <InfoCard label="Next Follow-up" icon={Calendar} value={lead.nextFollowupDate ? formatDate(lead.nextFollowupDate) : "—"} />
                <InfoCard label="Added By"       icon={Shield}   value={lead.addedBy?.name || "—"} />
                <InfoCard label="Created At"     icon={Calendar} value={formatDate(lead.createdAt)} />
              </div>

              <div style={{ marginTop: 16 }}>
                <InfoCard label="Comments">
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: textSoft }}>
                    {lead.comments || "No comments"}
                  </p>
                </InfoCard>
              </div>

              <div style={{ marginTop: 16 }}>
                <InfoCard label="Tags">
                  {lead.tags?.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                      {lead.tags.map((tag, i) => (
                        <span key={i} style={{ fontSize: 12, fontWeight: 600, color: tagColor, background: tagBg, border: `1px solid ${tagBorder}`, padding: "5px 10px", borderRadius: 999 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, color: textMuted }}>None</span>
                  )}
                </InfoCard>
              </div>
            </motion.div>
          )}

          {/* Remarks Tab */}
          {activeTab === "remarks" && (
            <motion.div key="remarks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>Lead Remarks</span>
                  <span style={{ fontSize: 12, color: textMuted, background: countBadgeBg, border: `1px solid ${countBadgeBord}`, borderRadius: 20, padding: "2px 10px" }}>
                    {lead.remarks.length} records
                  </span>
                </div>

                {lead.remarks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "56px 0" }}>
                    <MessageSquare size={28} style={{ color: emptyIconClr, margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No remarks yet</p>
                    <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Add the first remark for this lead</p>
                  </div>
                ) : (
                  <div>
                    {lead.remarks.map((remark, index) => (
                      <div key={remark.id} style={{ padding: "16px 18px", borderTop: index === 0 ? "none" : `1px solid ${remarkItemBord}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{remark.user.name}</span>
                          <span style={{ fontSize: 12, color: textMuted }}>{formatDate(remark.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: textSoft, lineHeight: 1.6 }}>{remark.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <motion.div key="logs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>Activity Logs</span>
                  <span style={{ fontSize: 12, color: textMuted, background: countBadgeBg, border: `1px solid ${countBadgeBord}`, borderRadius: 20, padding: "2px 10px" }}>
                    {lead.logs.length} records
                  </span>
                </div>

                {lead.logs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "56px 0" }}>
                    <FileText size={28} style={{ color: emptyIconClr, margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No logs yet</p>
                    <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Activity logs will appear here</p>
                  </div>
                ) : (
                  <div>
                    {lead.logs.map((log, index) => (
                      <div key={log.id} style={{ padding: "16px 18px", borderTop: index === 0 ? "none" : `1px solid ${remarkItemBord}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>
                            {log.user.name} — <span style={{ color: accentMain }}>{log.action}</span>
                          </div>
                          <span style={{ fontSize: 12, color: textMuted }}>{formatDate(log.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: textSoft, lineHeight: 1.6 }}>{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal — custom (no react-bootstrap) */}
      <AnimatePresence>
        {showModal && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            {/* Backdrop */}
            <div onClick={closeModal} style={{ position: "absolute", inset: 0, background: modalOverlay, backdropFilter: "blur(4px)" }} />

            {/* Modal box */}
            <motion.div key="modal" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 340 }}
              style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 580, maxHeight: "92vh", display: "flex", flexDirection: "column", background: modalBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 20, border: `1px solid ${modalBorder}`, boxShadow: modalShadow, fontFamily: "'Inter', -apple-system, sans-serif" }}>

              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={16} color={accentMain} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Add Remark / Update Lead</span>
                </div>
                <button onClick={closeModal}
                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: closeBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} color={textMuted} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", border: `1px solid ${isDark ? "rgba(239,68,68,0.30)" : "#FECACA"}`, color: isDark ? "#F87171" : "#DC2626", fontSize: 13, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <div>
                  <Label color={textMuted}>Remark / Note *</Label>
                  <textarea
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    placeholder="Enter your remarks here..."
                    style={textareaStyle}
                    onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                    onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                  />
                </div>

                <div>
                  <Label color={textMuted}>Disposition</Label>
                  <Select
                    options={dispositions}
                    value={selectedDisposition}
                    onChange={(option) => setSelectedDisposition(option)}
                    placeholder="Select disposition (optional)"
                    isClearable
                    styles={mergedSelectStyles}
                  />
                </div>

                <div>
                  <Label color={textMuted}>Next Follow-up Date</Label>
                  <DateTimeInput
                    value={nextFollowup}
                    onChange={(val) => setNextFollowup(val)}
                    style={{
                      width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary,
                      border: `1px solid ${inputBorder}`, borderRadius: 8, outline: "none",
                      background: inputBg, transition: "all 0.15s", boxSizing: "border-box", fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: "14px 22px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(246,247,249,0.80)", flexShrink: 0, display: "flex", gap: 10 }}>
                <button onClick={closeModal}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${cancelBorder}`, background: cancelBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleAddRemark}
                  disabled={loading || !remarkText.trim()}
                  style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: loading || !remarkText.trim() ? (isDark ? "#2A2A3A" : "#BBBBC8") : accentMain, color: loading || !remarkText.trim() ? (isDark ? "#68687A" : "#fff") : "#fff", fontWeight: 700, fontSize: 13, cursor: loading || !remarkText.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading || !remarkText.trim() ? "none" : (isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)") }}>
                  {loading ? (
                    <><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.40)"}`, borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Saving…</>
                  ) : (
                    <><Save size={14} /> Save Remark & Updates</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadDetails;