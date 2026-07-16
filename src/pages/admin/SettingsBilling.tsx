// src/pages/admin/SettingsBilling.tsx
// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Phone, MessageSquare,
  Mic, FileText, AlertTriangle, CheckCircle,
  RefreshCw, X, Download, Filter,
  CreditCard, Zap, ArrowUpRight, ArrowDownLeft, Clock,
  PhoneOutgoing, PhoneIncoming, PhoneMissed, Radio,
  DollarSign, BarChart3, Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import Select from "react-select";
import { TopupModal } from "../../components/TopupModal";
import { DateInput } from "../../components/ui/AppDatePicker";

// ── Types ────────────────────────────────────────────────────
interface WalletSummary {
  balance: number;
  freeBalance: number;
  currency: string;
  isFrozen: boolean;
  negativeLimit: number;
  usedOutboundMinutes: number;
  usedOutboundSms: number;
  usedOutboundMms: number;
  maxOutboundMinutes: number | null;
  maxOutboundSms: number | null;
  maxOutboundMms: number | null;
  monthlySpend: number;
  showTopupWarning: boolean;
  lastTopupAt: string | null;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  callSid: string | null;
  messageId: string | null;
  description: string | null;
  twilioCallDuration: number | null;
  twilioCallCost: number | null;
  twilioRecordingCost: number | null;
  twilioTranscriptionCost: number | null;
  twilioSmsCost: number | null;
  createdAt: string;
}

// ── Transaction type config ──────────────────────────────────
const TX_CONFIG: Record<string, { label: string; icon: any; color: string; isDebit: boolean }> = {
  debit_call:          { label: "Outbound Call",    icon: PhoneOutgoing, color: "#5B5BD6", isDebit: true  },
  debit_recording:     { label: "Recording",        icon: Mic,           color: "#A21CAF", isDebit: true  },
  debit_transcription: { label: "Transcription",    icon: FileText,      color: "#0369A1", isDebit: true  },
  debit_sms:           { label: "SMS",              icon: MessageSquare, color: "#D38A00", isDebit: true  },
  debit_mms:           { label: "MMS",              icon: MessageSquare, color: "#C2410C", isDebit: true  },
  debit_voicemail:     { label: "Voicemail",        icon: Mic,           color: "#0E7490", isDebit: true  },
  debit_platform_fee:  { label: "Platform Fee",     icon: DollarSign,    color: "#17A363", isDebit: true  },
  debit_adjustment:    { label: "Reconcile Charge", icon: Activity,      color: "#DC2626", isDebit: true  },
  credit_adjustment:   { label: "Reconcile Refund", icon: ArrowDownLeft, color: "#17A363", isDebit: false },
  credit_topup:        { label: "Wallet Top-up",    icon: CreditCard,    color: "#17A363", isDebit: false },
  credit_free:         { label: "Free Credits",     icon: Zap,           color: "#17A363", isDebit: false },
  credit_manual:       { label: "Manual Credit",    icon: CheckCircle,   color: "#17A363", isDebit: false },
  credit_refund:       { label: "Refund",           icon: ArrowDownLeft, color: "#17A363", isDebit: false },
};

