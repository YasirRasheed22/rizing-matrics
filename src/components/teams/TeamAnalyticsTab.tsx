// src/components/teams/TeamAnalyticsTab.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

/* ─── Stat Card ──────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";

  return (
    <div style={{
      padding: "16px 18px",
      borderRadius: 14,
      background: isDark ? "rgba(30,30,42,0.90)" : `${accent}0D`,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : `${accent}22`}`,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: isDark ? `${accent}25` : `${accent}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <p style={{
          margin: "0 0 2px",
          fontSize: 11.5,
          fontWeight: 700,
          color: textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          {label}
        </p>
        <p style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: textPrimary,
          letterSpacing: "-0.4px"
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: isDark ? "rgba(20,20,28,0.98)" : "#fff",
      borderRadius: 10,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.40)" : "0 8px 24px rgba(0,0,0,0.10)",
      padding: "10px 14px",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: isDark ? "#F0F0F5" : "#0D0D12"
    }}>
      <p style={{
        margin: "0 0 6px",
        fontSize: 12,
        fontWeight: 700,
        color: isDark ? "#68687A" : "#9E9EAD"
      }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{
          margin: 0,
          fontSize: 13.5,
          fontWeight: 700,
          color: entry.color
        }}>
          {entry.name}: <span style={{ color: isDark ? "#F0F0F5" : "#0D0D12" }}>{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

const sectionTitleStyle = (textMuted: string) => ({
  fontSize: 11.5,
  fontWeight: 800,
  color: textMuted,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 7,
});

/* ─── Main Component ─────────────────────────────────── */
export default function TeamAnalyticsTab({ team }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/voice/team/${team.id}/analytics`, { params: { period: "7" } });
      if (res.data.success) {
        const analytics = res.data.data || [];
        setChartData(analytics.map((item) => ({
          day: new Date(item.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          calls: item.calls || 0,
        })));
      } else {
        throw new Error(res.data.message || "Failed to load analytics");
      }
    } catch (err) {
      setError("Failed to load team analytics");
      toast.error("Could not load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [team?.id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
          borderTopColor: accentMain,
          animation: "spin 0.7s linear infinite"
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#E5534B", marginBottom: 6 }}>{error}</p>
        <motion.button
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.97 }}
          onClick={fetchAnalytics}
          style={{
            padding: "8px 20px",
            borderRadius: 9,
            border: "none",
            background: accentMain,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer"
          }}
        >
          Retry
        </motion.button>
      </div>
    );
  }

  const hasData = chartData.length > 0;
  const totalCalls = chartData.reduce((s, d) => s + d.calls, 0);
  const peakDay = hasData ? chartData.reduce((mx, d) => d.calls > mx.calls ? d : mx, chartData[0]).day : "—";
  const avgCalls = hasData ? Math.round(totalCalls / chartData.length) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, color: textPrimary }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionTitleStyle(textMuted)}>
          <BarChart3 size={12} /> Team Performance Analytics
        </div>
        <span style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>
          Last {hasData ? chartData.length : 0} days
        </span>
      </div>

      {/* Stat Cards */}
      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <StatCard label="Total Calls" value={totalCalls} icon={BarChart3} accent="#5B5BD6" />
          <StatCard label="Peak Day" value={peakDay} icon={TrendingUp} accent="#10B981" />
          <StatCard label="Avg Calls/Day" value={avgCalls} icon={Calendar} accent="#F59E0B" />
        </div>
      )}

      {/* Chart Container */}
      <div style={{
        borderRadius: 14,
        border: `1px solid ${cardBorder}`,
        background: cardBg,
        padding: "20px 16px 12px",
        minHeight: 340,
        position: "relative",
      }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"} 
                vertical={false} 
              />
              <XAxis
                dataKey="day"
                tick={{ 
                  fontSize: 11, 
                  fill: textMuted, 
                  fontFamily: "Inter, sans-serif" 
                }}
                axisLine={false} 
                tickLine={false}
                angle={-30} 
                textAnchor="end" 
                height={50}
              />
              <YAxis
                tick={{ 
                  fontSize: 11, 
                  fill: textMuted, 
                  fontFamily: "Inter, sans-serif" 
                }}
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ 
                  fontSize: 12, 
                  fontFamily: "Inter, sans-serif", 
                  color: textMuted, 
                  paddingTop: 10 
                }}
              />
              <Line
                type="monotone"
                dataKey="calls"
                name="Total Calls"
                stroke={accentMain}
                strokeWidth={2.5}
                dot={{ r: 4, fill: accentMain, strokeWidth: 0 }}
                activeDot={{ 
                  r: 7, 
                  fill: accentMain, 
                  stroke: isDark ? "rgba(124,124,240,0.4)" : "rgba(91,91,214,0.25)", 
                  strokeWidth: 6 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <BarChart3 size={22} color={accentMain} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>No analytics data yet</p>
            <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
              Calls will appear here once agents start handling them
            </p>
          </div>
        )}
      </div>
    </div>
  );
}