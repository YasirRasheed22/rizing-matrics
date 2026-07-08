// src/pages/TeamCallPage.tsx
// @ts-nocheck
// Sidebar page: lists teammates who have the "teamCalls" privilege
// enabled and lets an agent start a free (Twilio-free) P2P call to any
// of them. Backend endpoint (/auth/team-call-agents) already filters by
// additionalRole.teamCalls=true, supports search + page/limit so this
// stays cheap even if the agent list grows into the thousands:
//   - Grid view  → infinite scroll (IntersectionObserver, appends pages)
//   - Table view → explicit page-number pagination (replaces page)
import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, Users, Loader2, RefreshCw, Wifi, Search, LayoutGrid, List, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import api from "../api";
import { useTeamCall } from "../context/TeamCallContext";
import TeamCallChat from "../components/TeamCallChat";

function useLocalTheme(): "dark" | "light" {
  const [theme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as any) || "light"; } catch { return "light"; }
  });
  return theme;
}

function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const PAGE_SIZE = 24;

export default function TeamCallPage() {
  const call = useTeamCall();
  const isDark = useLocalTheme() === "dark";

  // open chat widget peer — independent of call state
  const [chatPeer, setChatPeer] = useState<{ id: number|string; name: string }|null>(null);
  const openChat = (agent: any) => setChatPeer({ id: agent.id, name: agent.name || "Agent" });

  const [view, setView] = useState<"grid" | "table">("grid");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);

  const [agents, setAgents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const tk = {
    text: isDark ? "#F1F5F9" : "#0F172A",
    muted: isDark ? "#94A3B8" : "#64748B",
    card: isDark ? "#15182A" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    pageBg: isDark ? "#0B0E1A" : "#F6F7F9",
    input: isDark ? "#1B1F33" : "#FFFFFF",
    p: "#6366F1",
    pSoft: isDark ? "rgba(99,102,241,0.16)" : "#EEF2FF",
    green: "#22C55E",
    rowHover: isDark ? "#1B1F33" : "#FAFAFA",
  };

  // ── fetch a page; grid mode appends, table mode replaces ──
  const fetchPage = useCallback(async (targetPage: number, mode: "replace" | "append") => {
    const myRequestId = ++requestIdRef.current;
    mode === "append" ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await api.get("/auth/team-call-agents", {
        params: { page: targetPage, limit: PAGE_SIZE, search: search || undefined },
      });
      if (myRequestId !== requestIdRef.current) return; // stale response — a newer search/page superseded it

      const data = res.data?.data || [];
      const pag = res.data?.pagination || { page: targetPage, limit: PAGE_SIZE, total: 0, totalPages: 1 };
      setPagination(pag);
      setPage(targetPage);
      setAgents(prev => (mode === "append" ? [...prev, ...data] : data));
    } catch (err) {
      console.error("TeamCallPage: failed to load agents", err);
    } finally {
      if (myRequestId === requestIdRef.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [search]);

  // Search or view change → start over from page 1.
  useEffect(() => { fetchPage(1, "replace"); }, [search, view, fetchPage]);

  // ── infinite scroll (grid mode only) ──
  useEffect(() => {
    if (view !== "grid") return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !loading && !loadingMore && page < pagination.totalPages) {
        fetchPage(page + 1, "append");
      }
    }, { rootMargin: "200px" });

    observer.observe(el);
    return () => observer.disconnect();
  }, [view, page, pagination.totalPages, loading, loadingMore, fetchPage]);

  const busy = call?.status && call.status !== "IDLE";
  const startCall = (agent: any) => call?.startCall({ id: agent.id, name: agent.name, sipIdentity: agent.sipIdentity });
  const startChat = (agent: any) => openChat(agent);

  return (
    <>
    <div style={{ padding: 24, minHeight: "100%", background: tk.pageBg }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tk.text, display: "flex", alignItems: "center", gap: 9 }}>
            <Users size={20} color={tk.p} /> Team Call
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: tk.muted }}>
            Call any teammate with Team Call enabled
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: `1px solid ${tk.border}`, borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              style={{
                padding: "8px 11px", border: "none", cursor: "pointer",
                background: view === "grid" ? tk.pSoft : tk.card,
                color: view === "grid" ? tk.p : tk.muted,
                display: "flex", alignItems: "center",
              }}
            ><LayoutGrid size={15} /></button>
            <button
              onClick={() => setView("table")}
              title="Table view"
              style={{
                padding: "8px 11px", border: "none", cursor: "pointer",
                background: view === "table" ? tk.pSoft : tk.card,
                color: view === "table" ? tk.p : tk.muted,
                display: "flex", alignItems: "center",
                borderLeft: `1px solid ${tk.border}`,
              }}
            ><List size={15} /></button>
          </div>

          <button
            onClick={() => fetchPage(1, "replace")}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
              padding: "8px 14px", borderRadius: 10, border: `1px solid ${tk.border}`,
              background: tk.card, color: tk.text, cursor: "pointer",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
        <Search size={14} color={tk.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search teammates by name…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 34px",
            borderRadius: 10, border: `1px solid ${tk.border}`, background: tk.input, color: tk.text,
            fontSize: 13, outline: "none",
          }}
        />
      </div>

      {busy && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 12,
          background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)",
          fontSize: 12.5, fontWeight: 600, color: "#B45309",
        }}>
          You're currently {call.status === "INCOMING" ? "receiving" : "in"} a team call — finish or decline it before starting another.
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: tk.muted, fontSize: 13, padding: "24px 0" }}>
          <Loader2 size={16} style={{ animation: "aio-spin 1s linear infinite" }} /> Loading teammates…
        </div>
      ) : agents.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 0", color: tk.muted,
          border: `1px dashed ${tk.border}`, borderRadius: 16,
        }}>
          {search ? `No teammates match "${search}".` : "No teammates have Team Call enabled right now."}
        </div>
      ) : view === "grid" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} tk={tk} busy={busy} onCall={() => startCall(agent)} onChat={() => startChat(agent)} />
            ))}
          </div>
          {/* infinite-scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: 16, color: tk.muted, fontSize: 12.5 }}>
              <Loader2 size={14} style={{ animation: "aio-spin 1s linear infinite", marginRight: 6 }} /> Loading more…
            </div>
          )}
          {!loadingMore && page >= pagination.totalPages && agents.length > 0 && (
            <div style={{ textAlign: "center", padding: 16, color: tk.muted, fontSize: 12 }}>
              All {pagination.total} teammate{pagination.total === 1 ? "" : "s"} loaded.
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ borderRadius: 16, border: `1px solid ${tk.border}`, overflow: "hidden", background: tk.card }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Agent", "Status", ""].map(h => (
                    <th key={h} style={{
                      textAlign: h === "" ? "right" : "left", padding: "11px 16px",
                      fontSize: 10.5, fontWeight: 800, color: tk.muted, textTransform: "uppercase", letterSpacing: "0.05em",
                      borderBottom: `1px solid ${tk.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => (
                  <tr key={agent.id} style={{ borderBottom: i === agents.length - 1 ? "none" : `1px solid ${tk.border}` }}>
                    <td style={{ padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: tk.pSoft, color: tk.p,
                        fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{(agent.name?.[0] || "?").toUpperCase()}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{agent.name || "Agent"}</span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: tk.green, fontWeight: 600 }}>
                        <Wifi size={11} /> Online
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => startChat(agent)}
                          title="Chat"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "6px 12px", borderRadius: 999, border: "none",
                            background: isDark ? "rgba(99,102,241,0.18)" : "#EEF2FF",
                            color: "#6366F1",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}
                        ><MessageCircle size={12} /> Chat</button>
                        <button
                          disabled={busy}
                          onClick={() => startCall(agent)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: 999, border: "none",
                            background: busy ? (isDark ? "#262A3D" : "#E5E7EB") : tk.green,
                            color: busy ? tk.muted : "#fff",
                            fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
                          }}
                        ><Phone size={12} /> Call</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12.5, color: tk.muted }}>
            <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} teammate{pagination.total === 1 ? "" : "s"}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={page <= 1 || loading}
                onClick={() => fetchPage(page - 1, "replace")}
                style={pagerBtnStyle(tk, page <= 1)}
              ><ChevronLeft size={14} /></button>
              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => fetchPage(page + 1, "replace")}
                style={pagerBtnStyle(tk, page >= pagination.totalPages)}
              ><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes aio-spin{to{transform:rotate(360deg)}}`}</style>
    </div>

    {/* Floating chat widget — rendered outside the scroll container */}
    {chatPeer && (
      <TeamCallChat
        peer={chatPeer}
        onClose={() => setChatPeer(null)}
      />
    )}
  </>
  );
}

