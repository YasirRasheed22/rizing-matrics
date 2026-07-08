// pages/AgentKPIDetail.tsx
// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft, Loader2, AlertCircle, InboxIcon,
  Phone, DollarSign, List, Tag, User, Calendar,
  Clock, Hash, PhoneIncoming, PhoneOutgoing,
  ChevronLeft, ChevronRight, TrendingUp, CheckCircle2,
} from "lucide-react";
import { formatToCurrency } from "../main";
import { getAppTz } from "../hooks/dateFormat";

/* ── localStorage theme hook (same as DeleteContactModal) ── */
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light"))
        setTheme(e.newValue);
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(() => {
      try {
        const val = localStorage.getItem("theme") as "dark" | "light" | null;
        if (val === "dark" || val === "light") setTheme(val);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);
  return theme;
}

/* ── design tokens (light + dark) ── */
function getTokens(isDark: boolean) {
  return {
    P:            "#5B5BD6",
    BORDER:       isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.07)",
    TEXT:         isDark ? "#F0F0F8"                 : "#0D0D12",
    MUTED:        isDark ? "#7070A0"                 : "#9E9EAD",
    BG:           isDark ? "#151520"                 : "#F6F7F9",
    SURFACE:      isDark ? "#1A1A2E"                 : "#ffffff",
    SURFACE2:     isDark ? "#1E1E32"                 : "#F6F7F9",
    CARD_SHADOW:  isDark
      ? "0 1px 6px rgba(0,0,0,0.40)"
      : "0 1px 6px rgba(0,0,0,0.05)",
    BACK_BTN_BG:  isDark ? "#1A1A2E"                 : "#ffffff",
    BACK_BTN_H:   isDark ? "#22223A"                 : "#F6F7F9",

    /* summary bars */
    SALES_BAR_BG: isDark ? "rgba(22,163,74,0.10)"   : "rgba(22,163,74,0.06)",
    CALLS_BAR_BG: isDark ? "rgba(37,99,235,0.10)"   : "rgba(37,99,235,0.05)",

    /* row hover */
    ROW_HOVER:    isDark ? "#1E1E32"                 : "#F6F7F9",

    /* pagination */
    PAG_BG:       isDark ? "#1A1A2E"                 : "#F6F7F9",
    PAG_BTN_BG:   isDark ? "#22223A"                 : "#ffffff",
    PAG_BTN_TEXT: isDark ? "#C0C0D8"                 : "#0D0D12",

    /* period/count pills */
    PERIOD_BG:    isDark ? "#22223A"                 : "#F6F7F9",
    PERIOD_TEXT:  isDark ? "#8888B8"                 : "#9E9EAD",
    PERIOD_BORDER:isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.07)",

    /* states */
    ERR_BG:       isDark ? "rgba(239,68,68,0.12)"    : "rgba(239,68,68,0.08)",
    EMPTY_BG:     isDark ? "#1A1A2E"                 : "#F6F7F9",

    /* loader */
    LOADER_COLOR: "#5B5BD6",

    /* select */
    SELECT_BG:    isDark ? "#22223A"                 : "#ffffff",
    SELECT_TEXT:  isDark ? "#C0C0D8"                 : "#0D0D12",
    SELECT_BORDER:isDark ? "rgba(255,255,255,0.10)"  : "rgba(0,0,0,0.07)",
  };
}

/* ── avatar ── */
const PALETTES = [
  { bg: "#EDEDFB", fg: "#5B5BD6" }, { bg: "#DCFCE7", fg: "#16A34A" },
  { bg: "#FEF3C7", fg: "#D97706" }, { bg: "#FCE7F3", fg: "#DB2777" },
  { bg: "#DBEAFE", fg: "#2563EB" }, { bg: "#FFE4E6", fg: "#E11D48" },
];
const PALETTES_DARK = [
  { bg: "#2A2A4A", fg: "#8B8BF0" }, { bg: "#1A3A2A", fg: "#4ADE80" },
  { bg: "#3A2A10", fg: "#FBBF24" }, { bg: "#3A1A2A", fg: "#F472B6" },
  { bg: "#1A2A4A", fg: "#60A5FA" }, { bg: "#3A1A1A", fg: "#F87171" },
];
function pal(name = "", isDark = false) {
  const arr = isDark ? PALETTES_DARK : PALETTES;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % arr.length;
  return arr[h];
}
function initials(str = "") {
  const words = str.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : str.slice(0, 2).toUpperCase();
}

