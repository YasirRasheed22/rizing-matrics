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
import { TopupModal } from "../../components/TopupModal";

const API_URL = "https://api.ringnex.co";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

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
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: isDark
      ? "0 4px 24px rgba(0,0,0,0.40)"
      : "0 4px 24px rgba(0,0,0,0.07)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: 20,
  };

  const [period, setPeriod] = useState("30d");
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

  // ── Top-up wallet modal ──
  const [showTopup, setShowTopup] = useState(false);

  // ── One-time wallet correction to match provider actuals ──
  // Real-time per-call billing runs automatically. This button only appears
  // when the wallet has drifted from the provider actual, and disappears once
  // corrected. Margin is applied automatically and never shown.
  const [syncing, setSyncing] = useState(false);
  const [reconcileDelta, setReconcileDelta] = useState<number | null>(null);
  const loadReconcilePreview = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get(`/billing/reconcile-provider`);
      setReconcileDelta(Number(res.data?.delta ?? 0));
    } catch {
      setReconcileDelta(null);
    }
  }, [isAdmin]);
  useEffect(() => { loadReconcilePreview(); }, [loadReconcilePreview]);

  // Apply the correction (called after the user confirms in the toast)
  const applyCorrection = useCallback(async () => {
    setSyncing(true);
    const tid = toast.loading("Correcting wallet…");
    try {
      const res = await api.post(`/billing/reconcile-provider`);
      const r = res.data || {};
      toast.success(`Wallet corrected. New balance: $${Number(r.newBalance || 0).toFixed(2)}`, { id: tid });
      setReconcileDelta(0);
      loadAll(); loadTransactions(); loadProviderCosts(); loadReconcilePreview();
    } catch (err: any) {
      toast.error("Correction failed: " + (err?.response?.data?.message || err?.message || "unknown"), { id: tid });
    } finally {
      setSyncing(false);
    }
  }, [loadReconcilePreview]);

  const syncWalletToProvider = useCallback(async () => {
    const tid = toast.loading("Checking…");
    try {
      const prev = await api.get(`/billing/reconcile-provider`);
      const p = prev.data || {};
      const delta = Number(p.delta || 0);
      if (Math.abs(delta) < 0.01) {
        toast.success("Wallet already matches the actual cost.", { id: tid });
        setReconcileDelta(0);
        return;
      }
      toast.dismiss(tid);
      // Confirmation toast with Apply / Cancel
      toast(
        (tt) => (
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>One-time wallet correction</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Cost to date: <b>${Number(p.target || 0).toFixed(2)}</b><br />
              Already charged: <b>${Number(p.alreadyCharged || 0).toFixed(2)}</b><br />
              {delta > 0 ? "Additional charge" : "Refund"}:{" "}
              <b style={{ color: delta > 0 ? "#DC2626" : "#17A363" }}>${Math.abs(delta).toFixed(2)}</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { toast.dismiss(tt.id); applyCorrection(); }}
                style={{ flex: 1, padding: "7px 12px", borderRadius: 8, border: "none", background: "#5B5BD6", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12.5 }}
              >
                Apply
              </button>
              <button
                onClick={() => toast.dismiss(tt.id)}
                style={{ flex: 1, padding: "7px 12px", borderRadius: 8, border: "1px solid #ccc", background: "transparent", color: "inherit", fontWeight: 600, cursor: "pointer", fontSize: 12.5 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    } catch (err: any) {
      toast.error("Check failed: " + (err?.response?.data?.message || err?.message || "unknown"), { id: tid });
    }
  }, [applyCorrection]);

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

  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get(
        `/billing/transactions?period=${period}&page=${txPage}&limit=25&type=${txType}`
      );
      setTransactions(res.data?.data || []);
      setTxTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Billing transactions load failed:", err);
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
      const res = await api.get(`/billing/transactions/export?period=${period}&type=${txType}`);
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

  const carrierData = useMemo(
    () =>
      (overview?.carrierSplit || []).map((c: any) => ({
        name: c.carrier === "commio" ? "Commio (BYOC)" : c.carrier === "twilio" ? "Twilio PSTN" : c.carrier,
        spend: Math.round((c.spend || 0) * 10000) / 10000,
        twilio: Math.round((c.twilioCost || 0) * 10000) / 10000,
        commio: Math.round((c.commioCost || 0) * 10000) / 10000,
        calls: c.calls,
      })),
    [overview]
  );

  const Kpi = ({ icon: Icon, label, value, change, color }: any) => (
    <div style={{ ...card, flex: 1, minWidth: 180 }}>
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
      {change !== undefined && (
        <div style={{
          fontSize: 11.5, fontWeight: 600, marginTop: 4, display: "flex",
          alignItems: "center", gap: 4,
          color: change >= 0 ? "#DC2626" : "#17A363",
        }}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% vs previous period
        </div>
      )}
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Enterprise Billing
          </h1>
          <div style={{ fontSize: 13, color: textSecondary, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: liveDot ? "#17A363" : textSecondary,
              transition: "background 0.3s",
              boxShadow: liveDot ? "0 0 8px #17A363" : "none",
            }} />
            Live — real-time costs (Twilio both legs + Commio BYOC + Recording), all-inclusive
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setTxPage(1); }}
              style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                border: `1px solid ${period === p.value ? "#5B5BD6" : cardBorder}`,
                background: period === p.value ? "#5B5BD618" : cardBg,
                color: period === p.value ? "#5B5BD6" : textSecondary,
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { loadAll(); loadTransactions(); loadProviderCosts(); }}
            style={{
              padding: "7px 10px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${cardBorder}`, background: cardBg, color: textSecondary,
            }}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowTopup(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", border: "none", background: "#5B5BD6", color: "#fff",
            }}
            title="Add credit to wallet"
          >
            <Wallet size={14} /> Top Up Wallet
          </button>
        </div>
      </div>

      {/* ═══════ PROVIDER COST & MARGIN — ground-truth (Twilio + Commio APIs) ═══════ */}
      {(() => {
        const pc = providerCosts;
        const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;
        const billRow = (label: string, value: React.ReactNode, opts: any = {}) => (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            padding: opts.pad || "7px 0",
            borderTop: opts.topBorder ? `1px solid ${cardBorder}` : "none",
            borderBottom: opts.divider ? `1px dashed ${gridColor}` : "none",
            fontSize: opts.big ? 15 : 13,
            fontWeight: opts.bold ? 800 : 500,
            color: opts.color || textPrimary,
          }}>
            <span style={{ color: opts.labelColor || (opts.bold ? textPrimary : textSecondary), display: "flex", alignItems: "center", gap: 7 }}>
              {opts.icon}{label}
            </span>
            <span style={{ fontWeight: opts.bold ? 900 : 700, fontSize: opts.big ? 20 : undefined, color: opts.valueColor || opts.color || textPrimary }}>{value}</span>
          </div>
        );
        return (
          <div style={{
            ...card,
            background: isDark ? "linear-gradient(135deg, rgba(91,91,214,0.14), rgba(23,163,99,0.10))"
                               : "linear-gradient(135deg, rgba(91,91,214,0.07), rgba(23,163,99,0.06))",
            borderColor: "rgba(91,91,214,0.30)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={18} /> Usage &amp; Cost Summary
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>
                  — live from Twilio + Commio
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {providerLoading && <span style={{ fontSize: 11.5, color: textSecondary }}>fetching…</span>}
                {/* Shown when the wallet has drifted, or when the check could not
                    complete (null) so it stays actionable. Hides once corrected. */}
                {(reconcileDelta == null || Math.abs(reconcileDelta) >= 0.05) && (
                  <button
                    onClick={syncWalletToProvider}
                    disabled={syncing}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                      cursor: syncing ? "wait" : "pointer", border: "none",
                      background: "#D38A00", color: "#fff", opacity: syncing ? 0.7 : 1,
                    }}
                    title="Apply a one-time correction so the wallet matches the actual cost"
                  >
                    <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "Correcting…" : "Correct wallet"}
                  </button>
                )}
              </div>
            </div>

            {pc ? (() => {
              // ✅ Margin har item ke ANDAR baat diya jata hai (koi alag margin
              // row nahi) — admin ko sirf final cost dikhta hai. factor se har
              // line + total margin-inclusive; sum wahi rehta jo totalToBill.
              const f = pc.base > 0 ? pc.totalToBill / pc.base : 1 + (pc.marginPercent || 0) / 100;
              const inc = (n: any) => money(Number(n || 0) * f);
              return (
              <div style={{ maxWidth: 620 }}>
                {/* Twilio itemized (margin already included) */}
                {billRow("Voice, recordings & messaging", inc(pc.twilio?.voiceAndOther))}
                {billRow("Phone numbers", inc(pc.twilio?.phoneNumbers))}
                {billRow("Recording storage", inc(pc.twilio?.recordingStorage))}
                {billRow("Conference", inc(pc.twilio?.conference), { divider: true })}
                {billRow("Twilio subtotal", inc(pc.twilio?.total), { bold: true, labelColor: textPrimary })}

                {/* Commio — cost + usage (calls + minutes) filter ke hisaab se */}
                {billRow(
                  `Commio (BYOC carrier)${pc.commio?.available ? ` · ${pc.commio.callCount ?? 0} calls · ${pc.commio.minutes ?? 0} min` : ""}`,
                  !pc.commio?.configured ? "not configured" : pc.commio?.available ? inc(pc.commio?.total) : "unavailable",
                  { topBorder: true, valueColor: pc.commio?.available ? textPrimary : "#D38A00" }
                )}

                {/* Hero total (= base × factor) */}
                {billRow("TOTAL", money(pc.totalToBill), {
                  topBorder: true, bold: true, big: true, pad: "12px 0 2px",
                  labelColor: textPrimary, valueColor: "#5B5BD6",
                })}

                {pc.commio?.partial && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#D38A00" }}>⚠️ Too many Commio records — this figure may be partial.</div>
                )}
                {!pc.commio?.configured && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#D38A00" }}>⚠️ Commio not configured — showing Twilio cost only.</div>
                )}
                {pc.commio?.available && pc.commio?.configured && !pc.commio?.filtered && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#D38A00" }}>⚠️ Could not read this account's numbers — Commio total is not filtered to this account.</div>
                )}
              </div>
              );
            })() : (
              <div style={{ color: textSecondary, fontSize: 12.5, padding: "8px 0" }}>
                {providerLoading ? "Loading…" : "Cost summary unavailable — please check the backend is deployed."}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── KPI row — sab amounts FINAL (all-inclusive) hain ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Kpi icon={Wallet} label="Wallet Balance" color="#5B5BD6"
             value={fmt2(overview?.wallet?.balance)} />
        <Kpi icon={DollarSign} label="Total Spend" color="#DC2626"
             value={fmt2(totals.totalSpend)} change={totals.totalSpendChange} />
        <Kpi icon={PhoneOutgoing} label={`Outbound (${inc.outboundCalls || 0} calls)`} color={CAT_COLORS.voice}
             value={fmt2(inc.outbound)} />
        <Kpi icon={PhoneIncoming} label={`Inbound (${inc.inboundCalls || 0} calls)`} color="#0369A1"
             value={fmt2(inc.inbound)} />
        <Kpi icon={MessageSquare} label={`SMS/MMS (${totals.smsCount || 0})`} color={CAT_COLORS.sms}
             value={fmt2(inc.sms)} />
        <Kpi icon={Voicemail} label={`Voicemail (${totals.voicemailCount || 0})`} color={CAT_COLORS.voicemail}
             value={fmt2(inc.voicemail)} />
        <Kpi icon={Mic} label="Recording" color={CAT_COLORS.recording}
             value={fmt2(inc.recording)} />
        <Kpi icon={Users} label={`Conference Calls (${inc.conferenceCallsCount || 0})`} color="#7C3AED"
             value={fmt2(inc.conferenceCalls)} />
        <Kpi icon={Hash} label="Phone Numbers" color="#0E7490"
             value={usage ? fmt2(withMargin(usage.phoneNumbers)) : "…"} />
        <Kpi icon={Database} label="Recording Storage" color="#A21CAF"
             value={usage ? fmt2(withMargin(usage.recordingStorage)) : "…"} />
        {usage && usage.conference > 0 && (
          <Kpi icon={Users} label="Conference" color="#7C3AED"
               value={fmt2(withMargin(usage.conference))} />
        )}
        {/* Commio carrier cost + usage (calls + minutes) — filter ke hisaab se */}
        <Kpi
          icon={Radio}
          label={
            providerCosts?.commio?.available
              ? `Commio BYOC (${providerCosts.commio.callCount ?? 0} calls · ${providerCosts.commio.minutes ?? 0} min)`
              : "Commio BYOC"
          }
          color="#17A363"
          value={
            providerLoading && !providerCosts ? "…"
            : !providerCosts?.commio?.configured ? "n/a"
            : providerCosts?.commio?.available ? fmt2(withMargin(providerCosts.commio.total))
            : "…"
          }
        />
      </div>

      {/* ── Charts row 1: daily stacked spend ── */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={16} /> Daily Spend Breakdown
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: textSecondary }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: textSecondary }} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <RTooltip
                formatter={(v: any, name: any) => [fmt(v), name]}
                contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="voice" name="Voice" stackId="1" stroke={CAT_COLORS.voice} fill={CAT_COLORS.voice} fillOpacity={0.55} />
              <Area type="monotone" dataKey="sms" name="SMS/MMS" stackId="1" stroke={CAT_COLORS.sms} fill={CAT_COLORS.sms} fillOpacity={0.55} />
              <Area type="monotone" dataKey="voicemail" name="Voicemail" stackId="1" stroke={CAT_COLORS.voicemail} fill={CAT_COLORS.voicemail} fillOpacity={0.55} />
              <Area type="monotone" dataKey="recording" name="Recording" stackId="1" stroke={CAT_COLORS.recording} fill={CAT_COLORS.recording} fillOpacity={0.55} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts row 2: category pie + carrier split + rates ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ ...card, flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>
            Spend by Category
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RTooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Radio size={15} /> Carrier Split (Commio vs Twilio)
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={carrierData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: textSecondary }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: textSecondary }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <RTooltip formatter={(v: any) => fmt(v)} contentStyle={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="twilio" name="Twilio legs" fill="#5B5BD6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="commio" name="Commio carrier" fill="#17A363" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={15} /> Live Rates (real-time)
          </div>
          {pricingConfig ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
              {(() => {
                const mCall = 1 + (pricingConfig.marginPercent || 0) / 100;
                const mSms = 1 + (pricingConfig.smsMarginPercent ?? pricingConfig.marginPercent ?? 0) / 100;
                const eff = (v: any, m: number) => (v != null ? fmt(v * m) : "—");
                return [
                  ["US outbound / min", eff(pricingConfig.liveRates?.twilioVoiceOutboundUsPerMin, mCall)],
                  ["US inbound / min", eff(pricingConfig.liveRates?.twilioVoiceInboundUsPerMin, mCall)],
                  ["US SMS / msg", eff(pricingConfig.liveRates?.twilioSmsOutboundUsPerMsg, mSms)],
                  ["Commio cost source", pricingConfig.commio?.cdrApiConfigured ? "CDR API ✓" : "CDR API not configured"],
                  ["Call legs source", "Settled per-call price"],
                  ["Late prices", "Auto-reconciliation"],
                ];
              })().map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${gridColor}`, paddingBottom: 6 }}>
                  <span style={{ color: textSecondary }}>{k}</span>
                  <span style={{ color: textPrimary, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              {pricingConfig.liveRates?.fetchedAt && (
                <div style={{ fontSize: 10.5, color: textSecondary }}>
                  Twilio Pricing API @ {new Date(pricingConfig.liveRates.fetchedAt).toLocaleTimeString()}
                </div>
              )}
              {/* ── Live rate lookup for any number ── */}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input
                  value={rateLookupNumber}
                  onChange={(e) => setRateLookupNumber(e.target.value)}
                  placeholder="+14155551234"
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12.5,
                    border: `1px solid ${cardBorder}`, background: "transparent", color: textPrimary,
                  }}
                />
                <button
                  onClick={lookupRate}
                  disabled={rateLookupLoading}
                  style={{
                    padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                    border: "none", background: "#5B5BD6", color: "#fff",
                    cursor: rateLookupLoading ? "wait" : "pointer",
                  }}
                >
                  {rateLookupLoading ? "…" : "Rate"}
                </button>
              </div>
              {rateLookupResult && (
                <div style={{ fontSize: 12, color: textSecondary }}>
                  {rateLookupResult.error ? (
                    <span style={{ color: "#DC2626" }}>{rateLookupResult.error}</span>
                  ) : (
                    <>
                      Rate:{" "}
                      <b style={{ color: textPrimary }}>
                        {fmt(rateLookupResult.effectiveRatePerMin)}/min
                      </b>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: textSecondary, fontSize: 12.5 }}>Loading…</div>
          )}
        </div>
      </div>

      {/* ── Live feed ── */}
      {liveEvents.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>
            ⚡ Live Billing Events
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {liveEvents.map((e, i) => (
              <div key={i} style={{ fontSize: 12.5, color: textSecondary, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: textPrimary, textTransform: "uppercase" }}>{e.kind}</span>
                <span>{e.description}</span>
                <span style={{ color: "#DC2626", fontWeight: 700 }}>-{fmt(e.amount)}</span>
                {e.carrier && <span>via {e.carrier}</span>}
                <span>bal {fmt2(e.balance)}</span>
                <span>{new Date(e.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ledger ── */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
            Transactions ({txTotal})
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={txType}
              onChange={(e) => { setTxType(e.target.value); setTxPage(1); }}
              style={{
                padding: "6px 10px", borderRadius: 10, fontSize: 12.5,
                border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary,
              }}
            >
              <option value="all">All Types</option>
              <option value="debit_call">Calls</option>
              <option value="debit_voicemail">Voicemails</option>
              <option value="debit_sms">SMS</option>
              <option value="debit_mms">MMS</option>
              <option value="credit_topup">Top-ups</option>
            </select>
            <button
              onClick={exportExcel}
              disabled={exporting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
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
                  <th key={i} style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
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
                    style={{ color: textPrimary, cursor: "pointer" }}
                    title="Click for cost breakdown"
                  >
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", borderBottom: `1px solid ${gridColor}` }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 600 }}>
                      {TX_LABEL[t.type] || t.type}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      {dir ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: `${dir.color}15`, color: dir.color }}>
                          <dir.Icon size={12} /> {dir.label}
                        </span>
                      ) : <span style={{ color: textSecondary }}>—</span>}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
                      {numberCell(e.from, e.fromAgentName)}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
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
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap", color: textSecondary }}>
                      {fmtDuration(e.durationSeconds)}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, fontWeight: 700, whiteSpace: "nowrap", color: isCredit ? "#17A363" : "#DC2626" }}>
                      {isCredit ? "+" : "-"}{fmt(t.amount)}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${gridColor}`, whiteSpace: "nowrap" }}>
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
                  <td colSpan={8} style={{ padding: 24, textAlign: "center", color: textSecondary }}>
                    No transactions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* pagination */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button
            disabled={txPage <= 1}
            onClick={() => setTxPage((p) => p - 1)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: txPage <= 1 ? "not-allowed" : "pointer", opacity: txPage <= 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12.5, color: textSecondary, alignSelf: "center" }}>
            Page {txPage} of {Math.max(Math.ceil(txTotal / 25), 1)}
          </span>
          <button
            disabled={txPage >= Math.ceil(txTotal / 25)}
            onClick={() => setTxPage((p) => p + 1)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, cursor: txPage >= Math.ceil(txTotal / 25) ? "not-allowed" : "pointer", opacity: txPage >= Math.ceil(txTotal / 25) ? 0.5 : 1 }}
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
          "customer-commio": "Customer (Commio)",
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
        // ✅ Dono call legs ka combined rate (Twilio + Commio), margin-inclusive.
        // Modal mein "Call rate" ek hi line — user ko "legs" nahi dikhta.
        const callRateInclusive = legs.length
          ? legs.reduce((s: number, l: any) => s + ((l.twilioPrice || 0) + (l.commioPrice || 0)), 0) * factor
          : Math.max((t.amount || 0) - recordingCost, 0);
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

                  {/* Cost summary — sab amounts final (all-inclusive) */}
                  {row("Call rate (both legs)", fmt(callRateInclusive))}
                  {recordingCost > 0 && row("Recording", fmt(recordingCost))}
                  {row("Total charged", fmt(t.amount), { bold: true })}
                  {t.twilioCallDuration != null && row("Billed duration", `${t.twilioCallDuration}s (${Math.ceil((t.twilioCallDuration || 0) / 60)} min)`)}
                  {t.carrier && row("Carrier route", t.carrier)}

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

              {/* Balance movement */}
              <div style={{ marginTop: 10, fontSize: 11.5, color: textSecondary }}>
                Balance: {fmt2(t.balanceBefore)} → {fmt2(t.balanceAfter)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════ TOP-UP WALLET MODAL ═══════════ */}
      <TopupModal
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onSuccess={() => { setShowTopup(false); loadAll(); loadTransactions(); }}
      />
    </div>
  );
}
