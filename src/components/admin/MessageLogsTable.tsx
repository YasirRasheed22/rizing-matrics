// src/components/admin/MessageLogsTable.tsx
//@ts-nocheck
import React, { useState, useMemo } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, MessageCircle,
  Search, X, ChevronLeft, ChevronRight, ChevronsUpDown,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { getAppTz } from "../../hooks/dateFormat";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MessageLog {
  sid: string;
  date: string;
  direction: string;
  from: string;
  to: string;
  body: string;
  segments: number;
  status: string;
  media?: string;
}

export interface MessageLogsTableProps {
  logs: MessageLog[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onViewBody?: (text: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: getAppTz(),
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; dot: string }> = {
    delivered:   { color: "#059669", dot: "#10B981" },
    received:    { color: "#059669", dot: "#10B981" },
    sent:        { color: "#4F46E5", dot: "#6366F1" },
    accepted:    { color: "#4F46E5", dot: "#6366F1" },
    failed:      { color: "#DC2626", dot: "#EF4444" },
    undelivered: { color: "#D97706", dot: "#F59E0B" },
  };
  const key = status?.toLowerCase() ?? "";
  const c = map[key] ?? { color: "#6B7280", dot: "#9CA3AF" };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      color: c.color,
      background: c.color + "18",
      border: `1px solid ${c.color}28`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── Direction badge ──────────────────────────────────────────────────────────
function DirectionBadge({ direction }: { direction: string }) {
  const isIn = direction?.toLowerCase() === "inbound";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: isIn ? "#ECFDF5" : "#EEF2FF",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${isIn ? "#A7F3D0" : "#C7D2FE"}`,
      }}>
        {isIn
          ? <ArrowDownCircle size={11} color="#059669" />
          : <ArrowUpCircle   size={11} color="#4F46E5" />}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: isIn ? "#059669" : "#4F46E5", textTransform: "capitalize" }}>
        {isIn ? "Inbound" : "Outbound"}
      </span>
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, dir }: { col: string; sortKey: string; dir: "asc" | "desc" }) {
  if (sortKey !== col) return <ChevronsUpDown size={12} style={{ color: "#CBD5E1", marginLeft: 3 }} />;
  return dir === "asc"
    ? <ChevronUp   size={12} style={{ color: "#4F46E5", marginLeft: 3 }} />
    : <ChevronDown size={12} style={{ color: "#4F46E5", marginLeft: 3 }} />;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, total, limit, onPageChange, onLimitChange, loading }: {
  page: number; totalPages: number; total: number; limit: number;
  onPageChange: (p: number) => void; onLimitChange: (l: number) => void;
  loading?: boolean;
}) {
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
    border: "1px solid rgba(0,0,0,0.08)",
    background: disabled ? "#F8FAFC" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "#CBD5E1" : "#374151",
  });

  const pgBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 30, height: 30, borderRadius: 7, padding: "0 6px",
    fontSize: 12, fontWeight: active ? 700 : 500,
    border: active ? "1px solid #4F46E5" : "1px solid rgba(0,0,0,0.08)",
    background: active ? "#4F46E5" : "#fff",
    color: active ? "#fff" : "#374151",
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: active ? "0 2px 8px rgba(79,70,229,0.28)" : "none",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10, padding: "12px 20px",
      borderTop: "1px solid rgba(0,0,0,0.055)",
      background: "#FAFAFA", borderRadius: "0 0 16px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
          {total === 0 ? "No records" : `${from}–${to} of ${total.toLocaleString()} messages`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rows</span>
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} disabled={loading}
            style={{ padding: "4px 8px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "1px solid rgba(0,0,0,0.09)", background: "#fff", color: "#374151", cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
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
              <span key={`e${i}`} style={{ fontSize: 12, color: "#CBD5E1", padding: "0 2px", userSelect: "none" }}>…</span>
            ) : (
              <button key={p} style={pgBtn(p === page)} disabled={loading} onClick={() => onPageChange(p as number)}>{p}</button>
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function MessageLogsTable({
  logs,
  loading = false,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  onViewBody,
}: MessageLogsTableProps) {
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Client-side search within current page
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((r) =>
      (r.from      || "").toLowerCase().includes(q) ||
      (r.to        || "").toLowerCase().includes(q) ||
      (r.body      || "").toLowerCase().includes(q) ||
      (r.status    || "").toLowerCase().includes(q) ||
      (r.direction || "").toLowerCase().includes(q) ||
      (r.sid       || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Client-side sort within current page
  const sorted = useMemo(() => {
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
    textTransform: "uppercase", color: "#94A3B8",
    textAlign: "left", whiteSpace: "nowrap",
    cursor: key ? "pointer" : "default",
    userSelect: "none",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: key && sortKey === key ? "#F5F3FF" : "#FAFAFA",
    transition: "background 0.12s",
  });

  const tdStyle: React.CSSProperties = {
    padding: "11px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.045)",
    verticalAlign: "middle",
  };

  const skeletonRows = Array.from({ length: Math.min(limit, 10) });

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.07)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    //   overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", gap: 12,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        {/* Search */}
        <div style={{
          padding: "5px 12px", borderRadius: 8,
          background: "#F1F5F9", fontSize: 11, fontWeight: 700,
          color: "#64748B", whiteSpace: "nowrap", letterSpacing: "0.04em",
        }}>
          {loading ? "Loading…" : `${total.toLocaleString()} total`}
        </div>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#94A3B8", pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="Search within this page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "7px 30px 7px 30px",
              borderRadius: 9, border: "1px solid rgba(0,0,0,0.09)",
              background: "#F8FAFC", fontSize: 12,
              
              color: "#0D0D12", outline: "none", fontFamily: "inherit",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", color: "#94A3B8", padding: 0,
            }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Count badge */}
        
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
          <thead>
            <tr>
              {[
                { label: "Date & Time", key: "date" },
                { label: "Direction",   key: "direction" },
                { label: "From",        key: "from" },
                { label: "To",          key: "to" },
                { label: "Body",        key: null },
                { label: "Segments",    key: "segments" },
                { label: "Status",      key: "status" },
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
                        background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s infinite",
                        width: j === 4 ? "70%" : j === 6 ? "45%" : "60%",
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: "48px 0" }}>
                  <div style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 500 }}>
                    {search ? "No results match your search" : "No messages found"}
                  </div>
                  {search && (
                    <button onClick={() => setSearch("")} style={{
                      marginTop: 10, padding: "6px 14px", borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.09)", background: "#F8FAFC",
                      fontSize: 12, color: "#64748B", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.sid ?? i}
                  style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFD", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F0F4FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFBFD")}
                >
                  {/* Date */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                      {fmtDate(row.date)}
                    </span>
                  </td>

                  {/* Direction */}
                  <td style={tdStyle}><DirectionBadge direction={row.direction} /></td>

                  {/* From */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#374151", fontWeight: 500 }}>
                      {row.from || "—"}
                    </span>
                  </td>

                  {/* To */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#374151", fontWeight: 500 }}>
                      {row.to || "—"}
                    </span>
                  </td>

                  {/* Body */}
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 220 }}>
                      <span style={{
                        fontSize: 12, color: "#64748B",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {row.body ? (row.body.length > 45 ? row.body.slice(0, 45) + "…" : row.body) : "(empty)"}
                      </span>
                      {row.body && (
                        <button
                          onClick={() => onViewBody?.(row.body)}
                          title="View full message"
                          style={{
                            width: 24, height: 24, borderRadius: 6, border: "none", flexShrink: 0,
                            background: "rgba(79,70,229,0.10)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(79,70,229,0.20)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(79,70,229,0.10)")}
                        >
                          <MessageCircle size={11} color="#4F46E5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Segments */}
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#64748B",
                      background: "#F1F5F9", padding: "2px 8px",
                      borderRadius: 99, display: "inline-block",
                    }}>
                      {row.segments ?? 1}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={tdStyle}><StatusBadge status={row.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Shimmer keyframe */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Pagination ── */}
      <PaginationBar
        page={page} totalPages={totalPages} total={total} limit={limit}
        onPageChange={onPageChange} onLimitChange={onLimitChange} loading={loading}
      />
    </div>
  );
}