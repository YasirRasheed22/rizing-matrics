// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import {
  Phone, SkipForward, ChevronDown, ChevronUp,
  Zap, CheckCircle, AlertCircle, Eye, ArrowRight,
  User, Building2, Tag, Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";
import { useAutoDialEngine, type DialState, type DialingMode } from "../hooks/useAutoDialEngine";

/* ─── Mode meta ──────────────────────────────────────────── */
const MODE_META: Record<DialingMode, { label: string; icon: any; color: string; desc: string }> = {
  preview:     { label: "Preview",     icon: Eye,        color: "#6366F1", desc: "Agent reviews before calling" },
  progressive: { label: "Progressive", icon: ArrowRight, color: "#0EA5E9", desc: "Auto-dials one at a time" },
  power:       { label: "Power",       icon: Zap,        color: "#F59E0B", desc: "Immediate next call" },
};

function stateLabel(s: DialState) {
  const map: Record<DialState, string> = {
    idle: "Idle", preview: "Review",
    dialing: "Dialing…", on_call: "On Call", cooldown: "Next up…",
  };
  return map[s] ?? s;
}

/* ─── Theme tokens ───────────────────────────────────────── */
function tokens(enabled: boolean) {
  if (enabled) {
    return {
      bg: "linear-gradient(135deg,#5B5BD6 0%,#4A4AC9 100%)",
      text: "#fff", textSub: "rgba(255,255,255,0.6)", textTert: "rgba(255,255,255,0.4)",
      statBg: "rgba(255,255,255,0.12)", statText: "rgba(255,255,255,0.9)", statLabel: "rgba(255,255,255,0.5)",
      cardBg: "rgba(255,255,255,0.1)", cardBorder: "rgba(255,255,255,0.14)",
      toggleTrack: "rgba(255,255,255,0.28)", toggleThumb: "#fff",
      chevron: "rgba(255,255,255,0.55)", iconBg: "rgba(255,255,255,0.18)", iconColor: "#fff",
      queueItemBg: "rgba(255,255,255,0.07)", queueItemHover: "rgba(255,255,255,0.13)",
      queueText: "rgba(255,255,255,0.8)",
      infoBg: "rgba(255,255,255,0.08)", infoBorder: "rgba(255,255,255,0.1)", infoText: "rgba(255,255,255,0.6)",
      skipBg: "transparent", skipBorder: "rgba(255,255,255,0.2)", skipText: "rgba(255,255,255,0.7)",
      numBg: "rgba(255,255,255,0.12)", numText: "#fff",
      shadow: "0 8px 32px rgba(91,91,214,0.35)", border: "none", radius: "var(--r-xl)",
    };
  }
  return {
    bg: "var(--bg-surface)", text: "var(--text-primary)", textSub: "var(--text-secondary)", textTert: "var(--text-tertiary)",
    statBg: "var(--bg-surface-2)", statText: "var(--text-primary)", statLabel: "var(--text-tertiary)",
    cardBg: "var(--bg-surface-2)", cardBorder: "var(--border)",
    toggleTrack: "var(--border-strong)", toggleThumb: "var(--text-tertiary)",
    chevron: "var(--text-tertiary)", iconBg: "var(--accent-light)", iconColor: "var(--accent)",
    queueItemBg: "var(--bg-surface-2)", queueItemHover: "var(--bg-hover)",
    queueText: "var(--text-primary)",
    infoBg: "var(--bg-surface-2)", infoBorder: "var(--border)", infoText: "var(--text-secondary)",
    skipBg: "var(--bg-surface)", skipBorder: "var(--border-strong)", skipText: "var(--text-secondary)",
    numBg: "var(--accent-light)", numText: "var(--accent)",
    shadow: "var(--shadow-lg)", border: "1px solid var(--border-strong)", radius: "var(--r-full)",
  };
}

/* ─── StatBox ────────────────────────────────────────────── */
function StatBox({ label, value, t }: { label: string; value: any; t: ReturnType<typeof tokens> }) {
  return (
    <div style={{ background: t.statBg, borderRadius: "var(--r-md)", padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: t.statText, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, marginTop: 3, color: t.statLabel }}>{label}</div>
    </div>
  );
}

/* ─── ContactTooltip ─────────────────────────────────────── */
interface TooltipContact {
  id: number;
  phoneNumber: string;
  status: string;
  priority?: number;
  contact?: { firstName: string; lastName: string } | null;
  campaign?: { id: number; name: string; dialingMode: DialingMode } | null;
}

