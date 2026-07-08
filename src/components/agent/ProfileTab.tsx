// components/agent/ProfileTab.tsx
// @ts-nocheck
import { useState } from "react";
import { User, Mail, Phone, Loader2, Save } from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

export default function ProfileTab({ agent }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Theme Colors (Consistent with DNC) ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentHover = isDark ? "#4747C2" : "#4747C2";
  const accentLight = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";

  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardShadow = isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 1px 4px rgba(0,0,0,0.05)";

  const inputBg = isDark ? "rgba(30,30,42,0.90)" : "#FFFFFF";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const inputFocusBorder = accentMain;
  const inputFocusShadow = isDark ? "0 0 0 3px rgba(124,124,240,0.15)" : "0 0 0 3px rgba(91,91,214,0.08)";

  const secondaryBg = isDark ? "rgba(30,30,42,0.80)" : "#F6F7F9";

  const [formData, setFormData] = useState({
    name: agent?.name || "",
    email: agent?.email || "",
    phoneNumber: agent?.phoneNumber || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    setSaving(true);
    api.patch(`/voice/single/agents/${agent.id}`, {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
    })
      .then(res => {
        if (res.data.success) toast.success("Profile saved successfully");
        else toast.error(res.data.message || "Failed to save");
        setSaving(false);
      })
      .catch(() => { toast.error("Error while saving profile"); setSaving(false); });
  };

  // Reusable Field Component with Dark Mode
  const Field = ({ label, icon: Icon, name, value, onChange, type = "text", placeholder = "" }) => {
    const [focused, setFocused] = useState(false);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{
          fontSize: 12,
          fontWeight: 600,
          color: textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          {label}
        </label>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `1.5px solid ${focused ? inputFocusBorder : inputBorder}`,
          borderRadius: 12,
          background: inputBg,
          padding: "0 14px",
          transition: "border-color 0.15s",
          boxShadow: focused ? inputFocusShadow : "none",
        }}>
          <Icon
            size={15}
            color={focused ? accentMain : textMuted}
            style={{ flexShrink: 0, transition: "color 0.15s" }}
          />
          <input
            name={name}
            type={type}
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              fontWeight: 500,
              color: textPrimary,
              padding: "11px 0",
              fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 20,
      padding: 28,
      boxShadow: cardShadow,
      backdropFilter: isDark ? "blur(20px) saturate(180%)" : "none",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 800,
          color: textPrimary,
          letterSpacing: "-0.02em"
        }}>
          Profile Information
        </h2>
        <p style={{
          margin: "4px 0 0",
          fontSize: 13,
          color: textMuted
        }}>
          Update this agent's basic contact details
        </p>
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: cardBorder,
        marginBottom: 24
      }} />

      {/* Form Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 18,
        marginBottom: 28
      }}>
        <Field label="Full Name" icon={User} name="name" value={formData.name} onChange={handleChange} placeholder="Agent full name" />
        <Field label="Email" icon={Mail} name="email" value={formData.email} onChange={handleChange} placeholder="agent@example.com" type="email" />
        <Field label="Phone Number" icon={Phone} name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="+1 555 000 0000" />
      </div>

      {/* Read-only Extra Info */}
      {(agent?.sipIdentity || agent?.role) && (
        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          padding: "14px 18px",
          background: secondaryBg,
          borderRadius: 14,
          marginBottom: 24,
        }}>
          {agent?.sipIdentity && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>SIP Identity</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary }}>
                {agent.sipIdentity}
              </span>
            </div>
          )}
          {agent?.role && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>Role</span>
              <span style={{
                display: "inline-block",
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: agent.role === "ADMIN" ? "#FEF3C7" : accentLight,
                color: agent.role === "ADMIN" ? "#D97706" : accentMain,
                border: `1px solid ${agent.role === "ADMIN" ? "rgba(217,119,6,0.25)" : "rgba(124,124,240,0.25)"}`,
                borderRadius: 9999,
                padding: "3px 10px",
              }}>
                {agent.role}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: saving ? textMuted : accentMain,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "11px 22px",
          fontSize: 13.5,
          fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "background 0.15s",
          boxShadow: saving ? "none" : (isDark ? "0 4px 14px rgba(124,124,240,0.35)" : "0 4px 14px rgba(91,91,214,0.30)"),
        }}
        onMouseEnter={e => { if (!saving) e.currentTarget.style.background = accentHover; }}
        onMouseLeave={e => { if (!saving) e.currentTarget.style.background = accentMain; }}
      >
        {saving ? (
          <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
        ) : (
          <><Save size={15} /> Save Changes</>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </button>
    </div>
  );
}