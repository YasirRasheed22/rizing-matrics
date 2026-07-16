// src/pages/admin/BillingAgentView.tsx
// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════
// AGENT BILLING VIEW — additionalRole.manageBilling === true walon
// ke liye. ⚠️ Platform fee YAHAN kahin nahi dikhti — amounts pehle
// hi fee-inclusive totals hain. Koi detail modal / click nahi.
//   • Filters: Today / Yesterday / This Week / This Month / Custom
//   • KPI tiles: Total, Voice, SMS/MMS, Voicemail, Recording
//   • Table: Date, Call SID, From, To, Direction, Duration, Amount
// ═══════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback, useRef } from "react";
import { io as socketIO } from "socket.io-client";
import {
  Wallet, Phone, MessageSquare, Mic, RefreshCw, DollarSign,
  PhoneIncoming, PhoneOutgoing, Voicemail as VoicemailIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

const API_URL = "https://api.rizingmatrics.com";

const FILTERS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const fmt = (n: number | null | undefined, digits = 4) =>
  `$${Number(n || 0).toFixed(digits)}`;
const fmt2 = (n: number | null | undefined) => fmt(n, 2);

const fmtDuration = (sec: number) => {
  const s = Number(sec || 0);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function BillingAgentView() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const cardBg = isDark ? "rgba(23,23,31,0.92)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const card: React.CSSProperties = {
    background: cardBg,
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.40)" : "0 4px 24px rgba(0,0,0,0.07)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: 20,
  };

  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [totals, setTotals] = useState<any>({});
  const [calls, setCalls] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);

  const periodQuery = useCallback(() => {
    let q = `period=${period}`;
    if (period === "custom" && customStart && customEnd) {
      q += `&startDate=${customStart}&endDate=${customEnd}`;
    }
    return q;
  }, [period, customStart, customEnd]);

  const loadOverview = useCallback(async () => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      const res = await api.get(`/billing/agent/overview?${periodQuery()}`);
      setTotals(res.data?.totals || {});
    } catch (err) {
      console.error("Agent billing overview failed:", err);
    } finally {
      setLoading(false);
    }
  }, [periodQuery, period, customStart, customEnd]);

  const loadCalls = useCallback(async () => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    try {
      const res = await api.get(`/billing/agent/calls?${periodQuery()}&page=${page}&limit=25`);
      setCalls(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Agent billing calls failed:", err);
    }
  }, [periodQuery, page, period, customStart, customEnd]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadCalls(); }, [loadCalls]);

  // Real-time refresh (event ke fields display nahi hote — sirf reload trigger)
  useEffect(() => {
    if (!token) return;
    const socket = socketIO(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    socketRef.current = socket;
    socket.on("billing-update", () => {
      loadOverview();
      loadCalls();
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, loadOverview, loadCalls]);

  const Tile = ({ icon: Icon, label, value, color }: any) => (
    <div style={{ ...card, flex: 1, minWidth: 170 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `${color}18`, color,
        }}>
          <Icon size={17} />
        </div>
        <span style={{ fontSize: 12.5, color: textSecondary, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary }}>{value}</div>
    </div>
  );

  const DirectionBadge = ({ d }: { d: string }) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      outbound: { label: "Outbound", color: "#5B5BD6", icon: PhoneOutgoing },
      inbound: { label: "Inbound", color: "#17A363", icon: PhoneIncoming },
      voicemail: { label: "Voicemail", color: "#0E7490", icon: VoicemailIcon },
    };
    const cfg = map[d] || { label: d || "—", color: textSecondary, icon: Phone };
    const Icon = cfg.icon;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
        background: `${cfg.color}18`, color: cfg.color,
      }}>
        <Icon size={11} /> {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header + filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Billing
          </h1>
          <div style={{ fontSize: 13, color: textSecondary, marginTop: 4 }}>
            Usage &amp; call charges
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setPeriod(f.value); setPage(1); }}
              style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                border: `1px solid ${period === f.value ? "#5B5BD6" : cardBorder}`,
                background: period === f.value ? "#5B5BD618" : cardBg,
                color: period === f.value ? "#5B5BD6" : textSecondary,
              }}
            >
              {f.label}
            </button>
          ))}
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                style={{
                  padding: "6px 10px", borderRadius: 10, fontSize: 12.5,
                  border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary,
                }}
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                style={{
                  padding: "6px 10px", borderRadius: 10, fontSize: 12.5,
                  border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary,
                }}
              />
            </>
          )}
          <button
            onClick={() => { loadOverview(); loadCalls(); }}
            style={{
              padding: "7px 10px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${cardBorder}`, background: cardBg, color: textSecondary,
            }}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Tile icon={DollarSign} label="Total Spend" color="#DC2626"
              value={fmt2(totals.totalSpend)} />
        <Tile icon={Phone} label={`Voice (${totals.callCount || 0} calls, ${totals.totalMinutes || 0} min)`} color="#5B5BD6"
              value={fmt2(totals.voiceSpend)} />
        <Tile icon={MessageSquare} label={`SMS/MMS (${totals.smsCount || 0})`} color="#D38A00"
              value={fmt2(totals.smsSpend)} />
        <Tile icon={VoicemailIcon} label={`Voicemail (${totals.voicemailCount || 0})`} color="#0E7490"
              value={fmt2(totals.voicemailSpend)} />
        <Tile icon={Mic} label="Recording" color="#A21CAF"
              value={fmt2(totals.recordingSpend)} />
      </div>

      {/* ── Calls table ── */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 12 }}>
          Calls ({total})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ color: textSecondary, textAlign: "left" }}>
                {["Date", "Call SID", "From", "To", "Direction", "Duration", "Amount"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} style={{ color: textPrimary }}>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap", borderBottom: `1px solid ${gridColor}` }}>
                    {new Date(c.date).toLocaleString()}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, color: textSecondary, fontFamily: "monospace", fontSize: 11.5, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.callSid || "—"}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>{c.from}</td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>{c.to}</td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}` }}>
                    <DirectionBadge d={c.direction} />
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                    {fmtDuration(c.durationSeconds)}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 700, color: "#DC2626" }}>
                    {fmt(c.amount)}
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: "center", color: textSecondary }}>
                    {period === "custom" && (!customStart || !customEnd)
                      ? "Custom range ke liye dono dates select karein."
                      : "No calls in this period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12.5, color: textSecondary, alignSelf: "center" }}>
            Page {page} of {Math.max(Math.ceil(total / 25), 1)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 25)}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: page >= Math.ceil(total / 25) ? "not-allowed" : "pointer", opacity: page >= Math.ceil(total / 25) ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