/* ── meta ── */
const KPI_META: Record<string, { label: string; icon: any; color: string; bg: string; bgDark: string }> = {
  totalLeads:  { label: "Total Leads",  icon: List,       color: "#5B5BD6", bg: "rgba(91,91,214,0.08)",  bgDark: "rgba(91,91,214,0.15)"  },
  salesClosed: { label: "Sales Closed", icon: DollarSign, color: "#16A34A", bg: "rgba(22,163,74,0.08)",  bgDark: "rgba(22,163,74,0.15)"  },
  totalCalls:  { label: "Total Calls",  icon: Phone,      color: "#2563EB", bg: "rgba(37,99,235,0.08)",  bgDark: "rgba(37,99,235,0.15)"  },
  disposition: { label: "Disposition",  icon: Tag,        color: "#D97706", bg: "rgba(217,119,6,0.08)",  bgDark: "rgba(217,119,6,0.15)"  },
};

const FILTER_LABELS: Record<string, string> = {
  all: "All Time", today: "Today", week: "This Week", month: "This Month",
};

/* ── helpers ── */
function useAppTz() { return getAppTz(); }

function fmtDate(iso: string, tz: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit", month: "short", year: "numeric", timeZone: tz,
  });
}
function fmtTime(iso: string, tz: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: tz,
  });
}
function fmtDuration(sec: number) {
  if (!sec || sec <= 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

/* ── Pill ── */
function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      color, background: bg, border: `1px solid ${color}28`,
    }}>
      {label}
    </span>
  );
}

/* ── Avatar + name ── */
function AvatarCell({ name, isDark }: { name: string; isDark: boolean }) {
  const p = pal(name, isDark);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: p.bg, color: p.fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, border: `1.5px solid ${p.fg}30`,
      }}>
        {initials(name)}
      </div>
      <span style={{ fontWeight: 600 }}>{name}</span>
    </div>
  );
}

/* ── Date cell ── */
function DateCell({ iso, tz, muted }: { iso: string; tz: string; muted: string }) {
  return (
    <div style={{ lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600 }}>{fmtDate(iso, tz)}</div>
      <div style={{ fontSize: 11, color: muted }}>{fmtTime(iso, tz)}</div>
    </div>
  );
}

/* ── Pagination bar ── */
function PaginationBar({ page, totalPages, total, limit, onPage, onLimit, loading, tk }: any) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)              return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 7,
    border: `1px solid ${tk.BORDER}`,
    background: disabled ? tk.BG : tk.PAG_BTN_BG,
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? tk.MUTED : tk.PAG_BTN_TEXT,
  });

  const pgBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 30, height: 30, borderRadius: 7, padding: "0 6px",
    fontSize: 12, fontWeight: active ? 700 : 500,
    border: active ? `1px solid ${tk.P}` : `1px solid ${tk.BORDER}`,
    background: active ? tk.P : tk.PAG_BTN_BG,
    color: active ? "#fff" : tk.PAG_BTN_TEXT,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: active ? `0 2px 8px ${tk.P}40` : "none",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10, padding: "12px 20px",
      borderTop: `1px solid ${tk.BORDER}`, background: tk.PAG_BG,
      borderRadius: "0 0 18px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: tk.MUTED }}>
          {total === 0 ? "No records" : `${from}–${to} of ${total.toLocaleString()}`}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          disabled={loading}
          style={{
            padding: "4px 8px", borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: `1px solid ${tk.SELECT_BORDER}`,
            background: tk.SELECT_BG,
            color: tk.SELECT_TEXT,
            cursor: "pointer", fontFamily: "inherit", outline: "none",
          }}
        >
          {[25, 50, 100, 200].map((l) => <option key={l} value={l}>{l} / page</option>)}
        </select>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button style={navBtn(page === 1 || loading)} disabled={page === 1 || loading} onClick={() => onPage(page - 1)}>
            <ChevronLeft size={13} />
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} style={{ fontSize: 12, color: tk.MUTED, padding: "0 2px" }}>…</span>
            ) : (
              <button key={p} style={pgBtn(p === page)} disabled={loading} onClick={() => onPage(p as number)}>{p}</button>
            )
          )}
          <button style={navBtn(page === totalPages || loading)} disabled={page === totalPages || loading} onClick={() => onPage(page + 1)}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Per-KPI table renderers                                       */
/* ══════════════════════════════════════════════════════════════ */