function ContactTooltip({ item, position }: { item: TooltipContact; position: { top: number; left: number; placement: "left" | "right" } }) {
  const mode = (item.campaign?.dialingMode || "progressive") as DialingMode;
  const m    = MODE_META[mode];
  const ModeIcon = m.icon;

  const contactName = item.contact
    ? `${item.contact.firstName} ${item.contact.lastName}`.trim()
    : null;

  const initials = contactName
    ? contactName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : item.phoneNumber.slice(-2);

  const statusColors: Record<string, string> = {
    pending:          "#6B7280",
    reserved:         "#7C3AED",
    dialing:          "#2563EB",
    retry_scheduled:  "#D38A00",
  };
  const statusColor = statusColors[item.status] ?? "#6B7280";

  const arrowLeft  = position.placement === "left";

  return (
    <div style={{
      position: "fixed",
      top: position.top,
      left: position.left,
      zIndex: 9999,
      pointerEvents: "none",
      transform: "translateY(-50%)",
    }}>
      {/* Arrow */}
      <div style={{
        position: "absolute",
        top: "50%",
        [arrowLeft ? "right" : "left"]: -6,
        transform: "translateY(-50%)",
        width: 0, height: 0,
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        [arrowLeft ? "borderLeft" : "borderRight"]: "6px solid var(--bg-surface)",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
      }} />

      {/* Card */}
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--r-lg)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)",
        padding: "14px",
        width: 230,
        animation: "tooltip-in 0.15s cubic-bezier(0.16,1,0.3,1)",
      }}>

        {/* Header — avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "var(--r-full)", flexShrink: 0,
            background: "var(--accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "var(--accent)",
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 13, color: "var(--text-primary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {contactName || "Unknown Contact"}
            </div>
            <div style={{
              fontSize: 11, color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)", marginTop: 2,
            }}>
              {item.phoneNumber}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />

        {/* Info rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>

          {/* Campaign */}
          {item.campaign && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "var(--r-md)", flexShrink: 0,
                background: "var(--bg-surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Layers size={12} color="var(--text-tertiary)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 1 }}>Campaign</div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.campaign.name}
                </div>
              </div>
            </div>
          )}

          {/* Dialing Mode */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "var(--r-md)", flexShrink: 0,
              background: `${m.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ModeIcon size={12} color={m.color} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 1 }}>Dialing Mode</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>· {m.desc}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "var(--r-md)", flexShrink: 0,
              background: "var(--bg-surface-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "var(--r-full)", background: statusColor }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 1 }}>Status</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: statusColor, textTransform: "capitalize" }}>
                {item.status.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Priority — sirf agar > 0 */}
          {item.priority != null && item.priority > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "var(--r-md)", flexShrink: 0,
                background: "#FEF3C7",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Tag size={11} color="#D38A00" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 1 }}>Priority</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#D38A00" }}>
                  Level {item.priority}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)",
          fontSize: 10, color: "var(--text-tertiary)", textAlign: "center",
        }}>
          Will be dialed in queue order
        </div>
      </div>
    </div>
  );
}

/* ─── QueueItemRow with tooltip ──────────────────────────── */
function QueueItemRow({
  item, index, t,
}: {
  item: TooltipContact;
  index: number;
  t: ReturnType<typeof tokens>;
}) {
  const [tooltip, setTooltip] = useState<{ top: number; left: number; placement: "left" | "right" } | null>(null);
  const rowRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const m  = MODE_META[(item.campaign?.dialingMode || "progressive") as DialingMode];
  const MI = m.icon;

  const showTooltip = () => {
    timerRef.current = setTimeout(() => {
      if (!rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft  = rect.left;
      const tooltipW   = 244; // card width + arrow

      if (spaceRight >= tooltipW) {
        setTooltip({ top: midY, left: rect.right + 10, placement: "right" });
      } else {
        setTooltip({ top: midY, left: rect.left - tooltipW + 6, placement: "left" });
      }
    }, 350); // 350ms delay before show
  };

  const hideTooltip = () => {
    clearTimeout(timerRef.current);
    setTooltip(null);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      <div
        ref={rowRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px", borderRadius: "var(--r-md)", marginBottom: 4,
          background: t.queueItemBg,
          cursor: "default",
          transition: "background 0.15s",
        }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = t.queueItemHover; }}
        onMouseOut={e => {
          (e.currentTarget as HTMLElement).style.background = t.queueItemBg;
        }}
      >
        {/* Number badge */}
        <div style={{
          width: 18, height: 18, borderRadius: "var(--r-full)", flexShrink: 0,
          background: t.numBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: t.numText,
        }}>{index + 1}</div>

        {/* Name */}
        <div style={{
          fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0,
          color: t.queueText,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.contact
            ? `${item.contact.firstName} ${item.contact.lastName}`
            : item.phoneNumber}
        </div>

        {/* Mode icon */}
        <div title={m.label} style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          background: `${m.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <MI size={9} color={m.color} />
        </div>
      </div>

      {/* Portal-style tooltip */}
      {tooltip && <ContactTooltip item={item} position={tooltip} />}
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function AgentAutoDialPanel() {
  const { user } = useAuth();
  const call     = useCall();

  const {
    dialState, agentStatus, queue, currentItem, errorMsg,
    callNow, skipContact, toggleAutoDial,
  } = useAutoDialEngine(call);

  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!user) return null;

  const enabled    = agentStatus?.autoDialEnabled ?? false;
  const pending    = agentStatus?.pendingCount ?? 0;
  const isOnCall   = call?.status === "ON_CALL" || dialState === "on_call";
  const isDialing  = call?.status === "DIALING"  || dialState === "dialing";
  const isPreview  = dialState === "preview";
  const isCooldown = dialState === "cooldown";
  const notAvail   = enabled && agentStatus?.agentStatus !== "AVAILABLE" && !isOnCall && !isDialing;

  const currentMode = (currentItem?.campaign?.dialingMode || "progressive") as DialingMode;
  const modeMeta    = MODE_META[currentMode];
  const ModeIcon    = modeMeta.icon;
  const t           = tokens(enabled);

  const handleToggle = async () => {
    setToggling(true);
    const ok = await toggleAutoDial();
    if (ok === false) toast.error("Toggle failed");
    else toast.success(enabled ? "Auto-dial paused" : "Auto-dial enabled");
    setToggling(false);
  };

  const headerLabel = () => {
    if (isDialing)  return "Dialing…";
    if (isOnCall)   return "On Call";
    if (isPreview)  return "Review Contact";
    if (isCooldown) return "Next contact…";
    if (enabled)    return "Auto-Dial ON";
    return "Auto-Dial";
  };

  return (
    <div style={{
      position: "fixed",
      bottom: isOnCall ? 88 : 20,
      right: 20,
      zIndex: 850,
      width: expanded ? 310 : "auto",
      transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{
        background: t.bg,
        borderRadius: expanded ? "var(--r-xl)" : t.radius,
        boxShadow: t.shadow,
        border: t.border,
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>

        {/* ── Header ── */}
        <div
          onClick={() => setExpanded(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: expanded ? "14px 16px 10px" : "12px 16px", cursor: "pointer" }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "var(--r-full)",
            background: t.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {isDialing || isOnCall
              ? <Phone size={15} color={t.iconColor} style={isDialing ? { animation: "ad-pulse 1s infinite" } : {}} />
              : <Zap size={15} color={t.iconColor} />}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1 }}>{headerLabel()}</div>
            {!expanded && (
              <div style={{ fontSize: 11, marginTop: 2, color: t.textSub }}>
                {pending} pending
                {enabled && currentItem && <span style={{ marginLeft: 5, opacity: 0.7 }}>· {modeMeta.label}</span>}
              </div>
            )}
          </div>

          {/* Toggle switch */}
          <div
            onClick={e => { e.stopPropagation(); handleToggle(); }}
            style={{
              width: 38, height: 20, borderRadius: "var(--r-full)",
              background: t.toggleTrack,
              position: "relative", cursor: "pointer",
              opacity: toggling ? 0.5 : 1, flexShrink: 0,
              transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute",
              top: 2, left: enabled ? 19 : 2,
              width: 16, height: 16, borderRadius: "var(--r-full)",
              background: t.toggleThumb,
              transition: "left 0.2s cubic-bezier(0.16,1,0.3,1)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>

          <div style={{ color: t.chevron, flexShrink: 0 }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </div>
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div style={{ padding: "0 14px 14px" }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
              <StatBox label="Pending" value={pending} t={t} />
              <StatBox label="Status" value={agentStatus?.agentStatus === "AVAILABLE" ? "Ready" : (agentStatus?.agentStatus ?? "—")} t={t} />
              <StatBox label="State" value={stateLabel(dialState)} t={t} />
            </div>

            {/* PREVIEW — manual card */}
            {isPreview && currentItem && (
              <div style={{
                background: t.cardBg, borderRadius: "var(--r-lg)",
                padding: "12px", border: `1px solid ${t.cardBorder}`, marginBottom: 10,
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: "var(--r-full)",
                  background: `${modeMeta.color}22`, marginBottom: 8,
                }}>
                  <Eye size={10} color={modeMeta.color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: modeMeta.color }}>PREVIEW — Review before calling</span>
                </div>

                <div style={{ fontWeight: 800, fontSize: 15, color: t.text, lineHeight: 1.3 }}>
                  {currentItem.contact ? `${currentItem.contact.firstName} ${currentItem.contact.lastName}` : currentItem.phoneNumber}
                </div>
                {currentItem.contact && (
                  <div style={{ fontSize: 12, marginTop: 3, fontFamily: "var(--font-mono)", color: t.textSub }}>
                    {currentItem.phoneNumber}
                  </div>
                )}
                {currentItem.campaign && (
                  <div style={{ fontSize: 11, marginTop: 4, color: t.textTert }}>📋 {currentItem.campaign.name}</div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <button onClick={callNow} style={{
                    padding: "9px 0", borderRadius: "var(--r-md)", border: "none",
                    background: "var(--ok)", color: "#fff",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Phone size={13} /> Call Now
                  </button>
                  <button onClick={skipContact} style={{
                    padding: "9px 0", borderRadius: "var(--r-md)",
                    border: `1px solid ${t.skipBorder}`, background: t.skipBg,
                    color: t.skipText, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <SkipForward size={13} /> Skip
                  </button>
                </div>
              </div>
            )}

            {/* PROGRESSIVE / POWER — auto card */}
            {!isPreview && currentItem && (
              <div style={{
                background: t.cardBg, borderRadius: "var(--r-lg)",
                padding: "12px", border: `1px solid ${t.cardBorder}`, marginBottom: 10,
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: "var(--r-full)",
                  background: `${modeMeta.color}22`, marginBottom: 8,
                }}>
                  <ModeIcon size={10} color={modeMeta.color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: modeMeta.color }}>
                    {modeMeta.label.toUpperCase()} · AUTO
                  </span>
                </div>

                <div style={{ fontWeight: 800, fontSize: 15, color: t.text, lineHeight: 1.3 }}>
                  {currentItem.contact ? `${currentItem.contact.firstName} ${currentItem.contact.lastName}` : currentItem.phoneNumber}
                </div>
                {currentItem.contact && (
                  <div style={{ fontSize: 12, marginTop: 3, fontFamily: "var(--font-mono)", color: t.textSub }}>
                    {currentItem.phoneNumber}
                  </div>
                )}

                {isDialing && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "var(--r-full)", background: "var(--ok)", animation: "ad-blink 1s infinite" }} />
                    <span style={{ fontSize: 11, color: t.textSub }}>Connecting…</span>
                  </div>
                )}
                {isCooldown && <div style={{ marginTop: 8, fontSize: 11, color: t.textTert }}>⏳ Next contact loading…</div>}
              </div>
            )}

            {/* On call info */}
            {isOnCall && enabled && (
              <div style={{
                padding: "8px 10px", borderRadius: "var(--r-md)", marginBottom: 10,
                background: t.infoBg, border: `1px solid ${t.infoBorder}`,
                fontSize: 11, color: t.infoText,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Phone size={12} /> Call end hone par next auto-dial hoga
              </div>
            )}

            {/* Queue list with tooltips */}
            {queue.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 6, color: t.textTert,
                }}>
                  Queue ({queue.length})
                </div>

                {queue.slice(0, 5).map((item, i) => (
                  <QueueItemRow key={item.id} item={item} index={i} t={t} />
                ))}

                {queue.length > 5 && (
                  <div style={{ fontSize: 11, textAlign: "center", marginTop: 3, color: t.textTert }}>
                    +{queue.length - 5} more contacts
                  </div>
                )}
              </div>
            )}

            {/* Empty */}
            {queue.length === 0 && !currentItem && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <CheckCircle size={20} color={t.textTert} style={{ margin: "0 auto 5px", display: "block" }} />
                <div style={{ fontSize: 12, color: t.textTert }}>
                  {enabled ? "Queue empty — all dialed" : "Enable to start dialing"}
                </div>
              </div>
            )}

            {/* Not available */}
            {notAvail && (
              <div style={{
                marginTop: 8, padding: "7px 10px", borderRadius: "var(--r-md)",
                background: "var(--err-light)", fontSize: 11, color: "var(--err)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <AlertCircle size={12} /> Status AVAILABLE karo
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginTop: 8, padding: "7px 10px", borderRadius: "var(--r-md)",
                background: "var(--err-light)", fontSize: 11, color: "var(--err)",
              }}>
                ⚠ {errorMsg}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ad-pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        @keyframes ad-blink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes tooltip-in  { from{opacity:0;transform:translateY(-50%) scale(0.95)} to{opacity:1;transform:translateY(-50%) scale(1)} }
      `}</style>
    </div>
  );
}