// ── Date / Type filter options ───────────────────────────────
const DATE_OPTIONS = [
  { value: "today",  label: "Today" },
  { value: "week",   label: "This Week" },
  { value: "month",  label: "This Month" },
  { value: "all",    label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

const TYPE_OPTIONS = [
  { value: "all",                 label: "All Types" },
  { value: "debit_call",          label: "Calls" },
  { value: "debit_sms",           label: "SMS" },
  { value: "debit_mms",           label: "MMS" },
  { value: "debit_recording",     label: "Recording" },
  { value: "debit_transcription", label: "Transcription" },
  { value: "credit_topup",        label: "Top-ups" },
];

// ── Main Component ───────────────────────────────────────────
export default function SettingsBilling() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const textPrimary   = isDark ? "#F0F0F5"               : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"               : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"               : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"               : "#5B5BD6";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"   : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)": "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"   : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)": "rgba(0,0,0,0.09)";
  const divider       = isDark ? "rgba(255,255,255,0.06)": "rgba(0,0,0,0.06)";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${s.isFocused ? accentMain + "60" : inputBorder}`,
      borderRadius: 10,
      padding: "0 4px",
      minHeight: 38,
      background: inputBg,
      boxShadow: s.isFocused ? `0 0 0 3px ${accentMain}20` : "none",
      "&:hover": { borderColor: accentMain + "40" },
      fontSize: 13,
    }),
    menu: (p: any) => ({
      ...p,
      borderRadius: 12,
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.09)" : "none",
      boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.60)" : "0 12px 28px rgba(0,0,0,0.12)",
      zIndex: 9999,
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? accentMain + "15" : "transparent",
      color: s.isSelected ? "#fff" : textPrimary,
      fontSize: 13,
      padding: "9px 14px",
    }),
    singleValue:        (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder:        (p: any) => ({ ...p, color: textMuted, fontSize: 13 }),
    indicatorSeparator: ()       => ({ display: "none" }),
    dropdownIndicator:  (p: any) => ({ ...p, color: textMuted }),
    input:              (p: any) => ({ ...p, color: textPrimary }),
  };

  // ── State ──
  const [wallet, setWallet]           = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTx, setTotalTx]         = useState(0);
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 20;

  const [dateFilter, setDateFilter] = useState({ value: "month", label: "This Month" });
  const [typeFilter, setTypeFilter] = useState({ value: "all",   label: "All Types" });
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  const [walletLoading, setWalletLoading] = useState(true);
  const [txLoading,     setTxLoading]     = useState(true);
  const [showTopup,     setShowTopup]     = useState(false);
  const [topupSuccess,  setTopupSuccess]  = useState<number | null>(null);

  // ── Fetch wallet summary ──
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await api.get("/auth/wallet");
      if (res.data?.data) setWallet(res.data.data);
    } catch { /* silent */ }
    finally { setWalletLoading(false); }
  }, []);

  // ── Fetch transactions with filters ──
  const fetchTransactions = useCallback(async (p = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page",       String(p));
      params.append("limit",      String(PAGE_SIZE));
      params.append("dateFilter", dateFilter.value);
      if (typeFilter.value !== "all") params.append("type", typeFilter.value);
      if (dateFilter.value === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate",   customEnd);
      }
      const res = await api.get(`/auth/transactions?${params}`);
      setTransactions(res.data?.data  || []);
      setTotalTx(     res.data?.total || 0);
      setPage(p);
    } catch { /* silent */ }
    finally { setTxLoading(false); }
  }, [dateFilter, typeFilter, customStart, customEnd]);

  useEffect(() => { if (token) fetchWallet(); },                                         [token]);
  useEffect(() => { if (token) fetchTransactions(1); }, [token, dateFilter, typeFilter, customStart, customEnd]);

  // ── Topup success handler (called by TopupModal) ──
  const handleTopupSuccess = (amount: number) => {
    setTopupSuccess(amount);
    setTimeout(() => setTopupSuccess(null), 4000);
    fetchWallet();
    fetchTransactions(1);
  };

  // ── Wallet health ──
  const balance       = wallet?.balance       ?? 0;
  const isFrozen      = wallet?.isFrozen      ?? false;
  const negLimit      = wallet?.negativeLimit ?? -5;
  const showTopupWarn = wallet?.showTopupWarning ?? false;

  const maxBar   = Math.max(wallet?.freeBalance ?? 10, 15);
  const barPct   = Math.max(0, Math.min(100, ((balance - negLimit) / (maxBar - negLimit)) * 100));
  const barColor = isFrozen ? "#D0281A" : balance < 2 ? "#D38A00" : "#17A363";

  const totalPages = Math.ceil(totalTx / PAGE_SIZE);

  // ── Usage meter helper ──
  const UsageMeter = ({
    used, max, label, color,
  }: { used: number; max: number | null; label: string; color: string }) => {
    const pct = max ? Math.min(100, (used / max) * 100) : 0;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: textSecondary, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 12, color: textPrimary, fontWeight: 700 }}>
            {max ? `${used.toFixed(1)} / ${max}` : `${used.toFixed(1)} / ∞`}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
          {max && (
            <div style={{
              height: "100%", borderRadius: 99, width: `${pct}%`,
              background: pct > 80 ? "#D0281A" : pct > 60 ? "#D38A00" : color,
              transition: "width 0.5s ease",
            }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh", padding: "0 0 60px" }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      {/* ── Topup Success Toast ── */}
      <AnimatePresence>
        {topupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 80, left: "50%", zIndex: 99999,
              background: "linear-gradient(135deg, #17A363 0%, #059669 100%)",
              color: "#fff", padding: "12px 24px", borderRadius: 14,
              boxShadow: "0 8px 28px rgba(23,163,99,0.40)",
              fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <CheckCircle size={16} />
            Wallet topped up with ${topupSuccess.toFixed(2)} successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TopupModal (standalone component) ── */}
      <TopupModal
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onSuccess={handleTopupSuccess}
      />

      {/* ── Page Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: isDark ? "rgba(23,163,99,0.15)" : "rgba(23,163,99,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wallet size={21} color="#17A363" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
              Billing & Wallet
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
              Manage credits, usage & top-up history
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => (window.location.hash = "#/admin/settings/billing/enterprise")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10,
              border: `1px solid ${inputBorder}`, background: inputBg,
              color: accentMain, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <BarChart3 size={13} /> Enterprise Dashboard
          </button>
          <button
            onClick={fetchWallet}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10,
              border: `1px solid ${inputBorder}`, background: inputBg,
              color: textPrimary, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setShowTopup(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: accentMain,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(91,91,214,0.30)",
            }}
          >
            <CreditCard size={14} /> Top Up Wallet
          </button>
        </div>
      </div>

      {/* ── Frozen / Low Balance Warning ── */}
      <AnimatePresence>
        {(isFrozen || showTopupWarn) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginBottom: 16, padding: "14px 18px", borderRadius: 14,
              background: isFrozen
                ? (isDark ? "rgba(208,40,26,0.12)" : "#FEE2E2")
                : (isDark ? "rgba(211,138,0,0.12)"  : "#FEF3C7"),
              border: `1px solid ${isFrozen ? "rgba(208,40,26,0.30)" : "rgba(211,138,0,0.30)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={16} color={isFrozen ? "#D0281A" : "#D38A00"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: isFrozen ? "#D0281A" : "#D38A00" }}>
                {isFrozen
                  ? "❄️ Wallet Frozen — Calls & messages are disabled until you top up."
                  : "⚠️ Low Balance — Please top up to avoid service interruption."}
              </span>
            </div>
            <button
              onClick={() => setShowTopup(true)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: isFrozen ? "#D0281A" : "#D38A00",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Top Up Now →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wallet Card + Usage ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Wallet Balance Card */}
        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: isDark ? "rgba(23,163,99,0.15)" : "rgba(23,163,99,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <DollarSign size={17} color="#17A363" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>Current Balance</span>
          </div>

          {walletLoading ? (
            <div style={{ height: 60, display: "flex", alignItems: "center" }}>
              <div style={{
                width: 120, height: 36, borderRadius: 8,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                animation: "shimmer 1.2s ease infinite",
              }} />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em",
                  color: isFrozen ? "#D0281A" : balance < 0 ? "#D38A00" : textPrimary,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {balance < 0 ? "-" : ""}${Math.abs(balance).toFixed(2)}
                </span>
                <span style={{ fontSize: 13, color: textMuted, fontWeight: 500 }}>USD</span>
                {isFrozen && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
                    background: "#D0281A", color: "#fff",
                    padding: "3px 8px", borderRadius: 5,
                  }}>
                    FROZEN
                  </span>
                )}
              </div>

              {/* Balance health bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 8, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99, width: `${barPct}%`,
                    background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}AA 100%)`,
                    transition: "width 0.6s ease",
                    boxShadow: `0 0 8px ${barColor}50`,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 10.5, color: "#D0281A", fontWeight: 600 }}>
                    Limit ${Math.abs(negLimit)}
                  </span>
                  <span style={{ fontSize: 10.5, color: textMuted }}>
                    Free: ${wallet?.freeBalance?.toFixed(2) ?? "0.00"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${divider}`,
                }}>
                  <div style={{ fontSize: 10.5, color: textMuted, marginBottom: 3 }}>This Month</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#D0281A" }}>
                    -${(wallet?.monthlySpend ?? 0).toFixed(2)}
                  </div>
                </div>
                <div style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${divider}`,
                }}>
                  <div style={{ fontSize: 10.5, color: textMuted, marginBottom: 3 }}>Last Top-up</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>
                    {wallet?.lastTopupAt
                      ? new Date(wallet.lastTopupAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Never"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Usage Limits Card */}
        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Activity size={17} color={accentMain} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>Usage This Period</span>
          </div>

          {walletLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 36, borderRadius: 8,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  animation: "shimmer 1.2s ease infinite",
                }} />
              ))}
            </div>
          ) : (
            <>
              <UsageMeter used={wallet?.usedOutboundMinutes ?? 0} max={wallet?.maxOutboundMinutes ?? null} label="Outbound Minutes" color={accentMain} />
              <UsageMeter used={wallet?.usedOutboundSms     ?? 0} max={wallet?.maxOutboundSms     ?? null} label="Outbound SMS"     color="#D38A00" />
              {/* <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 10,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: `1px solid ${divider}`, fontSize: 11.5, color: textMuted,
              }}>
                💡 Limits set via <code style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4 }}>.env</code>. NULL = unlimited usage.
              </div> */}
            </>
          )}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div style={card}>

        {/* Table Header + Filters */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${divider}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart3 size={16} color={accentMain} />
              <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>Transaction History</span>
              <span style={{
                fontSize: 11, color: textMuted,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                padding: "2px 9px", borderRadius: 99, border: `1px solid ${divider}`,
              }}>
                {totalTx} records
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 150 }}>
                <Select
                  options={DATE_OPTIONS}
                  value={dateFilter}
                  onChange={(opt: any) => setDateFilter(opt)}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  isSearchable={false}
                />
              </div>
              <div style={{ minWidth: 160 }}>
                <Select
                  options={TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={(opt: any) => setTypeFilter(opt)}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  isSearchable={false}
                />
              </div>
            </div>
          </div>

          {/* Custom date range */}
          {dateFilter.value === "custom" && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Start</div>
                <DateInput value={customStart} onChange={setCustomStart} style={{ borderRadius: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>End</div>
                <DateInput value={customEnd} onChange={setCustomEnd} style={{ borderRadius: 8 }} />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(246,247,249,0.80)", borderBottom: `1px solid ${divider}` }}>
                {["Type", "Description", "Amount", "Balance After", "Twilio Detail", "Date"].map((h) => (
                  <th key={h} style={{
                    padding: "11px 16px", textAlign: "left",
                    fontSize: 10.5, fontWeight: 700, color: textMuted,
                    textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: `3px solid ${accentMain}30`, borderTopColor: accentMain,
                      animation: "spin 0.7s linear infinite", margin: "0 auto",
                    }} />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 12px",
                    }}>
                      <Activity size={20} color={textMuted} />
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textSecondary }}>No transactions found</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: textMuted }}>Adjust filters or make your first call</p>
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const cfg      = TX_CONFIG[tx.type] || { label: tx.type, icon: Activity, color: textMuted, isDebit: true };
                const IconComp = cfg.icon;
                return (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.015 }}
                    style={{
                      borderBottom: `1px solid ${divider}`,
                      background: idx % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.015)" : "rgba(246,247,249,0.40)"),
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(124,124,240,0.05)" : "rgba(91,91,214,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.015)" : "rgba(246,247,249,0.40)"); }}
                  >
                    {/* Type */}
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: cfg.color + "18",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <IconComp size={13} color={cfg.color} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: textSecondary, maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description || "—"}
                      </div>
                      {tx.callSid && (
                        <div style={{ fontSize: 10.5, color: textMuted, marginTop: 2, fontFamily: "monospace" }}>
                          {tx.callSid.slice(0, 16)}…
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <span style={{
                        fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                        color: cfg.isDebit ? "#D0281A" : "#17A363",
                      }}>
                        {cfg.isDebit ? "-" : "+"}${tx.amount.toFixed(4)}
                      </span>
                    </td>

                    {/* Balance After */}
                    <td style={{
                      padding: "12px 16px", fontSize: 13, fontWeight: 700,
                      color: tx.balanceAfter < 0 ? "#D38A00" : textPrimary,
                      verticalAlign: "middle", fontVariantNumeric: "tabular-nums",
                    }}>
                      ${tx.balanceAfter.toFixed(4)}
                    </td>

                    {/* Twilio detail */}
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.6 }}>
                        {tx.twilioCallDuration    && <div>⏱ {Math.ceil(tx.twilioCallDuration / 60)}m {Math.round(tx.twilioCallDuration % 60)}s</div>}
                        {tx.twilioCallCost        && <div>📞 ${tx.twilioCallCost.toFixed(4)}</div>}
                        {tx.twilioRecordingCost   && <div>🎙 ${tx.twilioRecordingCost.toFixed(4)}</div>}
                        {tx.twilioTranscriptionCost && <div>📝 ${tx.twilioTranscriptionCost.toFixed(4)}</div>}
                        {tx.twilioSmsCost         && <div>💬 ${tx.twilioSmsCost.toFixed(4)}</div>}
                        {!tx.twilioCallDuration && !tx.twilioCallCost && !tx.twilioRecordingCost && !tx.twilioTranscriptionCost && !tx.twilioSmsCost && <span>—</span>}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: "12px 16px", fontSize: 12, color: textMuted, whiteSpace: "nowrap", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 600, color: textSecondary }}>
                        {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: textMuted }}>
              Page {page} of {totalPages} · {totalTx} total
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => fetchTransactions(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: `1px solid ${page === p ? accentMain + "60" : inputBorder}`,
                      background: page === p ? accentMain + "15" : inputBg,
                      color: page === p ? accentMain : textPrimary,
                      fontSize: 13, fontWeight: page === p ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}