// @ts-nocheck
// ============================================================================
//  CallParticipantsPanel.tsx  —  DROP-IN single file
//
//  BACKEND endpoints (all registered):
//    GET  /voice/conference/:conferenceFriendlyName/participants
//    POST /voice/conference/remove-participant   { conferenceFriendlyName, participantCallSid }
//    POST /voice/conference/hold-participant     { conferenceFriendlyName, participantCallSid, hold }
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { Users, User, ArrowRightLeft, UserMinus, Pause, Play } from "lucide-react";

const API_BASE = "https://api.rizingmatrics.com";

/* ─── theme ─── */
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as any) || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) setTheme(e.newValue);
    };
    window.addEventListener("storage", h);
    const iv = setInterval(() => {
      try { const v = localStorage.getItem("theme") as any; if (v === "dark" || v === "light") setTheme(v); } catch {}
    }, 800);
    return () => { window.removeEventListener("storage", h); clearInterval(iv); };
  }, []);
  return theme;
}

function tokens(d: boolean) {
  return {
    text:      d ? "#F1F5F9" : "#0F172A",
    muted:     d ? "#94A3B8" : "#64748B",
    faint:     d ? "#475569" : "#94A3B8",
    surf:      d ? "rgba(255,255,255,0.06)" : "#F6F7F9",
    surf2:     d ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    border:    d ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    pSoft:     d ? "rgba(99,102,241,0.16)" : "#EEF2FF",
    pBord:     d ? "rgba(99,102,241,0.30)" : "rgba(99,102,241,0.22)",
    pText:     d ? "#A5B4FC" : "#4338CA",
    green:     "#22C55E",
    greenSoft: d ? "rgba(34,197,94,0.14)" : "#DCFCE7",
    greenBord: d ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.25)",
    greenText: d ? "#4ADE80" : "#15803D",
    amber:     "#F59E0B",
    amberSoft: d ? "rgba(245,158,11,0.14)" : "#FFFBEB",
    amberBord: d ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.25)",
    amberText: d ? "#FCD34D" : "#B45309",
    red:       "#EF4444",
    redSoft:   d ? "rgba(239,68,68,0.14)" : "#FEF2F2",
    redBord:   d ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.25)",
    redText:   d ? "#F87171" : "#B91C1C",
  };
}

function statusBadge(p: any, heldSet: Set<string>, t: ReturnType<typeof tokens>) {
  // Local optimistic hold overrides server state
  const onHold = heldSet.has(p.callSid) || !!p.hold;
  if (onHold) return { label: "On Hold", color: t.amberText, bg: t.amberSoft, bord: t.amberBord, pulse: false };
  const s = (p?.status || "").toLowerCase();
  if (["ringing", "queued", "initiated", "dialing"].includes(s))
    return { label: "Ringing…", color: t.amberText, bg: t.amberSoft, bord: t.amberBord, pulse: true };
  if (["no-answer", "busy", "failed", "canceled"].includes(s))
    return { label: "No answer", color: t.redText, bg: t.redSoft, bord: t.redBord, pulse: false };
  return { label: "Connected", color: t.greenText, bg: t.greenSoft, bord: t.greenBord, pulse: false };
}

const displayLabel = (p: any) => p?.displayName || p?.number || p?.identity || "Unknown";

interface Props {
  conferenceName: string | null | undefined;
  selfCallSid?: string | null;
  pollMs?: number;
  apiBase?: string;
  getToken?: () => string | null;
  apiClient?: any;
}

