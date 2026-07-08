// src/components/numbers/NumberProfileTab.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { Phone, Globe, Hash, Info, Calendar } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

function ReadField({ label, icon: Icon, value, isDark }: any) {
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase",
  };
  const readonlyStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px 10px 34px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
    background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
    fontSize: 13.5, color: isDark ? "#F0F0F5" : "#0D0D12",
    outline: "none", fontFamily: "inherit", cursor: "default",
  };
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: isDark ? "#68687A" : "#9E9EAD", pointerEvents: "none" }} />
        )}
        <input readOnly value={value ?? "—"} style={readonlyStyle} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, accent, isDark }: any) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 14px", borderRadius: 10,
      background: isDark ? "rgba(255,255,255,0.04)" : "#F6F7F9",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#68687A" : "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: accent ?? (isDark ? "#F0F0F5" : "#0D0D12") }}>{value ?? "—"}</span>
    </div>
  );
}

export default function NumberProfileTab({ numberId, isDark: isDarkProp }: { numberId: string; isDark?: boolean }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted    = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"  : "#5B5BD6";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)";

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: textMuted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 14, display: "flex", alignItems: "center", gap: 7,
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase",
  };

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/voice/numbers-list/${numberId}`)
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [numberId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  const statusStyle = data?.status === "in-use"
    ? { bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)", text: "#059669" }
    : { bg: isDark ? "rgba(107,107,123,0.15)" : "rgba(107,107,123,0.10)", text: isDark ? "#A0A0B0" : "#6B6B7B" };

  const typeStyle = data?.type === "Toll-Free"
    ? { bg: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.10)", text: "#7C3AED" }
    : { bg: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)", text: accentMain };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={sectionTitle}><Phone size={12} /> Number Profile</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ReadField label="Phone Number"  icon={Phone}  value={data?.number}  isDark={isDark} />
        <ReadField label="Country"       icon={Globe}  value={data?.country === "US" ? "United States" : data?.country ?? "—"} isDark={isDark} />
        <ReadField label="Number Type"   icon={Hash}   value={data?.type}    isDark={isDark} />
        <ReadField label="Friendly Name" icon={Info}   value={data?.friendlyName ?? data?.number} isDark={isDark} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div>
          <label style={labelStyle}>Status</label>
          <span style={{ display: "inline-block", padding: "5px 14px", borderRadius: 8, background: statusStyle.bg, color: statusStyle.text, fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "capitalize" }}>
            {data?.status ?? "unknown"}
          </span>
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <span style={{ display: "inline-block", padding: "5px 14px", borderRadius: 8, background: typeStyle.bg, color: typeStyle.text, fontWeight: 700, fontSize: 12 }}>
            {data?.type ?? "—"}
          </span>
        </div>
      </div>

      <div>
        <div style={{ ...sectionTitle, marginBottom: 12 }}><Calendar size={12} /> Purchase Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <InfoRow label="Purchased On" value={data?.purchasedOn ? new Date(data.purchasedOn).toLocaleDateString() : "—"} isDark={isDark} />
          <InfoRow label="Provider"     value="Twilio" accent={accentMain} isDark={isDark} />
          <InfoRow label="Region"       value={data?.region ?? "—"} isDark={isDark} />
          <InfoRow label="ISO Country"  value={data?.isoCountry ?? data?.country ?? "—"} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}