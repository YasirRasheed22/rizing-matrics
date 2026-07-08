// src/components/admin/CallLogsTable.tsx
//@ts-nocheck
import React, { useState, useMemo } from "react";
import {
  PhoneIncoming, PhoneOutgoing, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, X,
} from "lucide-react";
import { getAppTz } from "../../hooks/dateFormat";

export interface CallLog {
  sessionId: string;
  agentId: number;
  agentName: string;
  direction: "inbound" | "outbound";
  type: string;
  number: string;
  formatted?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  recordingUrl?: string;
}

export interface CallLogsTableProps {
  logs: CallLog[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onPlayRecording?: (url: string) => void;
  isDark?: boolean;
}

function fmtDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  if (s === 0) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60), rm = m % 60;
  return `${h}h ${rm > 0 ? `${rm}m` : ""}`.trim();
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: getAppTz(),
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function StatusBadge({ type, isDark }: { type: string; isDark?: boolean }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    connected:   { label: "Connected", color: "#059669", dot: "#10B981" },
    "no-answer": { label: "Connected", color: "#059669", dot: "#10B981" },
    missed:      { label: "Missed",    color: "#DC2626", dot: "#EF4444" },
    voicemail:   { label: "Voicemail", color: "#D97706", dot: "#F59E0B" },
  };
  const c = map[type] ?? { label: type || "—", color: "#6B7280", dot: "#9CA3AF" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      color: c.color,
      background: isDark ? `${c.color}22` : `${c.color}18`,
      border: `1px solid ${isDark ? `${c.color}35` : `${c.color}28`}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function DirectionBadge({ direction, isDark }: { direction: string; isDark?: boolean }) {
  const isIn = direction === "inbound";
  const greenBg   = isDark ? "rgba(5,150,105,0.15)"  : "#ECFDF5";
  const greenBord = isDark ? "rgba(5,150,105,0.30)"  : "#A7F3D0";
  const blueBg    = isDark ? "rgba(79,70,229,0.15)"  : "#EEF2FF";
  const blueBord  = isDark ? "rgba(79,70,229,0.30)"  : "#C7D2FE";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: isIn ? greenBg : blueBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${isIn ? greenBord : blueBord}`,
      }}>
        {isIn
          ? <PhoneIncoming  size={11} color="#059669" />
          : <PhoneOutgoing  size={11} color="#4F46E5" />}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: isIn ? "#059669" : "#4F46E5", textTransform: "capitalize" }}>
        {direction}
      </span>
    </div>
  );
}

function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: "asc" | "desc" | null }) {
  if (sortKey !== col) return <ChevronsUpDown size={12} style={{ color: "#CBD5E1", marginLeft: 3 }} />;
  return dir === "asc"
    ? <ChevronUp  size={12} style={{ color: "#4F46E5", marginLeft: 3 }} />
    : <ChevronDown size={12} style={{ color: "#4F46E5", marginLeft: 3 }} />;
}

