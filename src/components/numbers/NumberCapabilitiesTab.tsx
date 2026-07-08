// src/components/numbers/NumberCapabilitiesTab.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { Phone, MessageSquare, Image, CheckCircle2, XCircle, Shield } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

const CAPS = [
  { key: "VOICE", label: "Voice Calls",     description: "Make and receive phone calls",           icon: Phone,          accent: "#5B5BD6" },
  { key: "SMS",   label: "SMS Messaging",   description: "Send and receive text messages",          icon: MessageSquare,  accent: "#10B981" },
  { key: "MMS",   label: "MMS Messaging",   description: "Send and receive picture messages",       icon: Image,          accent: "#F59E0B" },
];

export default function NumberCapabilitiesTab({ numberId, isDark: isDarkProp }: { numberId: string; isDark?: boolean }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted    = isDark ? "#68687A"  : "#9E9EAD";
  const textSecondary= isDark ? "#A0A0B0"  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"  : "#5B5BD6";
  const disabledBg   = isDark ? "rgba(255,255,255,0.04)" : "#FAFAFC";
  const disabledBord = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const disabledIcon = isDark ? "#3A3A4A"  : "#C4C4CF";
  const summaryBg    = isDark ? "rgba(255,255,255,0.04)" : "#F6F7F9";
  const summaryBord  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)";

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: textMuted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 18, display: "flex", alignItems: "center", gap: 7,
  };

  const [caps, setCaps]       = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/voice/numbers-list/${numberId}`)
      .then((res) => setCaps(res.data.data?.capabilities ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [numberId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={sectionTitle}><Shield size={12} /> Capabilities</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CAPS.map(({ key, label, description, icon: Icon, accent }) => {
          const enabled = caps.includes(key);
          return (
            <div key={key} style={{
              padding: "20px 18px", borderRadius: 14,
              background: enabled ? `${accent}${isDark ? "14" : "0A"}` : disabledBg,
              border: `1px solid ${enabled ? `${accent}${isDark ? "35" : "28"}` : disabledBord}`,
              transition: "all 0.15s", opacity: enabled ? 1 : (isDark ? 0.6 : 0.7),
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: enabled ? `${accent}${isDark ? "22" : "18"}` : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={enabled ? accent : disabledIcon} />
                </div>
                {enabled
                  ? <CheckCircle2 size={18} color="#10B981" />
                  : <XCircle    size={18} color={disabledIcon} />
                }
              </div>

              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: enabled ? textPrimary : textSecondary }}>{label}</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: textMuted, lineHeight: 1.4 }}>{description}</p>

              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 6,
                background: enabled ? `${accent}${isDark ? "20" : "14"}` : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                color: enabled ? accent : textMuted,
                fontWeight: 700, fontSize: 11.5, letterSpacing: "0.04em",
              }}>
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: summaryBg, border: `1px solid ${summaryBord}`, display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircle2 size={14} color={accentMain} />
        <span style={{ fontSize: 12.5, color: textSecondary }}>
          <strong style={{ color: textPrimary }}>{caps.length}</strong> of {CAPS.length} capabilities enabled on this number
        </span>
      </div>
    </div>
  );
}