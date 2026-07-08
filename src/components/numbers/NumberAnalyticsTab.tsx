// src/components/numbers/NumberAnalyticsTab.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { BarChart3, TrendingUp, Phone, Activity } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

function StatCard({ label, value, icon: Icon, accent, isDark }: any) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14,
      background: `${accent}${isDark ? "14" : "0D"}`,
      border: `1px solid ${accent}${isDark ? "35" : "22"}`,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${accent}${isDark ? "22" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 11.5, fontWeight: 700, color: isDark ? "#68687A" : "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: isDark ? "#F0F0F5" : "#0D0D12", letterSpacing: "-0.4px" }}>{value}</p>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      borderRadius: 10,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.50)" : "0 8px 24px rgba(0,0,0,0.10)",
      padding: "10px 14px", fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: isDark ? "#68687A" : "#9E9EAD" }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: entry.color }}>
          {entry.name}: <span style={{ color: isDark ? "#F0F0F5" : "#0D0D12" }}>{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function NumberAnalyticsTab({ numberId, isDark: isDarkProp }: { numberId: string; isDark?: boolean }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary= isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted    = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"  : "#5B5BD6";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)";
  const chartBg      = isDark ? "rgba(23,23,31,0.95)"    : "#fff";
  const chartBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const chartGrid    = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const emptyIconBg  = isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.08)";
  const retryBg      = isDark ? "rgba(91,91,214,0.15)"   : "#5B5BD6";
  const lineColor    = isDark ? "#7C7CF0"                : "#5B5BD6";

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: textMuted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 14, display: "flex", alignItems: "center", gap: 7,
  };

  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchAnalytics = () => {
    setLoading(true); setError(null);
    api.get(`/voice/numbers-list/${numberId}`)
      .then((res) => setAnalytics(res.data.data?.analytics ?? []))
      .catch(() => { setError("Failed to load analytics"); toast.error("Could not load analytics data"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAnalytics(); }, [numberId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#E5534B", marginBottom: 12 }}>{error}</p>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={fetchAnalytics}
        style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Retry
      </motion.button>
    </div>
  );

  const hasData    = analytics.length > 0;
  const totalCalls = analytics.reduce((s, d) => s + (d.calls ?? 0), 0);
  const peakDay    = hasData ? analytics.reduce((mx, d) => (d.calls ?? 0) > (mx.calls ?? 0) ? d : mx, analytics[0]).day : "—";
  const avgCalls   = hasData ? Math.round(totalCalls / analytics.length) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionTitle}><Activity size={12} /> Call Volume · Last 7 Days</div>
        {hasData && <span style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>{analytics.length} day{analytics.length !== 1 ? "s" : ""}</span>}
      </div>

      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <StatCard label="Total Calls"   value={totalCalls} icon={Phone}     accent={accentMain} isDark={isDark} />
          <StatCard label="Peak Day"      value={peakDay}    icon={TrendingUp} accent="#10B981"   isDark={isDark} />
          <StatCard label="Avg Calls/Day" value={avgCalls}   icon={BarChart3}  accent="#F59E0B"   isDark={isDark} />
        </div>
      )}

      <div style={{ borderRadius: 14, border: `1px solid ${chartBorder}`, background: chartBg, padding: "20px 16px 12px", minHeight: 320, position: "relative" }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: textMuted, fontFamily: "Inter, sans-serif" }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: textMuted, fontFamily: "Inter, sans-serif" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={(props) => <CustomTooltip {...props} isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif", color: textSecondary, paddingTop: 10 }} />
              <Line type="monotone" dataKey="calls" name="Total Calls" stroke={lineColor} strokeWidth={2.5}
                dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 7, fill: lineColor, stroke: isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.25)", strokeWidth: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: emptyIconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={22} color={accentMain} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>No data yet</p>
            <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>Call activity will appear here once this number is in use</p>
          </div>
        )}
      </div>
    </div>
  );
}