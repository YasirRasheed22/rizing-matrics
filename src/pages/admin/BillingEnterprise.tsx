// src/pages/admin/BillingEnterprise.tsx
// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE BILLING DASHBOARD
//  • Real Twilio (dono legs) + Commio + Recording costs
//  • Platform fee (margin) revenue — .env DIALER_MARGIN_PERCENT
//  • Real-time socket updates ("billing-update") — koi refresh nahi
//  • Charts: daily spend (stacked), category split, carrier split
// ═══════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { io as socketIO } from "socket.io-client";
import {
  Wallet, Phone, MessageSquare, Mic, RefreshCw,
  TrendingUp, TrendingDown, Radio, Activity, DollarSign, Zap,
  PhoneIncoming, PhoneOutgoing, Users, Download, Voicemail, Hash, Database,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import toast from "react-hot-toast";
import BillingAgentView from "./BillingAgentView";

const API_URL = "https://api.ringnex.co";

// Monthly filter — current month + previous 11 months
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function buildMonthPeriods() {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = i === 0
      ? `This Month (${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()})`
      : `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    out.push({ value, label });
  }
  return out;
}
const PERIODS = buildMonthPeriods();
const CURRENT_MONTH = PERIODS[0].value;

const CAT_COLORS = {
  voice: "#5B5BD6",
  sms: "#D38A00",
  recording: "#A21CAF",
  fees: "#17A363",
  transcription: "#0369A1",
  voicemail: "#0E7490",
};

const TX_LABEL: Record<string, string> = {
  debit_call: "Call",
  debit_voicemail: "Voicemail",
  debit_recording: "Recording",
  debit_transcription: "Transcription",
  debit_sms: "SMS",
  debit_mms: "MMS",
  debit_platform_fee: "Service charge",
  debit_adjustment: "Correction (charge)",
  credit_adjustment: "Correction (refund)",
  credit_topup: "Top-up",
  credit_free: "Free Credit",
  credit_manual: "Manual Credit",
  credit_refund: "Refund",
};

const fmt = (n: number | null | undefined, digits = 4) =>
  `$${Number(n || 0).toFixed(digits)}`;
const fmt2 = (n: number | null | undefined) => fmt(n, 2);
const fmtDuration = (secs: number | null | undefined) => {
  const s = Math.max(0, Math.round(Number(secs || 0)));
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
};
// SIP/client endpoint ko readable banao: sip:+1757...@x → +1757..., client:x → "Agent (app)"
const prettyEndpoint = (raw: any) => {
  const v = String(raw || "").trim();
  if (!v) return "—";
  const sip = v.match(/(?:sip:)?\+?(\d{6,15})@/);
  if (sip) return "+" + sip[1];
  if (v.startsWith("client:")) return "Agent (app)";
  return v;
};

export default function BillingEnterprise() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isAdmin = user?.role === "ADMIN";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const cardBg = isDark ? "rgba(23,23,31,0.92)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const card: React.CSSProperties = {
    background: cardBg,
    borderRadius: 14,
    border: `1px solid ${cardBorder}`,
    boxShadow: isDark
      ? "0 1px 2px rgba(0,0,0,0.24)"
      : "0 1px 2px rgba(0,0,0,0.04)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: 20,
  };

  const [period, setPeriod] = useState(CURRENT_MONTH);
  const [overview, setOverview] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txType, setTxType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [liveDot, setLiveDot] = useState(false);
  const socketRef = useRef<any>(null);
  const [rateLookupNumber, setRateLookupNumber] = useState("");
  const [rateLookupResult, setRateLookupResult] = useState<any>(null);
  const [rateLookupLoading, setRateLookupLoading] = useState(false);

  // ── Transaction detail modal ──
  const [detailTx, setDetailTx] = useState<any>(null);
  const [detailLive, setDetailLive] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (t: any) => {
    setDetailTx(t);
    setDetailLive(null);
    // Call/voicemail row jiske paas stored legs nahi — live breakdown fetch karo
    const isCallLike = ["debit_call", "debit_voicemail"].includes(t.type);
    if (isCallLike && t.callSid && !(t.meta && t.meta.legs)) {
      setDetailLoading(true);
      try {
        const res = await api.get(`/billing/call/${encodeURIComponent(t.callSid)}`);
        setDetailLive(res.data?.live || null);
      } catch (err) {
        console.error("Detail live fetch failed:", err);
      } finally {
        setDetailLoading(false);
      }
    }
  }, []);

  const lookupRate = useCallback(async () => {
    const num = rateLookupNumber.trim();
    if (!num.startsWith("+")) {
      setRateLookupResult({ error: "E.164 format required (+1...)" });
      return;
    }
    setRateLookupLoading(true);
    try {
      const res = await api.get(`/billing/rate/${encodeURIComponent(num)}`);
      setRateLookupResult(res.data);
    } catch (err: any) {
      setRateLookupResult({ error: err?.response?.data?.message || "Rate lookup failed" });
    } finally {
      setRateLookupLoading(false);
    }
  }, [rateLookupNumber]);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return; // agent view apne endpoints use karta hai
    setLoading(true);
    try {
      const [ov, ts, cfg] = await Promise.all([
        api.get(`/billing/overview?period=${period}`),
        api.get(`/billing/timeseries?period=${period}`),
        api.get(`/billing/config`),
      ]);
      setOverview(ov.data);
      setSeries(ts.data?.series || []);
      setPricingConfig(cfg.data?.config || null);
    } catch (err) {
      console.error("Billing dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Ledger ab seedha Twilio se (calls/sms/voicemail) — live-logs endpoint
  const [txLoading, setTxLoading] = useState(false);
  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    setTxLoading(true);
    try {
      const res = await api.get(
        `/billing/live-logs?period=${period}&page=${txPage}&limit=25&type=${txType}`
      );
      setTransactions(res.data?.data || []);
      setTxTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Billing live-logs load failed:", err);
    } finally {
      setTxLoading(false);
    }
  }, [period, txPage, txType]);

  // ── Provider Cost & Margin (ground-truth: Twilio + Commio APIs) ──
  const [providerCosts, setProviderCosts] = useState<any>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const loadProviderCosts = useCallback(async () => {
    if (!isAdmin) return;
    setProviderLoading(true);
    try {
      const res = await api.get(`/billing/provider-costs?period=${period}`);
      setProviderCosts(res.data || null);
    } catch (err) {
      console.error("Provider costs load failed:", err);
      setProviderCosts(null);
    } finally {
      setProviderLoading(false);
    }
  }, [period]);
  useEffect(() => { loadProviderCosts(); }, [loadProviderCosts]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // ── Excel export — SAARA data (sab pages) .xlsx mein ──
  const [exporting, setExporting] = useState(false);
  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.get(`/billing/live-logs?period=${period}&type=${txType}&page=1&limit=20000`);
      const rows = res.data?.data || [];
      const sheetRows = rows.map((t: any) => {
        const e = t.enrich || {};
        const d = new Date(t.createdAt);
        return {
          Date: d.toLocaleDateString(),
          Time: d.toLocaleTimeString(),
          Type: TX_LABEL[t.type] || t.type,
          Direction: e.direction || "—",
          From: e.from || "—",
          "From Agent": e.fromAgentName || "",
          To: e.to || "—",
          "To Agent": e.toAgentName || "",
          Agent: e.agentName || "",
          "Duration (s)": e.durationSeconds ?? "",
          Carrier: t.carrier || "",
          "Amount ($)": Number(t.amount || 0).toFixed(4),
          "Balance After ($)": Number(t.balanceAfter || 0).toFixed(2),
          Recording: e.hasRecording ? "Yes" : "No",
          Conference: e.conferenceName || "",
          Participants: (e.participants || []).map((p: any) => `${p.from} → ${p.to}`).join(" | "),
          "Call SID": t.callSid || t.messageId || "",
          Description: t.description || "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, `billing-transactions-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Export failed — please try again");
    } finally {
      setExporting(false);
    }
  }, [period, txType]);

  // ── Real-time: billing-update socket ─────────────────────────────
  useEffect(() => {
    if (!token || !isAdmin) return;
    const socket = socketIO(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    socketRef.current = socket;

    socket.on("billing-update", (evt: any) => {
      setLiveDot(true);
      setTimeout(() => setLiveDot(false), 1500);
      setLiveEvents((prev) => [evt, ...prev].slice(0, 8));
      // KPIs + charts + ledger refresh (lightweight endpoints)
      loadAll();
      loadTransactions();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, loadAll, loadTransactions]);

  const totals = overview?.totals || {};

  // Calls billing mode — .env-only (BILLING_MODE), no admin toggle. "lumpsum"
  // = flat per-minute rate (calls only), same in/outbound, no margin.
  const isLumpsum = pricingConfig?.billingMode === "lumpsum";

  const inc = overview?.inclusive || {};
  const usage = overview?.twilioUsage || null;
  // Provider (Twilio/Commio) raw costs par margin baat kar (baked) do —
  // admin ko alag margin nahi dikhta, sab cost margin-inclusive.
  const marginFactor = 1 + (Number(overview?.marginPercent ?? providerCosts?.marginPercent ?? 0) / 100);
  const withMargin = (n: any) => Number(n || 0) * marginFactor;

  const pieData = useMemo(
    () =>
      [
        { name: "Outbound", value: inc.outbound || 0, color: CAT_COLORS.voice },
        { name: "Inbound", value: inc.inbound || 0, color: "#0369A1" },
        { name: "SMS/MMS", value: inc.sms || 0, color: CAT_COLORS.sms },
        { name: "Voicemail", value: inc.voicemail || 0, color: CAT_COLORS.voicemail },
        { name: "Recording", value: inc.recording || 0, color: CAT_COLORS.recording },
      ].filter((d) => d.value > 0),
    [inc]
  );

  const carrierLabel = (carrier: string) =>
    carrier === "commio"
      ? "Commio (BYOC)"
      : carrier === "twilio-pstn-fallback"
      ? "Twilio (PSTN Fallback)"
      : carrier;

  const carrierData = useMemo(
    () =>
      (overview?.carrierSplit || []).map((c: any) => ({
        name: carrierLabel(c.carrier),
        spend: Math.round((c.spend || 0) * 10000) / 10000,
        twilio: Math.round((c.twilioCost || 0) * 10000) / 10000,
        commio: Math.round((c.commioCost || 0) * 10000) / 10000,
        calls: c.calls,
      })),
    [overview]
  );

  // ── Flat minimal stat cell (secondary metrics) — icon chip + label/value,
  // hairline border, no gradients/top-accent-bars; border tints on hover. ──
  const Kpi = ({ icon: Icon, label, value, change, color }: any) => (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 15px",
        borderRadius: 12,
        border: `1px solid ${cardBorder}`,
        background: cardBg,
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}50`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: `${color}16`, color,
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 10.5, color: textSecondary, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.04em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </div>
        <div style={{ fontSize: 19, fontWeight: 750 as any, color: textPrimary, marginTop: 2, letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        {change !== undefined && (
          <div style={{
            fontSize: 11, fontWeight: 600, marginTop: 2, display: "flex",
            alignItems: "center", gap: 3,
            color: change >= 0 ? "#DC2626" : "#17A363",
          }}>
            {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );

  // ── Spotlight hero card — the single most important number on the page ──
  const HeroStat = ({ label, value, caption, icon: Icon, color }: any) => (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${cardBorder}`,
      background: cardBg,
      padding: "20px 22px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: textPrimary, marginTop: 6, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        {caption && (
          <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 6 }}>
            {caption}
          </div>
        )}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: `${color}16`, color,
      }}>
        <Icon size={20} />
      </div>
    </div>
  );

  // ── Role gate ──
  // ADMIN → full enterprise dashboard (fee/margin sab visible)
  // manageBilling agent → simplified view (fee INVISIBLE, no detail modal)
  if (user?.role !== "ADMIN") {
    if (user?.additionalRole?.manageBilling === true) {
      return <BillingAgentView />;
    }
    return (
      <div style={{ padding: 40, color: textPrimary, fontFamily: "'Inter', sans-serif" }}>
        Admin access required.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, fontFamily: "'Inter', sans-serif", letterSpacing: "-0.3px" }}>
            Enterprise Billing
          </h1>
          <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: liveDot ? "#17A363" : textSecondary,
              transition: "background 0.3s",
              boxShadow: liveDot ? "0 0 6px #17A363" : "none",
            }} />
            Real-time — Twilio (both legs) + SIP + Recording, all-inclusive
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setTxPage(1); }}
            style={{
              padding: "7px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary,
              outline: "none",
            }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={() => { loadAll(); loadTransactions(); loadProviderCosts(); }}
            style={{
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 9, cursor: "pointer",
              border: `1px solid ${cardBorder}`, background: cardBg, color: textSecondary,
            }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Cost overview — spotlight Total Cost + flat secondary stat grid ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <HeroStat
          icon={DollarSign} color="#5B5BD6" label="Total Cost"
          value={
            // providerCosts.totalToBill is the correctly-composed sum in BOTH
            // modes (lumpsum calls + phone numbers + recording storage +
            // conference, or realtime cost+margin) — totals.totalSpend (wallet
            // ledger) is ONLY a fallback for before providerCosts has loaded,
            // since it structurally can't include phone numbers/storage/conference
            // (those never become wallet transactions).
            providerCosts ? fmt2(providerCosts.totalToBill) : (providerLoading ? "…" : fmt2(totals.totalSpend))
          }
          caption={
            isLumpsum
              ? `Flat rate — ${fmt(pricingConfig?.callRatePerMinute, 4)}/min per call (same in/outbound)`
              : "Twilio (both legs) + SIP + Recording + Conference — all-inclusive"
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
          <Kpi icon={PhoneOutgoing} label={`Outbound · ${inc.outboundCalls || 0} calls`} color={CAT_COLORS.voice}
               value={fmt2(inc.outbound)} />
          <Kpi icon={PhoneIncoming} label={`Inbound · ${inc.inboundCalls || 0} calls`} color="#0369A1"
               value={fmt2(inc.inbound)} />
          <Kpi icon={MessageSquare} label={`SMS/MMS · ${totals.smsCount || 0}`} color={CAT_COLORS.sms}
               value={fmt2(inc.sms)} />
          <Kpi icon={Voicemail} label={`Voicemail · ${totals.voicemailCount || 0}`} color={CAT_COLORS.voicemail}
               value={fmt2(inc.voicemail)} />
          <Kpi icon={Mic} label="Recording" color={CAT_COLORS.recording}
               value={fmt2(inc.recording)} />
          <Kpi icon={Users} label={`Conference · ${inc.conferenceCallsCount || 0}`} color="#7C3AED"
               value={fmt2(inc.conferenceCalls)} />
          {/* Phone numbers billed at cost (no margin) */}
          <Kpi icon={Hash} label="Phone Numbers" color="#0E7490"
               value={usage ? fmt2(usage.phoneNumbers) : "…"} />
          <Kpi icon={Database} label="Recording Storage" color="#A21CAF"
               value={usage ? fmt2(withMargin(usage.recordingStorage)) : "…"} />
          {usage && usage.conference > 0 && (
            <Kpi icon={Users} label="Conference (usage)" color="#7C3AED"
                 value={fmt2(withMargin(usage.conference))} />
          )}
          {/* SIP carrier (Commio) cost. Realtime: margin-inclusive (it's part
              of what's billed). Lumpsum: RAW actual cost, no margin — this is
              informational only (your own expense reference) since calls are
              billed at a flat rate that already covers it — NOT part of the
              Total Cost hero, showing it margin-inflated here would misrepresent
              it as a billed line item. */}
          <Kpi
            icon={Radio}
            label={
              providerCosts?.commio?.available
                ? `SIP · ${providerCosts.commio.callCount ?? 0} calls · ${providerCosts.commio.minutes ?? 0} min${isLumpsum ? " · your cost" : ""}`
                : "SIP"
            }
            color="#17A363"
            value={
              providerLoading && !providerCosts ? "…"
              : !providerCosts?.commio?.configured ? "n/a"
              // ⚠️ 4dp (not fmt2's 2dp) — Commio per-call cost is often
              // sub-cent (e.g. $0.0018 for a 0.2min call); at 2dp that
              // rounds to a misleading "$0.00" even though real cost exists.
              : providerCosts?.commio?.available ? fmt(isLumpsum ? providerCosts.commio.total : withMargin(providerCosts.commio.total))
              : "…"
            }
          />
        </div>
      </div>

      {/* ── Ledger ── */}
      <div style={{ ...card, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
            Transactions
            <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>({txTotal})</span>
            {txLoading && <span style={{ fontSize: 11.5, fontWeight: 500, color: textSecondary }}>· loading from Twilio…</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={txType}
              onChange={(e) => { setTxType(e.target.value); setTxPage(1); }}
              style={{
                padding: "6px 10px", borderRadius: 9, fontSize: 12.5,
                border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary,
                outline: "none",
              }}
            >
              <option value="all">All Types</option>
              <option value="call">Calls</option>
              <option value="sms">SMS / MMS</option>
              <option value="voicemail">Voicemails</option>
            </select>
            <button
              onClick={exportExcel}
              disabled={exporting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
                border: "none", background: "#17A363", color: "#fff",
                cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1,
              }}
              title="Download all data to Excel"
            >
              <Download size={14} />
              {exporting ? "Exporting…" : "Export Excel"}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ color: textSecondary, textAlign: "left" }}>
                {["Date & Time", "Type", "Direction", "From", "To", "Duration", "Amount", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 10px", borderBottom: `1px solid ${gridColor}`,
                    fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isCredit = t.type.startsWith("credit_");
                const e = t.enrich || {};
                const DIR_STYLE: Record<string, { label: string; color: string; Icon: any }> = {
                  outbound: { label: "Outbound", color: "#5B5BD6", Icon: PhoneOutgoing },
                  inbound: { label: "Inbound", color: "#0369A1", Icon: PhoneIncoming },
                  voicemail: { label: "Voicemail", color: "#0E7490", Icon: Voicemail },
                };
                const dir = DIR_STYLE[e.direction] || null;

                // Agent ka number ho to hover par agent ka naam
                const numberCell = (num: string | null, agentOfNumber: string | null) => (
                  <span
                    title={agentOfNumber ? `Agent: ${agentOfNumber}` : undefined}
                    style={agentOfNumber ? {
                      borderBottom: `1px dashed ${textSecondary}`,
                      cursor: "help", fontWeight: 600,
                    } : undefined}
                  >
                    {num || "—"}
                    {agentOfNumber && (
                      <span style={{ marginLeft: 4, fontSize: 9.5, fontWeight: 800, padding: "1px 5px", borderRadius: 5, background: "#5B5BD618", color: "#5B5BD6", verticalAlign: "middle" }}>
                        AGENT
                      </span>
                    )}
                  </span>
                );

                return (
                  <tr
                    key={t.id}
                    onClick={() => openDetail(t)}
                    style={{ color: textPrimary, cursor: "pointer", transition: "background 0.1s ease" }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)"; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                    title="Click for cost breakdown"
                  >
                    <td style={{ padding: "10px 10px", whiteSpace: "nowrap", borderBottom: `1px solid ${gridColor}`, color: textSecondary }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600 }}>
                      {TX_LABEL[t.type] || t.type}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      {dir ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: `${dir.color}15`, color: dir.color }}>
                          <dir.Icon size={12} /> {dir.label}
                        </span>
                      ) : <span style={{ color: textSecondary }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      {numberCell(e.from, e.fromAgentName)}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {numberCell(e.to, e.toAgentName)}
                        {/* Recording icon right next to the number when a recording was charged */}
                        {e.hasRecording && (
                          <span title="Recording available for this call" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: "#A21CAF18", color: "#A21CAF" }}>
                            <Mic size={12} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap", color: textSecondary, fontVariantNumeric: "tabular-nums" }}>
                      {fmtDuration(e.durationSeconds)}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 700, whiteSpace: "nowrap", color: isCredit ? "#17A363" : "#DC2626", fontVariantNumeric: "tabular-nums" }}>
                      {isCredit ? "+" : "-"}{fmt(t.amount)}
                    </td>
                    <td style={{ padding: "10px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      {e.conferenceName && (
                        <span
                          title={`Conference · ${(e.participants || []).length} participants\n${(e.participants || []).map((p: any) => `${p.from} → ${p.to}`).join("\n") || "—"}\nCost included in amount`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 6, background: "#7C3AED18", color: "#7C3AED", fontSize: 11, fontWeight: 700 }}
                        >
                          <Users size={12} />
                          {(e.participants || []).length || ""} · conf
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: textSecondary }}>
                    No transactions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px" }}>
          <button
            disabled={txPage <= 1}
            onClick={() => setTxPage((p) => p - 1)}
            style={{ padding: "6px 12px", borderRadius: 9, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: txPage <= 1 ? "not-allowed" : "pointer", opacity: txPage <= 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12.5, color: textSecondary, alignSelf: "center" }}>
            Page {txPage} of {Math.max(Math.ceil(txTotal / 25), 1)}
          </span>
          <button
            disabled={txPage >= Math.ceil(txTotal / 25)}
            onClick={() => setTxPage((p) => p + 1)}
            style={{ padding: "6px 12px", borderRadius: 9, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: txPage >= Math.ceil(txTotal / 25) ? "not-allowed" : "pointer", opacity: txPage >= Math.ceil(txTotal / 25) ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>

      {/* ═══════════ TRANSACTION DETAIL MODAL — cost kaise bani ═══════════ */}
      {detailTx && (() => {
        const t = detailTx;
        const isCallLike = ["debit_call", "debit_voicemail"].includes(t.type);
        const isSmsLike = ["debit_sms", "debit_mms"].includes(t.type);
        // Flat per-minute rate (BILLING_MODE=lumpsum) — no cost breakdown to show,
        // twilio/SIP/recording rows would all be $0 here (never priced in this mode).
        const isRowLumpsum = t.pricingMode === "lumpsum";
        // Legs: pehle stored meta se (billing-time snapshot), warna live fetch se
        const legs = (t.meta?.legs?.length ? t.meta.legs : detailLive?.legs) || [];
        const reconciled = !!t.meta?.reconciled;
        // ✅ Sab displayed amounts FINAL (margin-inclusive) — fee alag nahi
        // dikhta. factor se provider costs ko final amount par scale karte hain.
        const factor = t.baseCost > 0 ? (t.amount || 0) / t.baseCost : 1;
        const recordingCost =
          (t.twilioRecordingCost ?? t.meta?.recordingCost ?? detailLive?.recordingCost ?? 0) * factor;

        const PARTY_NAMES: Record<string, string> = {
          "agent-client": "Agent (app)",
          "customer-commio": "Customer (SIP)",
          "customer-pstn": "Customer (PSTN)",
          "sip-other": "SIP party",
          "unknown": "Party",
        };
        const SOURCE_BADGE: Record<string, string> = {
          "twilio-settled": "settled",
          "twilio-pricing-api": "live rate",
          "commio-cdr": "CDR",
          "pending": "pending",
        };
        // ✅ Breakdown lines ab VISIBLY sum ho kar Total banati hain:
        //   Call rate (Twilio legs) + SIP + Recording = Total charged
        // Pehle "Call rate (both legs)" mein SIP chhupa hota tha — Total
        // ke barabar dikh kar lagta tha SIP add hi nahi hua (confusing).
        // ⚠️ `||` (not `??`) — t.commioCost table ki BULK fuzzy match se aata
        // hai, jo match na milne par 0 (defined, not null/undefined) deta hai;
        // `??` isse kabhi detailLive.commioCost (modal ka EXACT SIP-Call-ID
        // match) tak fallback hi nahi hone deta tha — behtar number silently
        // discard ho raha tha.
        const sipInclusive =
          ((t.commioCost || detailLive?.commioCost ||
            (legs.length ? legs.reduce((s: number, l: any) => s + (l.commioPrice || 0), 0) : 0)) || 0) * factor;
        const conferenceInclusive = ((t.conferenceCost ?? 0) || 0) * factor;
        const twilioLegsInclusive = (() => {
          const tw = t.twilioCost || detailLive?.twilioCost ||
            (legs.length ? legs.reduce((s: number, l: any) => s + (l.twilioPrice || 0), 0) : null);
          if (tw != null) return tw * factor;
          // fallback: Total − SIP − recording − conference
          return Math.max((t.amount || 0) - sipInclusive - recordingCost - conferenceInclusive, 0);
        })();
        const e = t.enrich || {};

        const row = (label: string, value: React.ReactNode, opts: any = {}) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            padding: "8px 0", borderBottom: `1px dashed ${gridColor}`,
            fontSize: 13, fontWeight: opts.bold ? 800 : 500,
            color: opts.color || textPrimary,
          }}>
            <span style={{ color: opts.color || textSecondary }}>{label}</span>
            <span>{value}</span>
          </div>
        );

        return (
          <div
            onClick={() => setDetailTx(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.55)", display: "flex",
              alignItems: "center", justifyContent: "center", padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ ...card, width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary }}>
                    {TX_LABEL[t.type] || t.type} — Cost Breakdown
                    {reconciled && (
                      <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "#17A36318", color: "#17A363" }}>
                        RECONCILED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: textSecondary, marginTop: 4 }}>
                    {new Date(t.createdAt).toLocaleString()} · {t.callSid || t.messageId || "—"}
                  </div>
                </div>
                <button
                  onClick={() => setDetailTx(null)}
                  style={{ border: "none", background: "transparent", color: textSecondary, fontSize: 20, cursor: "pointer", lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              {/* ── CALL / VOICEMAIL ── */}
              {isCallLike && (
                <>
                  {/* Direction / from / to summary */}
                  {e.direction && row("Direction", e.direction)}
                  {(e.from || e.to) && row("From → To", `${e.from || "—"} → ${e.to || "—"}`)}
                  {e.agentName && row("Handled by", e.agentName)}

                  {/* Cost summary — lines visibly sum to Total:
                      Call rate (Twilio) + SIP + Recording = Total charged.
                      Lumpsum mode: flat per-minute rate instead (no cost breakdown). */}
                  {isRowLumpsum ? (
                    <>
                      {row("Rate", `${fmt(pricingConfig?.callRatePerMinute, 4)}/min`)}
                      {row("Billed duration", `${t.twilioCallDuration ?? 0}s (${Math.ceil((t.twilioCallDuration || 0) / 60)} min)`)}
                      {row("Total charged", fmt(t.amount), { bold: true })}
                    </>
                  ) : (
                    <>
                      {row("Call rate (Twilio legs)", fmt(twilioLegsInclusive))}
                      {sipInclusive > 0 && row("SIP price (carrier billable)", "+ " + fmt(sipInclusive))}
                      {recordingCost > 0 && row("Recording", "+ " + fmt(recordingCost))}
                      {conferenceInclusive > 0 && row("Conference", "+ " + fmt(conferenceInclusive))}
                      {row("Total charged", fmt(t.amount), { bold: true })}
                      {t.twilioCallDuration != null && row("Billed duration", `${t.twilioCallDuration}s (${Math.ceil((t.twilioCallDuration || 0) / 60)} min)`)}
                      {t.carrier && row("Carrier route", carrierLabel(t.carrier))}
                    </>
                  )}

                  {/* Participants — jab call conference mein gayi ho (ya multi-party) */}
                  {legs.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                        Participants {detailLoading && "(loading live…)"}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ color: textSecondary, textAlign: "left" }}>
                              {["Party", "From → To", "Duration"].map((h) => (
                                <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {legs.map((l: any, i: number) => (
                              <tr key={i} style={{ color: textPrimary }}>
                                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600, whiteSpace: "nowrap" }}>
                                  {PARTY_NAMES[l.kind] || l.kind}
                                </td>
                                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${gridColor}`, color: textSecondary, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {prettyEndpoint(l.from)} → {prettyEndpoint(l.to)}
                                </td>
                                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>{l.durationSeconds}s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── SMS / MMS ── */}
              {isSmsLike && (
                <>
                  {t.meta?.numSegments != null && row("Segments", String(t.meta.numSegments))}
                  {t.meta?.numMedia > 0 && row("Media attachments", String(t.meta.numMedia))}
                  {row("Total charged", fmt(t.amount), { bold: true })}
                </>
              )}

              {/* ── Other types (topup/legacy) ── */}
              {!isCallLike && !isSmsLike && (
                <>
                  {row("Amount", fmt(t.amount), { bold: true })}
                  {t.description && row("Description", t.description)}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