function PaginationBar({
  page, totalPages, total, limit, onPageChange, onLimitChange, loading, isDark,
}: {
  page: number; totalPages: number; total: number; limit: number;
  onPageChange: (p: number) => void; onLimitChange: (l: number) => void;
  loading?: boolean; isDark?: boolean;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const paginBg     = isDark ? "rgba(23,23,31,0.80)"      : "#FAFAFA";
  const paginBorder = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.055)";
  const textMuted   = isDark ? "#68687A"                  : "#94A3B8";
  const textPrimary = isDark ? "#F0F0F5"                  : "#374151";
  const navBg       = isDark ? "rgba(255,255,255,0.05)"   : "#fff";
  const navBgDis    = isDark ? "rgba(255,255,255,0.02)"   : "#F8FAFC";
  const navBorder   = isDark ? "rgba(255,255,255,0.08)"   : "rgba(0,0,0,0.08)";
  const navDisColor = isDark ? "#3A3A4A"                  : "#CBD5E1";
  const selectBg    = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const selectBord  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";

  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)              return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 7,
    border: `1px solid ${navBorder}`,
    background: disabled ? navBgDis : navBg,
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? navDisColor : textPrimary,
    transition: "all 0.12s", flexShrink: 0,
  });

  const pageBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 30, height: 30, borderRadius: 7, padding: "0 6px",
    fontSize: 12, fontWeight: active ? 700 : 500,
    border: active ? "1px solid #4F46E5" : `1px solid ${navBorder}`,
    background: active ? "#4F46E5" : navBg,
    color: active ? "#fff" : textPrimary,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: active ? "0 2px 8px rgba(79,70,229,0.30)" : "none",
    transition: "all 0.12s",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10,
      padding: "12px 20px",
      borderTop: `1px solid ${paginBorder}`,
      background: paginBg,
      borderRadius: "0 0 16px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>
          {total === 0 ? "No records" : `${from}–${to} of ${total.toLocaleString()} records`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Rows</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={loading}
            style={{
              padding: "4px 8px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: `1px solid ${selectBord}`, background: selectBg,
              color: textPrimary, cursor: "pointer", fontFamily: "inherit", outline: "none",
            }}
          >
            {[25, 50, 100, 200].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button style={navBtn(page === 1 || !!loading)} disabled={page === 1 || loading} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={13} />
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: navDisColor, padding: "0 2px", userSelect: "none" }}>…</span>
            ) : (
              <button key={p} style={pageBtn(p === page)} disabled={loading} onClick={() => onPageChange(p as number)}>
                {p}
              </button>
            )
          )}
          <button style={navBtn(page === totalPages || !!loading)} disabled={page === totalPages || loading} onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CallLogsTable({
  logs, loading = false, page, limit, total, totalPages,
  onPageChange, onLimitChange, onPlayRecording, isDark = false,
}: CallLogsTableProps) {
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<string>("startTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Tokens ──
  const tableBg       = isDark ? "rgba(20,20,28,0.95)"      : "#fff";
  const tableBorder   = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const tableShadow   = isDark ? "0 2px 12px rgba(0,0,0,0.40)" : "0 2px 12px rgba(0,0,0,0.05)";
  const toolbarBorder = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const countBg       = isDark ? "rgba(255,255,255,0.06)"   : "#F1F5F9";
  const countColor    = isDark ? "#A0A0B0"                  : "#64748B";
  const searchBg      = isDark ? "rgba(30,30,42,0.90)"      : "#F8FAFC";
  const searchBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";
  const searchColor   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const searchIcon    = isDark ? "#68687A"                  : "#94A3B8";
  const thBg          = isDark ? "rgba(255,255,255,0.03)"   : "#FAFAFA";
  const thColor       = isDark ? "#68687A"                  : "#94A3B8";
  const thBorder      = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const tdBorder      = isDark ? "rgba(255,255,255,0.045)"  : "rgba(0,0,0,0.045)";
  const rowEven       = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const rowOdd        = isDark ? "rgba(28,28,38,0.95)"      : "#FAFBFD";
  const rowHover      = isDark ? "rgba(124,124,240,0.07)"   : "#F0F4FF";
  const numColor      = isDark ? "#F0F0F5"                  : "#0F172A";
  const agentColor    = isDark ? "#C0C0D0"                  : "#374151";
  const agentAvBg     = isDark ? "rgba(79,70,229,0.15)"     : "#EEF2FF";
  const agentAvBorder = isDark ? "rgba(79,70,229,0.30)"     : "#C7D2FE";
  const dateColor     = isDark ? "#68687A"                  : "#64748B";
  const emptyColor    = isDark ? "#3A3A4A"                  : "#CBD5E1";
  const clearBtnBg    = isDark ? "rgba(255,255,255,0.06)"   : "#F8FAFC";
  const clearBtnBorder= isDark ? "rgba(255,255,255,0.10)"   : "rgba(0,0,0,0.09)";
  const clearBtnColor = isDark ? "#A0A0B0"                  : "#64748B";
  const playBg        = isDark ? "rgba(79,70,229,0.12)"     : "rgba(79,70,229,0.08)";
  const playBgHover   = isDark ? "rgba(79,70,229,0.22)"     : "rgba(79,70,229,0.15)";
  const playBorder    = isDark ? "rgba(79,70,229,0.28)"     : "rgba(79,70,229,0.18)";
  const dashColor     = isDark ? "#3A3A4A"                  : "#E2E8F0";

  const skelBg = isDark
    ? "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)"
    : "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)";

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((r) =>
      (r.number    || "").toLowerCase().includes(q) ||
      (r.agentName || "").toLowerCase().includes(q) ||
      (r.direction || "").toLowerCase().includes(q) ||
      (r.type      || "").toLowerCase().includes(q) ||
      (r.sessionId || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const thStyle = (key?: string): React.CSSProperties => ({
    padding: "10px 14px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: thColor,
    textAlign: "left", whiteSpace: "nowrap",
    cursor: key ? "pointer" : "default",
    userSelect: "none",
    borderBottom: `1px solid ${thBorder}`,
    background: thBg,
  });

  const tdStyle: React.CSSProperties = {
    padding: "11px 14px",
    borderBottom: `1px solid ${tdBorder}`,
    verticalAlign: "middle",
  };

  const skeletonRows = Array.from({ length: limit > 10 ? 10 : limit });

  return (
    <div style={{
      background: tableBg,
      borderRadius: 16,
      border: `1px solid ${tableBorder}`,
      boxShadow: tableShadow,
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", gap: 12,
        borderBottom: `1px solid ${toolbarBorder}`,
      }}>
        <div style={{
          padding: "5px 12px", borderRadius: 8,
          background: countBg, fontSize: 11, fontWeight: 700,
          color: countColor, whiteSpace: "nowrap", letterSpacing: "0.04em",
        }}>
          {loading ? "Loading…" : `${total.toLocaleString()} total`}
        </div>

        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: searchIcon, pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="Search within this page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "7px 30px 7px 30px",
              borderRadius: 9, border: `1px solid ${searchBorder}`,
              background: searchBg, fontSize: 12,
              color: searchColor, outline: "none", fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", color: searchIcon, padding: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              {[
                { label: "Number",      key: "number" },
                { label: "Agent",       key: "agentName" },
                { label: "Direction",   key: "direction" },
                { label: "Status",      key: "type" },
                { label: "Duration",    key: "duration" },
                { label: "Date & Time", key: "startTime" },
                { label: "Recording",   key: null },
              ].map(({ label, key }) => (
                <th key={label} style={thStyle(key ?? undefined)} onClick={() => key && toggleSort(key)}>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    {label}
                    {key && <SortIcon col={key} sortKey={sortKey} dir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              skeletonRows.map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={tdStyle}>
                      <div style={{
                        height: 12, borderRadius: 6,
                        background: skelBg,
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s infinite",
                        width: j === 0 ? "80%" : j === 6 ? "40%" : "60%",
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: "48px 0" }}>
                  <div style={{ color: emptyColor, fontSize: 13, fontWeight: 500 }}>
                    {search ? "No results match your search" : "No call logs found"}
                  </div>
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        marginTop: 10, padding: "6px 14px", borderRadius: 8,
                        border: `1px solid ${clearBtnBorder}`,
                        background: clearBtnBg,
                        fontSize: 12, color: clearBtnColor, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={row.sessionId ?? i}
                  style={{ background: i % 2 === 0 ? rowEven : rowOdd, transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? rowEven : rowOdd)}
                >
                  {/* Number */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: numColor, fontFamily: "monospace", letterSpacing: "0.01em" }}>
                      {row.number || row.formatted || "—"}
                    </span>
                  </td>

                  {/* Agent */}
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: agentAvBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#4F46E5",
                        border: `1px solid ${agentAvBorder}`,
                      }}>
                        {(row.agentName || "—").charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: agentColor }}>
                        {row.agentName || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Direction */}
                  <td style={tdStyle}><DirectionBadge direction={row.direction} isDark={isDark} /></td>

                  {/* Status */}
                  <td style={tdStyle}><StatusBadge type={row.type} isDark={isDark} /></td>

                  {/* Duration */}
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 12, fontFamily: "monospace",
                      color: row.duration > 0 ? "#059669" : (isDark ? "#3A3A4A" : "#94A3B8"),
                      fontWeight: row.duration > 0 ? 600 : 400,
                    }}>
                      {fmtDuration(row.duration)}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: dateColor, whiteSpace: "nowrap" }}>
                      {fmtDate(row.startTime)}
                    </span>
                  </td>

                  {/* Recording */}
                  <td style={tdStyle}>
                    {row.recordingUrl ? (
                      <button
                        onClick={() => onPlayRecording?.(row.recordingUrl!)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 11px", borderRadius: 7,
                          background: playBg, color: "#4F46E5",
                          border: `1px solid ${playBorder}`,
                          cursor: "pointer", fontSize: 11, fontWeight: 700,
                          fontFamily: "inherit", transition: "all 0.12s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = playBgHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = playBg; }}
                      >
                        ▶ Play
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: dashColor }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <PaginationBar
        page={page} totalPages={totalPages} total={total} limit={limit}
        onPageChange={onPageChange} onLimitChange={onLimitChange}
        loading={loading} isDark={isDark}
      />
    </div>
  );
}