export default function CallParticipantsPanel({
  conferenceName,
  selfCallSid = null,
  pollMs = 3000,
  apiBase = API_BASE,
  getToken = () => { try { return localStorage.getItem("token"); } catch { return null; } },
  apiClient,
}: Props) {
  const isDark = useLocalTheme() === "dark";
  const t = tokens(isDark);

  const [participants, setParticipants] = useState<any[]>([]);
  const [removeBusy, setRemoveBusy]     = useState<string | null>(null);
  const [holdBusy,   setHoldBusy]       = useState<string | null>(null);
  // Optimistic local hold state — keyed by callSid, value = true(held)/false(live)
  const [heldLocal, setHeldLocal]       = useState<Map<string, boolean>>(new Map());
  const cancelledRef = useRef(false);

  const authHeaders = () => {
    const tok = getToken?.();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  };

  /* ─── fetch ─── */
  const fetchParticipants = async () => {
    if (!conferenceName) return;
    try {
      let list: any[] = [];
      if (apiClient) {
        const { data } = await apiClient.get(`/voice/conference/${encodeURIComponent(conferenceName)}/participants`);
        list = Array.isArray(data?.participants) ? data.participants : [];
      } else {
        const res = await fetch(`${apiBase}/voice/conference/${encodeURIComponent(conferenceName)}/participants`,
          { headers: authHeaders() });
        const data = res.ok ? await res.json() : {};
        list = Array.isArray(data?.participants) ? data.participants : [];
      }
      if (cancelledRef.current) return;
      setParticipants(list.filter((p) => p?.kind !== "supervisor"));
      // Sync optimistic map: remove entries that server confirms
      setHeldLocal(prev => {
        const next = new Map(prev);
        list.forEach(p => {
          if (next.has(p.callSid) && next.get(p.callSid) === !!p.hold) {
            next.delete(p.callSid); // server caught up
          }
        });
        return next;
      });
    } catch {
      if (!cancelledRef.current) setParticipants([]);
    }
  };

  /* ─── poll ─── */
  useEffect(() => {
    cancelledRef.current = false;
    if (!conferenceName) { setParticipants([]); return; }
    fetchParticipants();
    const iv = setInterval(fetchParticipants, pollMs);
    return () => { cancelledRef.current = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferenceName, pollMs]);

  /* ─── hold toggle ─── */
  const handleHold = async (callSid: string, currentlyHeld: boolean) => {
    if (!conferenceName || !callSid || holdBusy) return;
    const newHold = !currentlyHeld;
    setHoldBusy(callSid);
    // Optimistic update
    setHeldLocal(prev => new Map(prev).set(callSid, newHold));
    try {
      if (apiClient) {
        await apiClient.post("/voice/conference/hold-participant", {
          conferenceFriendlyName: conferenceName,
          participantCallSid: callSid,
          hold: newHold,
        });
      } else {
        await fetch(`${apiBase}/voice/conference/hold-participant`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ conferenceFriendlyName: conferenceName, participantCallSid: callSid, hold: newHold }),
        });
      }
    } catch {
      // revert optimistic on failure
      setHeldLocal(prev => { const m = new Map(prev); m.delete(callSid); return m; });
    } finally {
      setHoldBusy(null);
      setTimeout(fetchParticipants, 600);
    }
  };

  /* ─── remove ─── */
  const handleRemove = async (callSid: string) => {
    if (!conferenceName || !callSid) return;
    setRemoveBusy(callSid);
    setParticipants(prev => prev.filter(p => p.callSid !== callSid));
    try {
      if (apiClient) {
        await apiClient.post("/voice/conference/remove-participant", {
          conferenceFriendlyName: conferenceName, participantCallSid: callSid,
        });
      } else {
        await fetch(`${apiBase}/voice/conference/remove-participant`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ conferenceFriendlyName: conferenceName, participantCallSid: callSid }),
        });
      }
    } catch { /* next poll restores if needed */ }
    finally {
      setRemoveBusy(null);
      setTimeout(fetchParticipants, 600);
    }
  };

  if (!conferenceName || participants.length === 0) return null;

  // Build Set of locally-held callSids for O(1) lookup
  const heldSet = new Set<string>();
  heldLocal.forEach((held, sid) => { if (held) heldSet.add(sid); });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.10em",
        textTransform: "uppercase", color: t.muted,
      }}>
        <Users size={12} /> In this call · {participants.length}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {participants.map((p) => {
          const isSelf      = !!selfCallSid && p.callSid === selfCallSid;
          const isTransfer  = p.kind === "transfer" || p.isTransfer;
          const isHeld      = heldSet.has(p.callSid) || !!p.hold;
          const st          = statusBadge(p, heldSet, t);
          const isRemoving  = removeBusy === p.callSid;
          const isHolding   = holdBusy   === p.callSid;

          return (
            <div key={p.callSid} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 12,
              background: isHeld
                ? (isDark ? "rgba(245,158,11,0.07)" : "#fffbeb")
                : t.surf2,
              border: `1px solid ${isHeld ? t.amberBord : t.border}`,
              opacity: isRemoving ? 0.45 : 1,
              transition: "background 0.2s, border-color 0.2s, opacity 0.15s",
            }}>

              {/* avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: isTransfer ? t.pSoft : t.surf,
                border: `1px solid ${isTransfer ? t.pBord : t.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isTransfer ? t.pText : t.muted,
              }}>
                {isTransfer ? <ArrowRightLeft size={13} /> : <User size={14} />}
              </div>

              {/* name + kind */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {displayLabel(p)}
                  {isSelf && <span style={{ color: t.muted, fontWeight: 600 }}> · You</span>}
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: t.faint, marginTop: 1, textTransform: "capitalize" }}>
                  {isTransfer ? "Transfer target" : p.kind || "participant"}
                </div>
              </div>

              {/* status badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 9, fontWeight: 800, color: st.color,
                background: st.bg, border: `1px solid ${st.bord}`,
                borderRadius: 999, padding: "3px 8px",
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", background: st.color,
                  animation: st.pulse ? "cpp-pulse 1.4s ease-in-out infinite" : "none",
                }} />
                {st.label}
              </span>

              {/* ── action buttons (only for non-self legs) ── */}
              {!isSelf && (
                <>
                  {/* Hold / Resume */}
                  <button
                    onClick={() => handleHold(p.callSid, isHeld)}
                    disabled={!!isHolding || !!isRemoving}
                    title={isHeld ? "Resume" : "Hold"}
                    style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      border: `1px solid ${isHeld ? t.amberBord : t.border}`,
                      background: isHeld ? t.amberSoft : t.surf,
                      color: isHeld ? t.amber : t.muted,
                      cursor: (isHolding || isRemoving) ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: isHolding ? 0.5 : 1,
                      transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    }}
                  >
                    {isHeld ? <Play size={11} /> : <Pause size={11} />}
                  </button>

                  {/* Remove / End */}
                  <button
                    onClick={() => handleRemove(p.callSid)}
                    disabled={!!isRemoving || !!isHolding}
                    title="Remove from call"
                    style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      border: `1px solid ${t.redBord}`,
                      background: t.redSoft, color: t.red,
                      cursor: (isRemoving || isHolding) ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: isRemoving ? 0.5 : 1,
                    }}
                  >
                    <UserMinus size={13} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes cpp-pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