function pagerBtnStyle(tk: any, disabled: boolean) {
  return {
    width: 30, height: 30, borderRadius: 8, border: `1px solid ${tk.border}`,
    background: tk.card, color: disabled ? tk.muted : tk.text,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}

function AgentCard({ agent, tk, busy, onCall, onChat }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px", borderRadius: 16,
      background: tk.card, border: `1px solid ${tk.border}`,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        background: tk.pSoft, color: tk.p, fontWeight: 800, fontSize: 15,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        {(agent.name?.[0] || "?").toUpperCase()}
        <span style={{
          position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderRadius: "50%",
          background: tk.green, border: `2px solid ${tk.card}`,
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {agent.name || "Agent"}
        </div>
        <div style={{ fontSize: 11, color: tk.muted, display: "flex", alignItems: "center", gap: 4 }}>
          <Wifi size={10} color={tk.green} /> Online
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={onChat}
          title={`Chat with ${agent.name}`}
          style={{
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: tk.pSoft,
            color: tk.p,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MessageCircle size={14} />
        </button>
        <button
          disabled={busy}
          onClick={onCall}
          title={busy ? "Finish your current team call first" : `Call ${agent.name}`}
          style={{
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: busy ? (tk.muted) : tk.green,
            color: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Phone size={14} />
        </button>
      </div>
    </div>
  );
}
