// src/pages/admin/AgentDetailPage.tsx
// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, ListTree, Key, ArrowLeft, Loader2 } from "lucide-react";
import ProfileTab from "../../components/agent/ProfileTab";
import CallLogsTab from "../../components/agent/CallLogsTab";
import PermissionsTab from "../../components/agent/PermissionsTab";
import api from "../../api";
import { Toaster } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

export default function AgentDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  /* ── Theme Colors (Same as DNC) ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentLight = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)";

  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardShadow = isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 1px 4px rgba(0,0,0,0.06)";

  const bgLight = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";

  /* ── Avatar Palette ── */
  const PALETTES = [
    { bg: "#EDEDFB", fg: "#5B5BD6" }, { bg: "#DCFCE7", fg: "#16A34A" },
    { bg: "#FEF3C7", fg: "#D97706" }, { bg: "#FCE7F3", fg: "#DB2777" },
    { bg: "#DBEAFE", fg: "#2563EB" }, { bg: "#FFE4E6", fg: "#E11D48" },
  ];

  function pal(name = "") {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTES.length;
    return PALETTES[h];
  }

  useEffect(() => {
    api.get(`/voice/single/agents/${id}`)
      .then(res => {
        if (res.data.success) setData(res.data);
        else setError(res.data.message);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const agent = data?.agent;
  const { bg: avBg, fg: avFg } = pal(agent?.name || "");

  const renderTab = () => {
    switch (activeTab) {
      case "profile": return <ProfileTab agent={agent} />;
      case "callLogs": return <CallLogsTab callStats={data?.callStats} callLogs={data?.callLogs} agentId={id} />;
      case "permissions": return <PermissionsTab agentId={id} initialPrivileges={agent?.agentPrivilege || null} initialSmtp={agent?.agentSmtp || null} additionalRole={agent?.additionalRole || null} />;
      default: return null;
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      fontFamily: "'Inter',sans-serif",
      color: textMuted
    }}>
      <Loader2 size={28} color={accentMain} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>Loading agent…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter',sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>Failed to load agent</p>
        <p style={{ fontSize: 13, color: textMuted, marginTop: 6 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      padding: "24px",
      maxWidth: 1100,
      margin: "0 auto",
      color: textPrimary
    }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin/agents")}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: textMuted, flexShrink: 0,
            boxShadow: cardShadow,
            transition: "all 0.14s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = bgLight; e.currentTarget.style.color = textPrimary; }}
          onMouseLeave={e => { e.currentTarget.style.background = cardBg; e.currentTarget.style.color = textMuted; }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: avBg,
          border: `2px solid ${avFg}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, color: avFg, flexShrink: 0,
        }}>
          {(agent?.name?.[0] || "?").toUpperCase()}
        </div>

        {/* Title */}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.03em" }}>
            {agent?.name || "Agent"}
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: textMuted }}>
            {agent?.email || ""} {agent?.sipIdentity ? `· ${agent.sipIdentity}` : ""}
          </p>
        </div>

        {/* Role Badge */}
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
            background: agent?.role === "ADMIN" ? "#FEF3C7" : accentLight,
            color: agent?.role === "ADMIN" ? "#D97706" : accentMain,
            border: `1px solid ${agent?.role === "ADMIN" ? "rgba(217,119,6,0.25)" : "rgba(124,124,240,0.25)"}`,
            borderRadius: 9999, padding: "4px 12px",
          }}>
            {agent?.role || "AGENT"}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 4,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 16,
        padding: 5,
        marginBottom: 20,
        boxShadow: cardShadow,
      }}>
        {[
          { key: "profile", label: "Profile", icon: User },
          { key: "callLogs", label: "Call Logs", icon: ListTree },
          { key: "permissions", label: "Permissions", icon: Key },
        ].map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: active ? accentMain : "transparent",
                color: active ? "#fff" : textMuted,
                fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                boxShadow: active ? `0 3px 12px ${isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.28)"}` : "none",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {data && renderTab()}

      {/* <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            fontFamily: "'Inter',sans-serif", 
            borderRadius: 12, 
            fontSize: 13.5 
          } 
        }} 
      /> */}
    </div>
  );
}