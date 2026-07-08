// src/components/teams/CreateTeamModal.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, ShieldCheck } from "lucide-react";
import Select from "react-select";
import { toast } from "react-hot-toast";
import api from "../../api";
import { useTheme } from "../../context/ThemeContext";

const PRIVILEGE_LABELS: Record<string, string> = {
  viewDashboard:      "View Dashboard",
  addMembers:         "Add / Remove Members",
  listenLiveCalls:    "Listen to Live Calls",
  editTeamSettings:   "Edit Team Settings",
  monitorPerformance: "Monitor Performance",
  manageAgentStatus:  "Manage Agent Status",
  bargeCalls:         "Barge Calls",
  canListenRecording: "Listen Agent Recordings",
  canAddLead:         "Can mark agent lead",
};

const DEFAULT_PRIVILEGES = {
  viewDashboard: true, addMembers: true, listenLiveCalls: true,
  editTeamSettings: false, monitorPerformance: true,
  manageAgentStatus: false, bargeCalls: false,
  canListenRecording: false, canAddLead: false,
};

function Toggle({ name, checked, onChange, isDark }: { name: string; checked: boolean; onChange: (e: any) => void; isDark: boolean }) {
  const textPrimary = isDark ? "#C0C0D0" : "#0D0D12";
  const rowBg = checked
    ? isDark ? "rgba(124,124,240,0.08)" : "rgba(91,91,214,0.05)"
    : isDark ? "rgba(255,255,255,0.04)" : "#F6F7F9";
  const rowBorder = checked
    ? isDark ? "rgba(124,124,240,0.24)" : "rgba(91,91,214,0.20)"
    : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const trackBg = checked ? (isDark ? "#7C7CF0" : "#5B5BD6") : (isDark ? "#3A3A4A" : "#D5D5E0");

  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "10px 14px", borderRadius: 10, background: rowBg, border: `1px solid ${rowBorder}`, transition: "all 0.15s" }}>
      <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>{PRIVILEGE_LABELS[name] ?? name}</span>
      <div
        onClick={() => onChange({ target: { name, checked: !checked } })}
        style={{ position: "relative", width: 36, height: 20, borderRadius: 10, background: trackBg, transition: "background 0.2s", flexShrink: 0, cursor: "pointer" }}
      >
        <div style={{ position: "absolute", top: 3, left: checked ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.20)", transition: "left 0.2s" }} />
      </div>
    </label>
  );
}

export default function CreateTeamModal({ onClose, onSave, isDark: isDarkProp }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const modalBg       = isDark ? "rgba(20,20,28,0.98)"      : "rgba(255,255,255,0.97)";
  const modalBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(255,255,255,0.70)";
  const modalShadow   = isDark ? "0 24px 64px rgba(0,0,0,0.70)" : "0 24px 64px rgba(0,0,0,0.18)";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const footerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.08)"   : "#F0F0F5";
  const cancelBg      = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const cancelBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const sectionTitle  = isDark ? "#68687A"                  : "#9E9EAD";
  const overlayBg     = isDark ? "rgba(0,0,0,0.75)"         : "rgba(13,13,18,0.45)";

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13.5,
    color: textPrimary, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700, color: textMuted,
    marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: sectionTitle,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 14, display: "flex", alignItems: "center", gap: 7,
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 10, background: inputBg, minHeight: 42,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)" }, fontSize: 13.5,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12, overflow: "hidden",
      boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.60)" : "0 16px 40px rgba(0,0,0,0.14)",
      zIndex: 9999, background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.09)" : "none",
    }),
    option: (p: any, s: any) => ({
      ...p, background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)") : "transparent",
      color: s.isSelected ? "white" : textPrimary, fontSize: 13.5, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13.5 }),
    placeholder: (p: any) => ({ ...p, color: isDark ? "#3A3A4A" : "#BBBBC8", fontSize: 13.5 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  const [form, setForm]                               = useState({ name: "", description: "" });
  const [agents, setAgents]                           = useState([]);
  const [loadingAgents, setLoadingAgents]             = useState(true);
  const [submitting, setSubmitting]                   = useState(false);
  const [selectedSupervisor, setSelectedSupervisor]   = useState(null);
  const [privileges, setPrivileges]                   = useState(DEFAULT_PRIVILEGES);

  useEffect(() => {
    (async () => {
      try {
        setLoadingAgents(true);
        const res = await api.get("/auth/all");
        setAgents((res.data || []).map((u) => ({ value: u.id, label: u.name || "Unnamed User" })));
      } catch {
        toast.error("Failed to load supervisors list");
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, []);

  const handlePrivilegeChange = (e: any) => {
    const { name, checked } = e.target;
    setPrivileges((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("Team name is required");
    if (!selectedSupervisor) return toast.error("Please select a supervisor");
    setSubmitting(true);
    try {
      const response = await api.post("/voice/team/create", {
        name: form.name.trim(), description: form.description.trim(),
        supervisorId: selectedSupervisor.value, supervisorPrivileges: privileges,
      });
      onSave(response.data || { ...form, id: Date.now() });
      toast.success("Team created successfully!");
      onClose();
    } catch {
      toast.error("Failed to create team. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: overlayBg, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", background: modalBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 20, border: `1px solid ${modalBorder}`, boxShadow: modalShadow, fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 18px", borderBottom: `1px solid ${headerBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={17} color={accentMain} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>Create New Team</h2>
                <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Set up a team and assign a supervisor</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: closeBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} color={textSecondary} />
            </motion.button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={sectionTitleStyle}><Users size={12} /> Basic Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Team Name *</label>
                  <input type="text" value={form.name} placeholder="e.g. Sales Team A"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                    onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Supervisor *</label>
                  <Select
                    options={agents} value={selectedSupervisor} onChange={setSelectedSupervisor}
                    styles={selectStyles} placeholder={loadingAgents ? "Loading…" : "Select supervisor"}
                    isDisabled={loadingAgents}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} value={form.description} placeholder="Brief description of this team…"
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                  onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                />
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}><ShieldCheck size={12} /> Supervisor Privileges</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.keys(privileges).map((key) => (
                  <Toggle key={key} name={key} checked={privileges[key]} onChange={handlePrivilegeChange} isDark={isDark} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px 20px", borderTop: `1px solid ${footerBorder}` }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${cancelBorder}`, background: cancelBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: submitting ? (isDark ? "#2A2A3A" : "#BBBBC8") : accentMain, color: submitting ? (isDark ? "#68687A" : "#fff") : "#fff", fontWeight: 700, fontSize: 13, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.28)") }}>
              {submitting ? "Creating…" : "Create Team"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}