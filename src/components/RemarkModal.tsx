//@ts-nocheck
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";
import Select from "react-select";
import { X, Paperclip, Calendar, MessageSquare, Tag, Save } from "lucide-react";
import { DateTimeInput } from "./ui/AppDatePicker";
import { motion, AnimatePresence } from "framer-motion";

type DispositionOption = { value: number | string; label: string; color?: string; };
type Remark = {
  id: number; remark: string; note: string; attachment?: string | null;
  userId: number; dispositionId?: number | null;
  nextFollowupDate?: string | null; callStatus?: "connected" | "not_connected" | null;
};
type Props = {
  leadId: number; remark: Remark | null; onClose: () => void;
  onSaved: (remark: Remark) => void; dispositions?: DispositionOption[];
  isDark?: boolean;
};

export default function RemarkModal({ leadId, remark, onClose, onSaved, dispositions: propDispositions = [], isDark: isDarkProp }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  // ── Design tokens ──
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#A0A0B0"                  : "#344054";
  const textMuted     = isDark ? "#68687A"                  : "#667085";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.08)";
  const modalBg       = isDark ? "rgba(20,20,28,0.98)"      : "#fff";
  const modalBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const modalShadow   = isDark ? "0 24px 64px rgba(0,0,0,0.70)" : "0 24px 60px rgba(16,24,40,0.18)";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const footerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const bodyBg        = isDark ? "rgba(255,255,255,0.02)"   : "#FCFCFD";
  const sectionBg     = isDark ? "rgba(255,255,255,0.04)"   : "#fff";
  const sectionBorder = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.08)"   : "#fff";
  const closeBtnBord  = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const cancelBg      = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const cancelBord    = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const cancelColor   = isDark ? "#A0A0B0"                  : "#344054";
  const errorBg       = isDark ? "rgba(239,68,68,0.15)"     : "#FEF3F2";
  const errorBorder   = isDark ? "rgba(239,68,68,0.30)"     : "#FECDCA";
  const errorColor    = isDark ? "#F87171"                  : "#B42318";
  const linkColor     = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const overlayBg     = isDark ? "rgba(0,0,0,0.75)"         : "rgba(16,24,40,0.45)";
  const fileInputBg   = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const checkboxLabel = isDark ? "#C0C0D0"                  : "#344054";
  const currentFileCl = isDark ? "#A0A0B0"                  : "#667085";

  const inputStyle = {
    width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary,
    border: `1px solid ${inputBorder}`, borderRadius: 10, outline: "none",
    background: inputBg, transition: "all 0.15s", boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  const fieldLabelStyle = {
    fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase" as const,
    letterSpacing: "0.04em", marginBottom: 6, display: "block",
  };

  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: `1px solid ${state.isFocused ? accentMain : inputBorder}`,
      borderRadius: 10, padding: "2px 4px",
      boxShadow: state.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(37,99,235,0.10)"}` : "none",
      "&:hover": { borderColor: accentMain }, minHeight: 42, backgroundColor: inputBg,
    }),
    menu: (provided: any) => ({
      ...provided, borderRadius: 12, overflow: "hidden",
      boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.60)" : "0 12px 28px rgba(0,0,0,0.12)",
      zIndex: 99999, background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? `1px solid ${inputBorder}` : "none",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? accentMain : state.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "#EFF6FF") : "transparent",
      color: state.isSelected ? "#fff" : textPrimary, padding: "10px 14px", fontSize: "13px",
    }),
    placeholder: (provided: any) => ({ ...provided, color: textMuted, fontSize: "13px" }),
    singleValue: (provided: any) => ({ ...provided, color: textPrimary, fontSize: "13px" }),
    multiValue: (provided: any) => ({ ...provided, backgroundColor: isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF", borderRadius: "8px" }),
    multiValueLabel: (provided: any) => ({ ...provided, color: isDark ? "#A5B4FC" : "#4747C2", fontWeight: 600 }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    clearIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
    indicatorSeparator: () => ({ display: "none" }),
  };

  const [note, setNote]               = useState("");
  const [dispositionId, setDispositionId] = useState<number | string | null>(null);
  const [nextFollowup, setNextFollowup] = useState("");
  const [callStatus, setCallStatus]   = useState<"connected" | "not_connected" | null>(null);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [dispositions, setDispositions] = useState<DispositionOption[]>(propDispositions);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (propDispositions.length > 0) { setDispositions(propDispositions); return; }
    api.get("/voice/dispositions/all").then((res) => {
      setDispositions((res.data || []).filter((d: any) => d.status !== false).sort((a: any, b: any) => a.sequence - b.sequence).map((d: any) => ({ value: d.id, label: d.name, color: d.color })));
    }).catch(() => {});
  }, [propDispositions]);

  useEffect(() => {
    if (remark) {
      setNote(remark.note || ""); setDispositionId(remark.dispositionId || null);
      setCallStatus(remark.callStatus || null);
      setNextFollowup(remark.nextFollowupDate ? new Date(remark.nextFollowupDate).toISOString().slice(0, 16) : "");
      setHasAttachment(Boolean(remark.attachment));
    } else {
      setNote(""); setDispositionId(null); setCallStatus(null);
      setNextFollowup(""); setHasAttachment(false); setFile(null);
    }
  }, [remark]);

  const minDateTime = new Date().toISOString().slice(0, 16);

  const handleSubmit = async () => {
    setError(null);
    if (!note.trim()) { setError("Remark / Note is required"); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("remark", note.trim());
      formData.append("leadId", String(leadId));
      if (dispositionId) formData.append("dispositionId", String(dispositionId));
      if (nextFollowup) formData.append("nextFollowupDate", nextFollowup);
      if (callStatus) formData.append("callStatus", callStatus);
      if (hasAttachment && file) formData.append("file", file);
      const endpoint = remark ? `/voice/leads/remark/${remark.id}` : `/voice/leads/remark`;
      const res = remark
        ? await api.put(endpoint, formData, { headers: { "Content-Type": "multipart/form-data" } })
        : await api.post(endpoint, formData, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved(res.data.remark || res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to save remark");
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: overlayBg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
        <div onClick={onClose} style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)" }} />
        <motion.div key="modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560, background: modalBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 18, boxShadow: modalShadow, border: `1px solid ${modalBorder}`, overflow: "hidden", fontFamily: "'Inter', -apple-system, sans-serif" }}>

          {/* Header */}
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={16} color={accentMain} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>
                  {remark ? "Edit Remark" : "Add Remark"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>
                  Add note, update disposition, and attach file if needed
                </p>
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${closeBtnBord}`, background: closeBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, background: bodyBg, maxHeight: "65vh", overflowY: "auto" }}>
            {error && (
              <div style={{ color: errorColor, background: errorBg, border: `1px solid ${errorBorder}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}

            {!remark && (<>
              {/* Disposition */}
              <div style={{ background: sectionBg, border: `1px solid ${sectionBorder}`, borderRadius: 12, padding: 14 }}>
                <label style={fieldLabelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Tag size={13} /> Disposition</span>
                </label>
                <Select
                  options={dispositions}
                  value={dispositions.find((opt) => opt.value === dispositionId) || null}
                  onChange={(opt) => setDispositionId(opt ? opt.value : null)}
                  placeholder="Select disposition..."
                  isClearable styles={selectStyles}
                />
              </div>

              {/* Next followup */}
              <div style={{ background: sectionBg, border: `1px solid ${sectionBorder}`, borderRadius: 12, padding: 14 }}>
                <label style={fieldLabelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar size={13} /> Next Follow-up</span>
                </label>
                <DateTimeInput value={nextFollowup} min={minDateTime} onChange={(val) => setNextFollowup(val)} style={inputStyle} />
              </div>
            </>)}

            {/* Note */}
            <div style={{ background: sectionBg, border: `1px solid ${sectionBorder}`, borderRadius: 12, padding: 14 }}>
              <label style={fieldLabelStyle}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MessageSquare size={13} /> Remark / Note *</span>
              </label>
              <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your remark here..." required
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                onBlur={(e) => (e.target.style.borderColor = inputBorder)}
              />
            </div>

            {/* Attachment */}
            <div style={{ background: sectionBg, border: `1px solid ${sectionBorder}`, borderRadius: 12, padding: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500, color: checkboxLabel, cursor: "pointer", marginBottom: hasAttachment ? 12 : 0 }}>
                <input type="checkbox" checked={hasAttachment} onChange={(e) => setHasAttachment(e.target.checked)} style={{ accentColor: accentMain }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Paperclip size={14} /> Add Attachment</span>
              </label>
              {hasAttachment && (
                <div>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ ...inputStyle, padding: "8px 10px", background: fileInputBg }} />
                  {remark?.attachment && !file && (
                    <div style={{ marginTop: 10, fontSize: 12, color: currentFileCl }}>
                      Current file:{" "}
                      <a href={remark.attachment} target="_blank" rel="noopener noreferrer" style={{ color: linkColor, fontWeight: 600 }}>
                        View attachment
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 20px", borderTop: `1px solid ${footerBorder}`, display: "flex", justifyContent: "flex-end", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#fff" }}>
            <button onClick={onClose} disabled={loading}
              style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${cancelBord}`, background: cancelBg, color: cancelColor, fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
              Cancel
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", background: loading ? (isDark ? "#2A2A3A" : "#94A3B8") : accentMain, color: loading ? (isDark ? "#68687A" : "#fff") : "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : (isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)") }}>
              {loading ? (
                <><div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.30)`, borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Saving…</>
              ) : (
                <><Save size={14} /> Save Remark</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}