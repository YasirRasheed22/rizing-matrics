// src/components/numbers/NumberAssignmentTab.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Edit2, X, Save, UserX, Users } from "lucide-react";
import Select from "react-select";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

function AssignModal({ current, agents, loadingAgents, onClose, onSave, onUnassign, saving, isDark }) {
  const [selected, setSelected] = useState<any>(
    current ? { value: current.id, label: current.name } : null
  );

  const textPrimary  = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary= isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted    = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg     = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const modalBg      = isDark ? "rgba(20,20,28,0.98)"      : "rgba(255,255,255,0.97)";
  const modalBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(255,255,255,0.70)";
  const modalShadow  = isDark ? "0 24px 64px rgba(0,0,0,0.70)" : "0 24px 64px rgba(0,0,0,0.18)";
  const headerBorder = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const footerBorder = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const inputBg      = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const closeBtnBg   = isDark ? "rgba(255,255,255,0.08)"   : "#F0F0F5";
  const cancelBg     = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const cancelBord   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const overlayBg    = isDark ? "rgba(0,0,0,0.75)"         : "rgba(13,13,18,0.45)";

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase",
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
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)") : "transparent",
      color: s.isSelected ? "white" : textPrimary, fontSize: 13.5, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13.5 }),
    placeholder: (p: any) => ({ ...p, color: isDark ? "#3A3A4A" : "#BBBBC8", fontSize: 13.5 }),
    indicatorSeparator: () => ({ display: "none" }),
    clearIndicator: (p: any) => ({ ...p, color: textMuted, "&:hover": { color: "#E5534B" } }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  const canSave = !saving && !!selected;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: overlayBg, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 440, background: modalBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 20, border: `1px solid ${modalBorder}`, boxShadow: modalShadow, fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 16px", borderBottom: `1px solid ${headerBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={16} color={accentMain} />
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary }}>
                {current ? "Change Assignment" : "Assign Number"}
              </p>
            </div>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: closeBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={13} color={textSecondary} />
            </motion.button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 22px" }}>
            <label style={labelStyle}>Select Agent</label>
            <Select
              options={agents} value={selected} onChange={setSelected}
              placeholder="Search or select agent…" isSearchable isClearable
              isLoading={loadingAgents} styles={selectStyles}
            />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 22px 20px", borderTop: `1px solid ${footerBorder}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose} disabled={saving}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${cancelBord}`, background: cancelBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => selected && onSave(selected)} disabled={!canSave}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 10, border: "none", background: canSave ? accentMain : (isDark ? "#2A2A3A" : "#BBBBC8"), color: canSave ? "#fff" : (isDark ? "#68687A" : "#fff"), fontWeight: 700, fontSize: 13, cursor: canSave ? "pointer" : "not-allowed", boxShadow: canSave ? (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.28)") : "none" }}>
                <Save size={13} /> {saving ? "Saving…" : "Save Assignment"}
              </motion.button>
            </div>
            {current && (
              <button onClick={onUnassign} disabled={saving}
                style={{ background: "none", border: "none", color: "#E5534B", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "center", textDecoration: "underline" }}>
                Unassign this number
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function NumberAssignmentTab({ numberId, isDark: isDarkProp }: { numberId: string; isDark?: boolean }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const spinBorder    = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.15)";
  const assignedCardBg   = isDark ? "rgba(124,124,240,0.07)"  : "rgba(91,91,214,0.04)";
  const assignedCardBord = isDark ? "rgba(124,124,240,0.20)"  : "rgba(91,91,214,0.18)";
  const unassignedBg     = isDark ? "rgba(255,255,255,0.03)"  : "#FAFAFC";
  const unassignedBord   = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.08)";
  const unassignedIconBg = isDark ? "rgba(255,255,255,0.06)"  : "rgba(0,0,0,0.05)";
  const unassignedIcon   = isDark ? "#3A3A4A"                 : "#C4C4CF";
  const assignedBadgeBg  = isDark ? "rgba(16,185,129,0.15)"   : "rgba(16,185,129,0.10)";

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: textMuted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 14, display: "flex", alignItems: "center", gap: 7,
  };

  const [number, setNumber]             = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [agents, setAgents]             = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [saving, setSaving]             = useState(false);

  const fetchNumber = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/voice/numbers-list/${numberId}`);
      setNumber(res.data.data);
    } catch { toast.error("Failed to load number details"); }
    finally { setLoading(false); }
  };

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await api.get("/auth/available");
      setAgents(res.data.filter((u: any) => u.phoneNumber === null && u.role === "AGENT").map((u: any) => ({ value: u.id, label: u.name || u.email || `User ${u.id}` })));
    } catch { toast.error("Failed to load agents"); setAgents([]); }
    finally { setLoadingAgents(false); }
  };

  useEffect(() => { fetchNumber(); }, [numberId]);

  const openModal = () => { fetchAgents(); setIsModalOpen(true); };

  const handleAssign = async (selectedAgent: any) => {
    setSaving(true);
    try {
      await api.post(`/auth/assign-number/${selectedAgent.value}`, { numberId });
      await fetchNumber(); setIsModalOpen(false);
      toast.success("Number assigned successfully");
    } catch { toast.error("Failed to assign number"); }
    finally { setSaving(false); }
  };

  const handleUnassign = async () => {
    if (!window.confirm("Are you sure you want to unassign this number?")) return;
    setSaving(true);
    try {
      await api.post("/auth/assign-number/null", { numberId });
      await fetchNumber(); setIsModalOpen(false);
      toast.success("Number unassigned");
    } catch { toast.error("Failed to unassign number"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  const assigned = number?.assignedTo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionTitle}><Users size={12} /> Assignment</div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openModal}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", boxShadow: isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.26)" }}>
          <Edit2 size={13} />
          {assigned ? "Change Agent" : "Assign Agent"}
        </motion.button>
      </div>

      <div style={{
        padding: "18px 20px", borderRadius: 14,
        background: assigned ? assignedCardBg : unassignedBg,
        border: `1px solid ${assigned ? assignedCardBord : unassignedBord}`,
      }}>
        {assigned ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, fontWeight: 800, color: accentMain }}>
              {assigned.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: textPrimary }}>{assigned.name}</p>
              {assigned.email && <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>{assigned.email}</p>}
            </div>
            <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 6, background: assignedBadgeBg, color: "#059669", fontWeight: 700, fontSize: 11.5 }}>
              Assigned
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: unassignedIconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserX size={18} color={unassignedIcon} />
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: textSecondary }}>Not assigned</p>
              <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Click "Assign Agent" to link this number to a user</p>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AssignModal
          current={assigned} agents={agents} loadingAgents={loadingAgents}
          onClose={() => setIsModalOpen(false)} onSave={handleAssign}
          onUnassign={handleUnassign} saving={saving} isDark={isDark}
        />
      )}
    </div>
  );
}