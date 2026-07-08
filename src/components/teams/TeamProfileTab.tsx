// src/components/teams/TeamProfileTab.tsx
// @ts-nocheck
import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, AtSign, Edit2, Save, X, ShieldCheck } from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

export default function TeamProfileTab({ team, onTeamUpdated }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Theme Colors ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  const inputBg = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";
  const readonlyBg = isDark ? "rgba(20,20,28,0.95)" : "#F0F0F5";

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: team.name || "",
    description: team.description || "",
  });

  const initialPrivs = team.privileges?.[0] ?? {
    viewDashboard: true,
    addMembers: true,
    listenLiveCalls: true,
    editTeamSettings: false,
    monitorPerformance: true,
    manageAgentStatus: false,
    bargeCalls: false,
  };
  const [privileges, setPrivileges] = useState(initialPrivs);

  const handlePrivilegeChange = (e: any) => {
    const { name, checked } = e.target;
    setPrivileges((prev) => ({ ...prev, [name]: checked }));
  };

  const resetForm = () => {
    setFormData({ name: team.name, description: team.description });
    setPrivileges(initialPrivs);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Team name is required");
    setSaving(true);
    try {
      const res = await api.patch(`/voice/team/${team.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        supervisorPrivileges: privileges,
      });
      if (res.data.success) {
        toast.success("Team updated successfully");
        setIsEditing(false);
        onTeamUpdated();
      } else {
        throw new Error(res.data.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const statusColor = team.status === "active"
    ? { bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)", text: "#059669" }
    : { bg: isDark ? "rgba(107,107,123,0.15)" : "rgba(107,107,123,0.10)", text: textMuted };

  /* ── Reusable Components ── */
  function Toggle({ name, checked, disabled, onChange }: any) {
    return (
      <label style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "10px 14px",
        borderRadius: 10,
        background: checked 
          ? (isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.05)") 
          : inputBg,
        border: `1px solid ${checked 
          ? (isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.20)") 
          : cardBorder}`,
        opacity: disabled && !checked ? 0.6 : 1,
        transition: "all 0.15s",
      }}>
        <span style={{ 
          fontSize: 13, 
          color: textPrimary, 
          fontWeight: 500 
        }}>
          {PRIVILEGE_LABELS[name] ?? name}
        </span>
        <div
          onClick={() => !disabled && onChange({ target: { name, checked: !checked } })}
          style={{
            position: "relative",
            width: 36,
            height: 20,
            borderRadius: 10,
            background: checked ? accentMain : (isDark ? "#4A4A5A" : "#D5D5E0"),
            transition: "background 0.2s",
            flexShrink: 0,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <div style={{
            position: "absolute",
            top: 3,
            left: checked ? 18 : 3,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
            transition: "left 0.2s",
          }} />
        </div>
      </label>
    );
  }

  function Field({ label, icon: Icon, children }: any) {
    return (
      <div>
        <label style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 700,
          color: textMuted,
          marginBottom: 6,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}>
          {label}
        </label>
        <div style={{ position: "relative" }}>
          {Icon && (
            <Icon 
              size={14} 
              style={{ 
                position: "absolute", 
                left: 12, 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: textMuted, 
                pointerEvents: "none", 
                zIndex: 1 
              }} 
            />
          )}
          {React.cloneElement(children, {
            style: { 
              width: "100%", 
              boxSizing: "border-box",
              padding: Icon ? "10px 13px 10px 34px" : "10px 13px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: children.props.readOnly ? readonlyBg : inputBg,
              fontSize: 13.5,
              color: children.props.readOnly ? textMuted : textPrimary,
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
              ...(children.props.style || {})
            },
            onFocus: (e: any) => { 
              if (!e.target.readOnly) e.target.style.borderColor = accentMain; 
            },
            onBlur: (e: any) => { 
              e.target.style.borderColor = cardBorder; 
            },
          })}
        </div>
      </div>
    );
  }

  /* ─── privilege labels ───────────────────────────────── */
  const PRIVILEGE_LABELS: Record<string, string> = {
    viewDashboard: "View Dashboard",
    addMembers: "Add / Remove Members",
    listenLiveCalls: "Listen to Live Calls",
    editTeamSettings: "Edit Team Settings",
    monitorPerformance: "Monitor Performance",
    manageAgentStatus: "Manage Agent Status",
    bargeCalls: "Barge Calls",
    canListenRecording: "Listen Agent Recordings",
    canAddLead: "Can mark agent lead",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, color: textPrimary }}>

      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}>
          <User size={12} /> Team Information
        </div>

        {!isEditing ? (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setIsEditing(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 9,
              border: `1px solid ${isDark ? "rgba(124,124,240,0.30)" : "rgba(91,91,214,0.25)"}`,
              background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.07)",
              color: accentMain,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer"
            }}
          >
            <Edit2 size={13} /> Edit
          </motion.button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={resetForm}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 9,
                border: `1px solid ${cardBorder}`,
                background: inputBg,
                color: textMuted,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: "pointer"
              }}
            >
              <X size={13} /> Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 9,
                border: "none",
                background: saving ? textMuted : accentMain,
                color: "#fff",
                fontWeight: 700,
                fontSize: 12.5,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.26)"),
              }}
            >
              <Save size={13} /> {saving ? "Saving…" : "Save Changes"}
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Fields ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Team Name *" icon={User}>
          <input
            type="text"
            name="name"
            value={formData.name}
            readOnly={!isEditing}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>

        <Field label="Supervisor" icon={AtSign}>
          <input type="text" value={team.supervisor?.name || "Not assigned"} readOnly />
        </Field>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{
            display: "block",
            fontSize: 11.5,
            fontWeight: 700,
            color: textMuted,
            marginBottom: 6,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            readOnly={!isEditing}
            onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 13px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: isEditing ? inputBg : readonlyBg,
              color: isEditing ? textPrimary : textMuted,
              resize: "vertical",
              lineHeight: 1.6,
              fontSize: 13.5,
            }}
            onFocus={(e) => { if (isEditing) e.target.style.borderColor = accentMain; }}
            onBlur={(e) => { e.target.style.borderColor = cardBorder; }}
          />
        </div>
      </div>

      {/* ── Status ── */}
      <div>
        <div style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}>
          Status
        </div>
        <span style={{
          display: "inline-block",
          padding: "5px 14px",
          borderRadius: 8,
          background: statusColor.bg,
          color: statusColor.text,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }}>
          {team.status || "unknown"}
        </span>
      </div>

      {/* ── Privileges ── */}
      <div>
        <div style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: textMuted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}>
          <ShieldCheck size={12} /> Supervisor Privileges
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.keys(privileges).map((key) => (
            <Toggle
              key={key}
              name={key}
              checked={privileges[key]}
              disabled={!isEditing}
              onChange={handlePrivilegeChange}
            />
          ))}
        </div>
        {!isEditing && (
          <p style={{ marginTop: 10, fontSize: 12, color: textMuted }}>
            Click Edit to modify privileges
          </p>
        )}
      </div>
    </div>
  );
}