function LeadsTable({ data, tz, tk, isDark }: { data: any[]; tz: string; tk: any; isDark: boolean }) {
  const th: React.CSSProperties = {
    padding: "10px 16px", fontSize: 11, fontWeight: 700, color: tk.MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
    background: tk.SURFACE2, borderBottom: `1px solid ${tk.BORDER}`, textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: tk.TEXT,
    borderBottom: `1px solid ${tk.BORDER}`, verticalAlign: "middle",
  };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={th}>Client</th>
          <th style={th}>Phone</th>
          <th style={th}>Disposition</th>
          <th style={th}>Date Added</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, i) => {
          const name = item.clientName || item.name || "Unknown";
          const disp = item.disposition;
          return (
            <tr key={item.id ?? i}
              onMouseEnter={(e) => (e.currentTarget.style.background = tk.ROW_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.background = tk.SURFACE)}
              style={{ transition: "background 0.1s", background: tk.SURFACE }}
            >
              <td style={td}><AvatarCell name={name} isDark={isDark} /></td>
              <td style={{ ...td, fontFamily: "monospace", fontSize: 12, color: tk.MUTED }}>{item.clientPhone || item.phone || "—"}</td>
              <td style={td}>
                {disp
                  ? <Pill label={disp.name} color={disp.color || tk.P} bg={`${disp.color || tk.P}18`} />
                  : <span style={{ color: tk.MUTED }}>—</span>}
              </td>
              <td style={td}><DateCell iso={item.createdAt} tz={tz} muted={tk.MUTED} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SalesTable({ data, tz, tk, isDark }: { data: any[]; tz: string; tk: any; isDark: boolean }) {
  const totalAmount = data.reduce((s, r) => s + (r.amount || 0), 0);

  const th: React.CSSProperties = {
    padding: "10px 16px", fontSize: 11, fontWeight: 700, color: tk.MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
    background: tk.SURFACE2, borderBottom: `1px solid ${tk.BORDER}`, textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: tk.TEXT,
    borderBottom: `1px solid ${tk.BORDER}`, verticalAlign: "middle",
  };

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "10px 20px", background: tk.SALES_BAR_BG,
        borderBottom: `1px solid ${tk.BORDER}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} color="#16A34A" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
            {data.length} sale{data.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DollarSign size={14} color="#16A34A" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>
            Total: {formatToCurrency(totalAmount)}
          </span>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Client</th>
            <th style={th}>Amount</th>
            <th style={th}>Product / Notes</th>
            <th style={th}>Date Closed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const name = item.clientName || item.name || "Unknown";
            return (
              <tr key={item.id ?? i}
                onMouseEnter={(e) => (e.currentTarget.style.background = tk.ROW_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = tk.SURFACE)}
                style={{ transition: "background 0.1s", background: tk.SURFACE }}
              >
                <td style={td}><AvatarCell name={name} isDark={isDark} /></td>
                <td style={td}>
                  <span style={{
                    fontWeight: 700, color: "#16A34A",
                    background: isDark ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.08)",
                    padding: "3px 10px", borderRadius: 99,
                    fontSize: 12, border: "1px solid rgba(22,163,74,0.25)",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <DollarSign size={11} />
                    {item.amount != null ? formatToCurrency(item.amount) : "—"}
                  </span>
                </td>
                <td style={{ ...td, color: tk.MUTED, fontSize: 12 }}>{item.product || item.notes || "—"}</td>
                <td style={td}><DateCell iso={item.createdAt} tz={tz} muted={tk.MUTED} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function CallsTable({ data, tz, tk, isDark }: { data: any[]; tz: string; tk: any; isDark: boolean }) {
  const totalDuration = data.reduce((s, r) => s + (r.duration || 0), 0);
  const avgDuration   = data.length ? Math.round(totalDuration / data.length) : 0;

  const th: React.CSSProperties = {
    padding: "10px 16px", fontSize: 11, fontWeight: 700, color: tk.MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
    background: tk.SURFACE2, borderBottom: `1px solid ${tk.BORDER}`, textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: tk.TEXT,
    borderBottom: `1px solid ${tk.BORDER}`, verticalAlign: "middle",
  };

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "10px 20px", background: tk.CALLS_BAR_BG,
        borderBottom: `1px solid ${tk.BORDER}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Phone size={13} color="#2563EB" />
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB" }}>
            {data.length} call{data.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={13} color={isDark ? "#60A5FA" : "#2563EB"} />
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB" }}>
            Avg: {fmtDuration(avgDuration)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={13} color={isDark ? "#60A5FA" : "#2563EB"} />
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#60A5FA" : "#2563EB" }}>
            Total: {fmtDuration(totalDuration)}
          </span>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>From</th>
            <th style={th}>To</th>
            <th style={th}>Direction</th>
            <th style={th}>Duration</th>
            <th style={th}>Status</th>
            <th style={th}>Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const isIn      = item.direction === "inbound";
            const connected = (item.duration || 0) > 0;
            return (
              <tr key={item.id ?? i}
                onMouseEnter={(e) => (e.currentTarget.style.background = tk.ROW_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = tk.SURFACE)}
                style={{ transition: "background 0.1s", background: tk.SURFACE }}
              >
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{item.fromNumber || "—"}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{item.toNumber || "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: isIn
                        ? (isDark ? "rgba(22,163,74,0.20)" : "#DCFCE7")
                        : (isDark ? "rgba(91,91,214,0.20)" : "#EDEDFB"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isIn
                        ? <PhoneIncoming  size={11} color="#16A34A" />
                        : <PhoneOutgoing size={11} color="#5B5BD6" />}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: isIn ? "#16A34A" : (isDark ? "#8B8BF0" : "#5B5BD6"),
                      textTransform: "capitalize",
                    }}>
                      {item.direction || "—"}
                    </span>
                  </div>
                </td>
                <td style={td}>
                  <span style={{
                    fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                    color: connected ? (isDark ? "#60A5FA" : "#2563EB") : tk.MUTED,
                  }}>
                    {fmtDuration(item.duration || 0)}
                  </span>
                </td>
                <td style={td}>
                  <Pill
                    label={connected ? "Connected" : "Missed"}
                    color={connected ? "#16A34A" : "#DC2626"}
                    bg={connected
                      ? (isDark ? "rgba(22,163,74,0.18)" : "rgba(22,163,74,0.10)")
                      : (isDark ? "rgba(220,38,38,0.18)" : "rgba(220,38,38,0.10)")}
                  />
                </td>
                <td style={td}><DateCell iso={item.startTime} tz={tz} muted={tk.MUTED} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function DispositionTable({ data, tz, tk, isDark }: { data: any[]; tz: string; tk: any; isDark: boolean }) {
  const dispoName  = data[0]?.disposition?.name  || "Disposition";
  const dispoColor = data[0]?.disposition?.color || tk.P;

  const th: React.CSSProperties = {
    padding: "10px 16px", fontSize: 11, fontWeight: 700, color: tk.MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
    background: tk.SURFACE2, borderBottom: `1px solid ${tk.BORDER}`, textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: tk.TEXT,
    borderBottom: `1px solid ${tk.BORDER}`, verticalAlign: "middle",
  };

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 20px",
        background: isDark ? `${dispoColor}18` : `${dispoColor}10`,
        borderBottom: `1px solid ${tk.BORDER}`,
      }}>
        <Tag size={13} color={dispoColor} />
        <span style={{ fontSize: 12, fontWeight: 700, color: dispoColor }}>
          {data.length} lead{data.length !== 1 ? "s" : ""} — {dispoName}
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Client</th>
            <th style={th}>Phone</th>
            <th style={th}>Disposition</th>
            <th style={th}>Date Added</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const name = item.clientName || item.name || "Unknown";
            const disp = item.disposition;
            return (
              <tr key={item.id ?? i}
                onMouseEnter={(e) => (e.currentTarget.style.background = tk.ROW_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = tk.SURFACE)}
                style={{ transition: "background 0.1s", background: tk.SURFACE }}
              >
                <td style={td}><AvatarCell name={name} isDark={isDark} /></td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12, color: tk.MUTED }}>{item.clientPhone || item.phone || "—"}</td>
                <td style={td}>
                  {disp
                    ? <Pill label={disp.name} color={disp.color || tk.P} bg={`${disp.color || tk.P}18`} />
                    : <span style={{ color: tk.MUTED }}>—</span>}
                </td>
                <td style={td}><DateCell iso={item.createdAt} tz={tz} muted={tk.MUTED} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Main page                                                     */
/* ══════════════════════════════════════════════════════════════ */
export default function AgentKPIDetail() {
  const { kpiType }     = useParams();
  const { token, user } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();
  const sp              = new URLSearchParams(location.search);

  const filter        = sp.get("filter")        || "week";
  const startDate     = sp.get("startDate")     || "";
  const endDate       = sp.get("endDate")       || "";
  const agentId       = sp.get("agentId")       || "";
  const dispositionId = sp.get("dispositionId") || "";

  /* ── theme ── */
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);

  const [data, setData]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  const tz      = useAppTz();
  const isAdmin = user?.role === "ADMIN";
  const meta    = KPI_META[kpiType || ""] || { label: "Details", icon: List, color: tk.P, bg: "rgba(91,91,214,0.08)", bgDark: "rgba(91,91,214,0.15)" };
  const Icon    = meta.icon;
  const metaBg  = isDark ? meta.bgDark : meta.bg;

  const fetchData = async (p = page, l = limit) => {
    if (!token || !kpiType) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("filter", filter);
      params.append("page",  String(p));
      params.append("limit", String(l));
      if (filter === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate",   endDate);
      }
      if (isAdmin && agentId)                         params.append("agentId",       agentId);
      if (kpiType === "disposition" && dispositionId) params.append("dispositionId", dispositionId);

      const res = await api.get(`/voice/agent/kpi-detail/${kpiType}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1, limit); setPage(1); }, [token, kpiType, filter, startDate, endDate, agentId, dispositionId]);

  const handlePage  = (p: number) => { setPage(p);  fetchData(p, limit); };
  const handleLimit = (l: number) => { setLimit(l); setPage(1); fetchData(1, l); };

  /* period label */
  const periodLabel = filter === "custom" && startDate && endDate
    ? `${fmtDate(startDate, tz)} – ${fmtDate(endDate, tz)}`
    : FILTER_LABELS[filter] || filter;

  /* title from first record if disposition */
  const title = kpiType === "disposition" && data[0]?.disposition?.name
    ? data[0].disposition.name
    : meta.label;

  return (
    <div style={{
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      padding: "24px", maxWidth: 1000, margin: "0 auto", minHeight: "60vh",
      color: tk.TEXT,
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => navigate(isAdmin ? "/admin/kpis" : "/kpis")}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: tk.BACK_BTN_BG, border: `1px solid ${tk.BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: tk.MUTED, flexShrink: 0,
            boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
            transition: "all 0.14s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tk.BACK_BTN_H; e.currentTarget.style.color = tk.TEXT; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = tk.BACK_BTN_BG; e.currentTarget.style.color = tk.MUTED; }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{
          width: 44, height: 44, borderRadius: 13, background: metaBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, border: `1px solid ${meta.color}30`,
        }}>
          <Icon size={20} color={meta.color} />
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tk.TEXT, letterSpacing: "-0.025em" }}>
            {title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: tk.PERIOD_BG, color: tk.PERIOD_TEXT,
              border: `1px solid ${tk.PERIOD_BORDER}`,
              borderRadius: 9999, padding: "2px 10px",
            }}>
              {periodLabel}
            </span>
            {!loading && !error && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                background: metaBg, color: meta.color,
                border: `1px solid ${meta.color}30`,
                borderRadius: 9999, padding: "2px 10px",
              }}>
                {total.toLocaleString()} record{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 260 }}>
          <Loader2 size={26} color={tk.P} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13.5, color: tk.MUTED, fontWeight: 500 }}>Loading records…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: tk.ERR_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={22} color="#EF4444" />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Failed to load</p>
          <p style={{ margin: 0, fontSize: 13, color: tk.MUTED }}>{error}</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && data.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: tk.EMPTY_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <InboxIcon size={22} color={tk.MUTED} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tk.TEXT }}>No records found</p>
          <p style={{ margin: 0, fontSize: 13, color: tk.MUTED }}>Try a different time range</p>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && data.length > 0 && (
        <div style={{
          background: tk.SURFACE, border: `1px solid ${tk.BORDER}`,
          borderRadius: 18, overflow: "hidden", boxShadow: tk.CARD_SHADOW,
        }}>
          <div style={{ overflowX: "auto" }}>
            {kpiType === "totalLeads"  && <LeadsTable       data={data} tz={tz} tk={tk} isDark={isDark} />}
            {kpiType === "salesClosed" && <SalesTable       data={data} tz={tz} tk={tk} isDark={isDark} />}
            {kpiType === "totalCalls"  && <CallsTable       data={data} tz={tz} tk={tk} isDark={isDark} />}
            {kpiType === "disposition" && <DispositionTable data={data} tz={tz} tk={tk} isDark={isDark} />}
          </div>

          <PaginationBar
            page={page} totalPages={totalPages} total={total} limit={limit}
            onPage={handlePage} onLimit={handleLimit} loading={loading}
            tk={tk}
          />
        </div>
      )}
    </div>
  );
}