// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import {
  Phone, Plus, Play, Pause, RefreshCw, Upload, Users,
  ChevronRight, X, Search, Zap, CheckCircle, Clock,
  AlertCircle, Equal, ArrowRight, Eye, RotateCw,
  Trash2, Edit3, Save, Filter, Settings, TrendingUp,
  Radio, PhoneCall, BarChart2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { autoDialApi } from "../../hooks/autoDialApi";

/* ─── Types ─────────────────────────────────────────────── */
type DialingMode    = "preview" | "progressive";
type AssignmentRule = "round_robin" | "equal" | "random";

interface CampaignAgent { id: number; name: string; phoneNumber?: string; sipIdentity?: string; status?: string }
interface Campaign {
  id: number; name: string; description?: string;
  dialingMode: DialingMode; assignmentRule: AssignmentRule;
  status: string; enabled: boolean;
  maxRetries: number; retryDelayMinutes: number; callerId?: string;
  createdAt: string;
  _count?: { queueItems: number };
  campaignAgents?: { agent: CampaignAgent }[];
}
interface Agent { id: number; name: string; phoneNumber?: string; sipIdentity?: string; status?: string; autoDialEnabled?: boolean }
interface QueueItem {
  id: number; phoneNumber: string; status: string;
  attempts: number; maxRetries: number; nextAttemptAt?: string; priority: number;
  assignedAgent?: { id: number; name: string; status: string; autoDialEnabled: boolean } | null;
  contact?: { firstName: string; lastName: string } | null;
}

/* ─── Static data ─────────────────────────────────────────── */
// ONLY preview + progressive as requested
const DIAL_MODES: { value: DialingMode; label: string; desc: string; icon: any; accent: string }[] = [
  { value: "preview",     label: "Preview",     desc: "Agent reviews contact before dialing", icon: Eye,       accent: "#3B82F6" },
  { value: "progressive", label: "Progressive", desc: "Auto-dials one contact at a time",     icon: ArrowRight, accent: "#10B981" },
];
const ASSIGN_RULES: { value: AssignmentRule; label: string; desc: string; icon: any }[] = [
  { value: "round_robin", label: "Round Robin", desc: "Cycle agents in order",  icon: RotateCw },
  { value: "equal",       label: "Equal Share", desc: "Balance load evenly",    icon: Equal },
  { value: "random",      label: "Random",      desc: "Randomly pick an agent", icon: () => <span style={{ fontSize: 13, fontWeight: 800 }}>?</span> },
];

/* ─── Tokens ─────────────────────────────────────────────── */
const T = {
  bg:        "var(--bg-app, #F5F5F0)",
  surface:   "var(--bg-surface, #FFFFFF)",
  surface2:  "var(--bg-surface-2, #F8F8F5)",
  border:    "var(--border, rgba(0,0,0,0.07))",
  borderMd:  "var(--border-strong, rgba(0,0,0,0.12))",
  text:      "var(--text-primary, #0D0D0A)",
  textSub:   "var(--text-secondary, #5C5C52)",
  textMute:  "var(--text-tertiary, #9E9E94)",
  accent:    "var(--accent, #1A1A2E)",
  accentL:   "var(--accent-light, #EDEDFA)",
  ok:        "var(--ok, #059669)",
  okL:       "var(--ok-light, #D1FAE5)",
  err:       "var(--err, #DC2626)",
  errL:      "var(--err-light, #FEE2E2)",
  warn:      "var(--warn, #D97706)",
  warnL:     "var(--warn-light, #FEF3C7)",
};

/* ─── Helpers ─────────────────────────────────────────────── */
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return "—"; }
}
function initials(name = "") {
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase() || "??";
}
const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#10B981","#F59E0B","#EF4444","#06B6D4"];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

/* ─── Status pill ─────────────────────────────────────────── */
const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  active:          { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  draft:           { bg: "#EEF2FF", text: "#3730A3", dot: "#6366F1" },
  paused:          { bg: "#FEF3C7", text: "#78350F", dot: "#D97706" },
  completed:       { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  cancelled:       { bg: "#FEE2E2", text: "#7F1D1D", dot: "#DC2626" },
  pending:         { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" },
  reserved:        { bg: "#EDE9FE", text: "#4C1D95", dot: "#7C3AED" },
  dialing:         { bg: "#DBEAFE", text: "#1E3A8A", dot: "#2563EB" },
  connected:       { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  no_answer:       { bg: "#FEF3C7", text: "#78350F", dot: "#D97706" },
  busy:            { bg: "#FEF3C7", text: "#78350F", dot: "#D97706" },
  failed:          { bg: "#FEE2E2", text: "#7F1D1D", dot: "#DC2626" },
  retry_scheduled: { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  dnc:             { bg: "#FEE2E2", text: "#7F1D1D", dot: "#DC2626" },
  blocked:         { bg: "#FEE2E2", text: "#7F1D1D", dot: "#DC2626" },
  skipped:         { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" },
};
function StatusPill({ status }: { status: string }) {
  const s = STATUS_META[status?.toLowerCase()] ?? STATUS_META.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: s.bg, color: s.text, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

/* ─── Mode pill ─────────────────────────────────────────────── */
function ModePill({ mode }: { mode: DialingMode }) {
  const m = DIAL_MODES.find(d => d.value === mode);
  if (!m) return <span style={{ fontSize: 12, color: T.textMute }}>{mode}</span>;
  const Icon = m.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: `${m.accent}14`, color: m.accent, fontSize: 11.5, fontWeight: 700 }}>
      <Icon size={11} />{m.label}
    </span>
  );
}

/* ─── Avatar stack ─────────────────────────────────────────── */
function AvatarStack({ agents, max = 3 }: { agents: CampaignAgent[]; max?: number }) {
  const show = agents.slice(0, max);
  const rest = agents.length - max;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {show.map((a, i) => (
        <div key={a.id} title={a.name} style={{
          width: 24, height: 24, borderRadius: "50%",
          background: avatarColor(a.name),
          border: `2px solid ${T.surface}`,
          marginLeft: i > 0 ? -7 : 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: "#fff",
          zIndex: show.length - i,
          position: "relative",
        }}>
          {initials(a.name)}
        </div>
      ))}
      {rest > 0 && (
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E5E7EB", border: `2px solid ${T.surface}`, marginLeft: -7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#6B7280" }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

/* ─── Agent multi-select ─────────────────────────────────── */
function AgentMultiSelect({ agents, selected, onChange }: { agents: Agent[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [search, setSearch] = useState("");
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const filtered = useMemo(() =>
    agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.phoneNumber || "").includes(search)),
    [agents, search]
  );
  return (
    <div style={{ border: `1px solid ${T.borderMd}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "8px", borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: T.textMute }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…" style={{ width: "100%", padding: "7px 28px", border: `1px solid ${T.border}`, borderRadius: 7, background: T.surface, fontSize: 12.5, outline: "none", color: T.text, boxSizing: "border-box" }} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMute, padding: 0 }}><X size={11} /></button>}
        </div>
        {selected.length > 0 && (
          <div style={{ marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>{selected.length} selected</span>
            <button onClick={() => onChange([])} style={{ fontSize: 11, color: T.err, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear</button>
          </div>
        )}
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {filtered.length === 0
          ? <div style={{ padding: 16, textAlign: "center", color: T.textMute, fontSize: 13 }}>No agents found</div>
          : filtered.map((a, i) => {
            const sel = selected.includes(a.id);
            const col = avatarColor(a.name);
            return (
              <div key={a.id} onClick={() => toggle(a.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                cursor: "pointer",
                borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                background: sel ? `${col}08` : "transparent",
                transition: "background 0.1s",
              }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: sel ? "none" : `2px solid ${T.borderMd}`, background: sel ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel && <CheckCircle size={10} color="#fff" />}
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                  {initials(a.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.textMute }}>
                    {a.phoneNumber || a.sipIdentity || "No number"} · <span style={{ color: a.autoDialEnabled ? T.ok : T.textMute }}>{a.autoDialEnabled ? "AutoDial ON" : "AutoDial OFF"}</span>
                  </div>
                </div>
                {a.status && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: a.status === "AVAILABLE" ? T.okL : T.surface2, color: a.status === "AVAILABLE" ? T.ok : T.textMute }}>
                    {a.status}
                  </span>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

/* ─── Campaign Form ──────────────────────────────────────── */
function CampaignForm({ agents, initialData, submitLabel, onSubmit, onClose, loading }: {
  agents: Agent[];
  initialData?: Partial<Campaign & { agentIds: number[] }>;
  submitLabel: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [name, setName]                 = useState(initialData?.name ?? "");
  const [description, setDescription]   = useState(initialData?.description ?? "");
  const [dialingMode, setDialingMode]   = useState<DialingMode>(initialData?.dialingMode ?? "progressive");
  const [assignmentRule, setAssignmentRule] = useState<AssignmentRule>(initialData?.assignmentRule ?? "round_robin");
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>(initialData?.agentIds ?? []);
  const [maxRetries, setMaxRetries]     = useState(initialData?.maxRetries ?? 2);
  const [retryDelay, setRetryDelay]     = useState(initialData?.retryDelayMinutes ?? 30);
  const [callerId, setCallerId]         = useState(initialData?.callerId ?? "");

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Campaign name is required"); return; }
    if (selectedAgentIds.length === 0) { toast.error("Select at least one agent"); return; }
    onSubmit({ name: name.trim(), description: description.trim() || undefined, dialingMode, assignmentRule, agentIds: selectedAgentIds, maxRetries: Number(maxRetries), retryDelayMinutes: Number(retryDelay), callerId: callerId.trim() || undefined });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Name + CallerID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <FieldLabel>Campaign Name *</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Sales Outreach" style={iS} />
        </div>
        {/* <div>
          <FieldLabel>Caller ID</FieldLabel>
          <input value={callerId} onChange={e => setCallerId(e.target.value)} placeholder="+12025550123" style={iS} />
        </div> */}
      </div>

      <FieldLabel>Description</FieldLabel>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note about this campaign" style={{ ...iS, marginBottom: 20 }} />

      {/* Dialing mode — only preview + progressive */}
      <FieldLabel>Dialing Mode</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {DIAL_MODES.map(m => {
          const Icon = m.icon;
          const sel = dialingMode === m.value;
          return (
            <button key={m.value} onClick={() => setDialingMode(m.value)} style={{
              padding: "14px 12px", borderRadius: 10, cursor: "pointer",
              border: sel ? `2px solid ${m.accent}` : `2px solid ${T.border}`,
              background: sel ? `${m.accent}08` : T.surface2,
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
              textAlign: "left", transition: "all 0.15s",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${m.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color={m.accent} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: sel ? m.accent : T.text }}>{m.label}</div>
                <div style={{ fontSize: 11, color: T.textMute, marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Assignment rule */}
      <FieldLabel>Agent Assignment</FieldLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {ASSIGN_RULES.map(r => {
          const Icon = r.icon;
          const sel = assignmentRule === r.value;
          return (
            <button key={r.value} onClick={() => setAssignmentRule(r.value)} style={{
              flex: 1, padding: "10px 6px", borderRadius: 9, cursor: "pointer",
              border: sel ? `2px solid ${T.accent}` : `2px solid ${T.border}`,
              background: sel ? T.accentL : T.surface2,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              transition: "all 0.15s",
            }}>
              <Icon size={14} color={sel ? T.accent : T.textSub} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: sel ? T.accent : T.text }}>{r.label}</span>
              <span style={{ fontSize: 10, color: T.textMute, textAlign: "center" }}>{r.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Agents */}
      <FieldLabel>Assign Agents * <span style={{ fontWeight: 500, textTransform: "none", color: T.textMute }}>({selectedAgentIds.length} selected)</span></FieldLabel>
      <div style={{ marginBottom: 20 }}>
        <AgentMultiSelect agents={agents} selected={selectedAgentIds} onChange={setSelectedAgentIds} />
      </div>

      {/* Retry config */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div>
          <FieldLabel>Max Retries</FieldLabel>
          <input type="number" min={0} max={10} value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} style={iS} />
        </div>
        <div>
          <FieldLabel>Retry Delay (minutes)</FieldLabel>
          <input type="number" min={1} value={retryDelay} onChange={e => setRetryDelay(Number(e.target.value))} style={iS} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={cancelBtn}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading} style={submitBtn}>
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ─── Modal shell ───────────────────────────────────────── */
function Modal({ title, subtitle, width = 640, onClose, children }: { title: string; subtitle?: string; width?: number; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width, maxWidth: "95vw", background: T.surface, borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)", maxHeight: "90vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: T.textSub, marginTop: 3, margin: 0 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: T.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textSub }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Create / Edit modals ──────────────────────────────── */
function CreateModal({ agents, onClose, onCreated }: { agents: Agent[]; onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async (data: any) => {
    setLoading(true);
    try { await autoDialApi.createCampaign(data); toast.success("Campaign created!"); onCreated(); onClose(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed to create campaign"); }
    finally { setLoading(false); }
  };
  return (
    <Modal title="New Campaign" subtitle="Configure your outbound dialing campaign" onClose={onClose}>
      <CampaignForm agents={agents} submitLabel="Create Campaign" onSubmit={handle} onClose={onClose} loading={loading} />
    </Modal>
  );
}

function EditModal({ campaign, agents, onClose, onUpdated }: { campaign: Campaign; agents: Agent[]; onClose: () => void; onUpdated: () => void }) {
  const [loading, setLoading] = useState(false);
  const initialAgentIds = (campaign.campaignAgents || []).map(ca => ca.agent.id);
  const handle = async (data: any) => {
    setLoading(true);
    try { await autoDialApi.updateCampaign(campaign.id, data); toast.success("Campaign updated!"); onUpdated(); onClose(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed to update campaign"); }
    finally { setLoading(false); }
  };
  return (
    <Modal title="Edit Campaign" subtitle={campaign.name} onClose={onClose}>
      <CampaignForm agents={agents} initialData={{ ...campaign, agentIds: initialAgentIds }} submitLabel="Save Changes" onSubmit={handle} onClose={onClose} loading={loading} />
    </Modal>
  );
}

/* ─── Upload modal ──────────────────────────────────────── */
function UploadModal({ campaign, agents, onClose, onUploaded }: { campaign: Campaign; agents: Agent[]; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [agentOverride, setAgentOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const agentList = (campaign.campaignAgents || []).map(ca => ca.agent);

  const handleUpload = async () => {
    if (!file) { toast.error("Select a CSV or XLSX file"); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (agentOverride) form.append("assignedAgentId", agentOverride);
      form.append("autoDialEnabled", "true");
      const res = await autoDialApi.uploadContacts(campaign.id, form);
      setStats(res.data?.stats);
      toast.success(`${res.data?.stats?.queued ?? 0} contacts queued`);
      onUploaded();
    } catch { toast.error("Upload failed"); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Upload Contacts" subtitle={`Campaign: ${campaign.name}`} width={480} onClose={onClose}>
      {stats ? (
        <div>
          <div style={{ background: T.okL, borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: "#065F46", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={15} /> Upload complete — {stats.queued} contacts queued
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
            {[
              { l: "Total Rows", v: stats.totalRows, c: T.text },
              { l: "Queued", v: stats.queued, c: T.ok },
              { l: "New Contacts", v: stats.contactsCreated, c: "#3B82F6" },
              { l: "DNC Skipped", v: stats.skippedDnc, c: T.err },
              { l: "Blocked", v: stats.skippedBlocked, c: T.err },
              { l: "Invalid Phone", v: stats.skippedInvalidPhone, c: T.warn },
            ].map(s => (
              <div key={s.l} style={{ background: T.surface2, borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10.5, color: T.textMute, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={submitBtn}>Done</button>
        </div>
      ) : (
        <>
          <FieldLabel>Override Agent (optional)</FieldLabel>
          <select value={agentOverride} onChange={e => setAgentOverride(e.target.value)} style={{ ...iS, marginBottom: 20 }}>
            <option value="">Use campaign assignment rule</option>
            {agentList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <FieldLabel>Contact File (CSV or XLSX) *</FieldLabel>
          <div
            onClick={() => document.getElementById("ad-file-input")?.click()}
            style={{
              border: `2px dashed ${file ? T.ok : T.borderMd}`,
              borderRadius: 10, padding: "28px 16px",
              textAlign: "center", marginBottom: 22, cursor: "pointer",
              background: file ? T.okL : T.surface2,
              transition: "all 0.15s",
            }}
          >
            <Upload size={24} color={file ? T.ok : T.textMute} style={{ margin: "0 auto 10px", display: "block" }} />
            <div style={{ fontWeight: 600, fontSize: 13, color: file ? T.ok : T.textSub }}>{file ? file.name : "Click to select file"}</div>
            <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 3 }}>Supports .csv and .xlsx</div>
            <input id="ad-file-input" type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
            <button onClick={handleUpload} disabled={loading || !file} style={submitBtn}>
              <Upload size={13} /> {loading ? "Uploading…" : "Upload & Queue"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─── Edit Queue Item Modal ─────────────────────────────── */
function EditQueueModal({ item, agents, onClose, onSaved }: { item: QueueItem; agents: Agent[]; onClose: () => void; onSaved: () => void }) {
  const [phone, setPhone]           = useState(item.phoneNumber);
  const [agentId, setAgentId]       = useState(item.assignedAgent?.id?.toString() ?? "");
  const [status, setStatus]         = useState(item.status);
  const [priority, setPriority]     = useState(item.priority);
  const [maxRetries, setMaxRetries] = useState(item.maxRetries);
  const [loading, setLoading]       = useState(false);
  const handle = async () => {
    if (!phone.trim()) { toast.error("Phone number required"); return; }
    setLoading(true);
    try {
      await autoDialApi.updateQueueItem(item.id, { phoneNumber: phone.trim(), assignedAgentId: agentId ? Number(agentId) : null, status, priority, maxRetries });
      toast.success("Contact updated"); onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to update contact"); }
    finally { setLoading(false); }
  };
  return (
    <Modal title="Edit Contact" subtitle={item.contact ? `${item.contact.firstName} ${item.contact.lastName}` : item.phoneNumber} width={400} onClose={onClose}>
      <FieldLabel>Phone Number *</FieldLabel>
      <input value={phone} onChange={e => setPhone(e.target.value)} style={iS} />
      <FieldLabel>Assigned Agent</FieldLabel>
      <select value={agentId} onChange={e => setAgentId(e.target.value)} style={iS}>
        <option value="">Unassigned</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select value={status} onChange={e => setStatus(e.target.value)} style={iS}>
            {["pending","retry_scheduled","failed","no_answer","busy","skipped","dnc","blocked"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <input type="number" min={0} max={10} value={priority} onChange={e => setPriority(Number(e.target.value))} style={iS} />
        </div>
      </div>
      <FieldLabel>Max Retries</FieldLabel>
      <input type="number" min={0} max={10} value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} style={{ ...iS, marginBottom: 22 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={cancelBtn}>Cancel</button>
        <button onClick={handle} disabled={loading} style={submitBtn}><Save size={13} /> {loading ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

/* ─── Confirm delete ─────────────────────────────────────── */
function ConfirmDelete({ title, message, onConfirm, onClose, loading }: { title: string; message: string; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width: 380, background: T.surface, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: T.errL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trash2 size={18} color={T.err} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>{title}</h3>
            <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.5, margin: 0 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ ...submitBtn, background: T.err }}>
            <Trash2 size={13} /> {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Campaign Detail Drawer ─────────────────────────────── */
function DetailDrawer({ campaign, agents, queue, queueLoading, onClose, onUpload, onToggle, onRefreshQueue, onEdit, onDeleteCampaign, onQueueUpdated }: {
  campaign: Campaign; agents: Agent[]; queue: QueueItem[]; queueLoading: boolean;
  onClose: () => void; onUpload: () => void; onToggle: () => void; onRefreshQueue: () => void;
  onEdit: () => void; onDeleteCampaign: () => void; onQueueUpdated: () => void;
}) {
  const [editingItem, setEditingItem]   = useState<QueueItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<QueueItem | null>(null);
  const [deleteItemLoading, setDeleteItemLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const active = campaign.enabled && campaign.status === "active";
  const campaignAgents = (campaign.campaignAgents || []).map(ca => ca.agent);
  const assignRule = ASSIGN_RULES.find(r => r.value === campaign.assignmentRule);

  const filtered = useMemo(() =>
    statusFilter === "all" ? queue : queue.filter(q => q.status === statusFilter),
    [queue, statusFilter]
  );

  const stats = {
    total:     queue.length,
    pending:   queue.filter(q => q.status === "pending").length,
    connected: queue.filter(q => ["connected","completed"].includes(q.status)).length,
    failed:    queue.filter(q => ["failed","no_answer","busy","blocked","dnc"].includes(q.status)).length,
    retry:     queue.filter(q => q.status === "retry_scheduled").length,
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setDeleteItemLoading(true);
    try {
      await autoDialApi.deleteQueueItem(deletingItem.id);
      toast.success("Contact removed");
      setDeletingItem(null);
      onQueueUpdated();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to delete"); }
    finally { setDeleteItemLoading(false); }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex" }}>
        <div style={{ flex: 1, background: "rgba(0,0,0,0.25)" }} onClick={onClose} />
        <div style={{ width: 780, background: T.bg, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Drawer header */}
          <div style={{ padding: "18px 24px", background: T.surface, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: active ? T.okL : T.accentL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PhoneCall size={20} color={active ? T.ok : T.accent} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.02em" }}>{campaign.name}</h3>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <StatusPill status={campaign.status} />
                    <ModePill mode={campaign.dialingMode} />
                    <span style={{ fontSize: 11.5, color: T.textMute, display: "flex", alignItems: "center", gap: 3 }}>
                      {assignRule?.label}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                <DrawerBtn onClick={onUpload} icon={<Upload size={13} />} label="Upload" />
                <DrawerBtn onClick={onEdit} icon={<Edit3 size={13} />} label="Edit" accent />
                <DrawerBtn
                  onClick={onToggle}
                  icon={active ? <Pause size={13} /> : <Play size={13} />}
                  label={active ? "Pause" : "Start"}
                  color={active ? T.err : T.ok}
                  bg={active ? T.errL : T.okL}
                />
                <DrawerBtn onClick={onDeleteCampaign} icon={<Trash2 size={13} />} label="" color={T.err} bg={T.errL} />
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: T.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={15} color={T.textSub} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 24px", flex: 1 }}>
            {/* Queue stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Total",     value: stats.total,     color: T.text,    bg: T.surface },
                { label: "Pending",   value: stats.pending,   color: T.warn,    bg: "#FFFBEB" },
                { label: "Connected", value: stats.connected, color: T.ok,      bg: T.okL },
                { label: "Failed",    value: stats.failed,    color: T.err,     bg: T.errL },
                { label: "Retry",     value: stats.retry,     color: "#7C3AED", bg: "#F3F0FF" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: "-0.04em" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Campaign config */}
            <div style={{ background: T.surface, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { l: "Max Retries",  v: campaign.maxRetries },
                { l: "Retry Delay",  v: `${campaign.retryDelayMinutes}m` },
                { l: "Caller ID",    v: campaign.callerId || "—" },
                { l: "Total Queued", v: campaign._count?.queueItems ?? 0 },
              ].map(c => (
                <div key={c.l}>
                  <div style={{ fontSize: 10, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3, fontWeight: 700 }}>{c.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.v}</div>
                </div>
              ))}
            </div>

            {/* Agents */}
            {campaignAgents.length > 0 && (
              <div style={{ background: T.surface, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textSub, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={13} color={T.accent} /> {campaignAgents.length} Agent{campaignAgents.length > 1 ? "s" : ""} · {assignRule?.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {campaignAgents.map(a => {
                    const col = avatarColor(a.name);
                    return (
                      <div key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 5px", borderRadius: 99, background: `${col}12`, border: `1px solid ${col}25` }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>
                          {initials(a.name)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{a.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Queue table */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                Contact Queue <span style={{ color: T.textMute, fontWeight: 500, fontSize: 13 }}>({filtered.length})</span>
              </span>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                {["all","pending","connected","failed","retry_scheduled"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "3px 9px", borderRadius: 99, border: `1px solid ${statusFilter === s ? T.accent : T.border}`, fontSize: 11, fontWeight: 600, cursor: "pointer", background: statusFilter === s ? T.accent : T.surface2, color: statusFilter === s ? "#fff" : T.textSub, transition: "all 0.12s" }}>
                    {s === "retry_scheduled" ? "retry" : s}
                  </button>
                ))}
                <button onClick={onRefreshQueue} style={{ padding: "3px 9px", borderRadius: 99, border: `1px solid ${T.border}`, fontSize: 11, fontWeight: 600, cursor: "pointer", background: T.surface2, color: T.textSub, display: "flex", alignItems: "center", gap: 4 }}>
                  <RefreshCw size={11} className={queueLoading ? "ad-spin" : ""} /> Refresh
                </button>
              </div>
            </div>

            <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.surface2 }}>
                    {["Contact","Phone","Agent","Status","Attempts","Actions"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: T.textMute, borderBottom: `1px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <td style={td}>
                        {item.contact
                          ? <span style={{ fontWeight: 600, color: T.text }}>{item.contact.firstName} {item.contact.lastName}</span>
                          : <span style={{ color: T.textMute }}>—</span>}
                      </td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{item.phoneNumber}</td>
                      <td style={td}>
                        {item.assignedAgent
                          ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: avatarColor(item.assignedAgent.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>
                              {initials(item.assignedAgent.name)}
                            </div>
                            <span style={{ fontSize: 12, color: T.text }}>{item.assignedAgent.name}</span>
                          </div>
                          : <span style={{ color: T.textMute, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={td}><StatusPill status={item.status} /></td>
                      <td style={{ ...td, textAlign: "center", fontSize: 13, color: T.textSub }}>{item.attempts}/{item.maxRetries}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => setEditingItem(item)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer", background: T.accentL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Edit3 size={12} color={T.accent} />
                          </button>
                          <button onClick={() => setDeletingItem(item)} disabled={["dialing","reserved"].includes(item.status)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer", background: T.errL, display: "flex", alignItems: "center", justifyContent: "center", opacity: ["dialing","reserved"].includes(item.status) ? 0.35 : 1 }}>
                            <Trash2 size={12} color={T.err} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && !queueLoading && (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <Upload size={24} color={T.textMute} style={{ margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.textSub }}>
                    {statusFilter === "all" ? "No contacts yet" : `No ${statusFilter} contacts`}
                  </div>
                  {statusFilter === "all" && (
                    <button onClick={onUpload} style={{ ...submitBtn, marginTop: 14, display: "inline-flex" }}>
                      <Upload size={13} /> Upload Contacts
                    </button>
                  )}
                </div>
              )}
              {queueLoading && (
                <div style={{ padding: "32px 0", textAlign: "center", color: T.textMute, fontSize: 13 }}>Loading queue…</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingItem && <EditQueueModal item={editingItem} agents={agents} onClose={() => setEditingItem(null)} onSaved={() => { setEditingItem(null); onQueueUpdated(); }} />}
      {deletingItem && (
        <ConfirmDelete
          title="Remove Contact"
          message={`Remove "${deletingItem.contact ? `${deletingItem.contact.firstName} ${deletingItem.contact.lastName}` : deletingItem.phoneNumber}" from the queue?`}
          onConfirm={handleDeleteItem}
          onClose={() => setDeletingItem(null)}
          loading={deleteItemLoading}
        />
      )}
    </>
  );
}

/* ─── Drawer action button helper ───────────────────────── */
function DrawerBtn({ onClick, icon, label, accent, color, bg }: any) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: label ? "7px 12px" : "7px 9px",
      borderRadius: 8, border: `1px solid ${T.border}`,
      background: bg || (accent ? T.accentL : T.surface2),
      color: color || (accent ? T.accent : T.textSub),
      fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      transition: "all 0.12s",
    }}>
      {icon}{label}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function AutoDialAdminPage() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [agents,     setAgents]     = useState<Agent[]>([]);
  const [queue,      setQueue]      = useState<QueueItem[]>([]);
  const [selected,   setSelected]   = useState<Campaign | null>(null);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [deletingC,  setDeletingC]  = useState<Campaign | null>(null);
  const [deleteCLoading, setDeleteCLoading] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);

  const loadCampaigns = async () => {
    try {
      const res = await autoDialApi.getCampaigns();
      setCampaigns(res.data?.data || []);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };
  const loadAgents = async () => {
    try { const res = await api.get("/auth/available"); setAgents(res.data || []); } catch {}
  };
  const loadQueue = async (id: number) => {
    setQueueLoading(true);
    try { const res = await autoDialApi.getQueue(id); setQueue(res.data?.data || []); }
    finally { setQueueLoading(false); }
  };

  useEffect(() => { loadCampaigns(); loadAgents(); }, []);

  const handleSelect = (c: Campaign) => { setSelected(c); setQueue([]); loadQueue(c.id); };
  const handleToggle = async (campaign: Campaign) => {
    const next = !(campaign.enabled && campaign.status === "active");
    try {
      await autoDialApi.updateCampaignStatus(campaign.id, { enabled: next, status: next ? "active" : "paused" });
      toast.success(next ? "Campaign started" : "Campaign paused");
      await loadCampaigns();
      if (selected?.id === campaign.id) setSelected(prev => prev ? { ...prev, enabled: next, status: next ? "active" : "paused" } : null);
    } catch { toast.error("Failed to update campaign"); }
  };
  const handleDeleteCampaign = async () => {
    if (!deletingC) return;
    setDeleteCLoading(true);
    try {
      await autoDialApi.deleteCampaign(deletingC.id);
      toast.success("Campaign deleted");
      setDeletingC(null);
      if (selected?.id === deletingC.id) { setSelected(null); setQueue([]); }
      await loadCampaigns();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to delete"); }
    finally { setDeleteCLoading(false); }
  };

  const filtered = campaigns
    .filter(c => statusFilter === "all" || c.status === statusFilter)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? "").toLowerCase().includes(search.toLowerCase()));

  const activeCount = campaigns.filter(c => c.enabled && c.status === "active").length;
  const draftCount  = campaigns.filter(c => c.status === "draft").length;
  const agentsInUse = new Set(campaigns.flatMap(c => (c.campaignAgents || []).map(ca => ca.agent.id))).size;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "24px 28px", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accentL, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={18} color={T.accent} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.04em", margin: 0 }}>Auto Dialer</h1>
          </div>
          <p style={{ fontSize: 13, color: T.textMute, margin: 0, paddingLeft: 48 }}>Manage outbound dialing campaigns</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em" }}>
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total",       value: campaigns.length, icon: BarChart2, color: T.accent,  bg: T.accentL },
          { label: "Active Now",  value: activeCount,      icon: Zap,       color: T.ok,      bg: T.okL    },
          { label: "Draft",       value: draftCount,       icon: Clock,     color: T.warn,    bg: T.warnL  },
          { label: "Agents Used", value: agentsInUse,      icon: Users,     color: "#7C3AED", bg: "#F3F0FF"},
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={17} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Campaign list ── */}
      <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.textMute }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…" style={{ padding: "7px 12px 7px 32px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, outline: "none", color: T.text, width: 220 }} />
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {["all","active","paused","draft","completed"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "5px 11px", borderRadius: 99, border: `1px solid ${statusFilter === s ? T.accent : T.border}`, background: statusFilter === s ? T.accent : T.surface2, color: statusFilter === s ? "#fff" : T.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.12s" }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: T.textMute }}>{filtered.length} campaign{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={loadCampaigns} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.textSub, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Table head */}
        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1.1fr 80px 100px 120px", padding: "9px 18px", background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
          {["Campaign","Mode","Agents","Queue","Status","Actions"].map(h => (
            <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "52px 0", textAlign: "center", color: T.textMute, fontSize: 13 }}>Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center" }}>
            <PhoneCall size={36} color={T.textMute} style={{ margin: "0 auto 14px", display: "block" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: T.textSub }}>No campaigns found</div>
            <div style={{ fontSize: 13, color: T.textMute, marginTop: 5 }}>
              {search || statusFilter !== "all" ? "Try different filters" : "Create your first campaign"}
            </div>
            {!search && statusFilter === "all" && (
              <button onClick={() => setShowCreate(true)} style={{ ...submitBtn, marginTop: 18, display: "inline-flex" }}>
                <Plus size={13} /> New Campaign
              </button>
            )}
          </div>
        ) : filtered.map((c, i) => {
          const isActive = c.enabled && c.status === "active";
          const isSel = selected?.id === c.id;
          const agents = (c.campaignAgents || []).map(ca => ca.agent);

          return (
            <div
              key={c.id}
              onClick={() => handleSelect(c)}
              style={{
                display: "grid", gridTemplateColumns: "2.2fr 1fr 1.1fr 80px 100px 120px",
                padding: "13px 18px", cursor: "pointer", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                background: isSel ? "#F0F0FF" : "transparent",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Name col */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: isActive ? T.okL : T.surface2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.border}` }}>
                  <PhoneCall size={15} color={isActive ? T.ok : T.textMute} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>Created {fmtDate(c.createdAt)}{c.callerId ? ` · ${c.callerId}` : ""}</div>
                </div>
              </div>

              <div><ModePill mode={c.dialingMode} /></div>
              <div>{agents.length > 0 ? <AvatarStack agents={agents} /> : <span style={{ fontSize: 12, color: T.textMute }}>—</span>}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{c._count?.queueItems ?? 0}</div>
              <div><StatusPill status={c.status} /></div>

              {/* Actions col */}
              <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
                <ActionIcon onClick={() => { setSelected(c); setShowEdit(true); }} title="Edit" bg={T.accentL} color={T.accent} icon={<Edit3 size={12} />} />
                <ActionIcon onClick={() => handleToggle(c)} title={isActive ? "Pause" : "Start"} bg={isActive ? T.errL : T.okL} color={isActive ? T.err : T.ok} icon={isActive ? <Pause size={12} /> : <Play size={12} />} />
                <ActionIcon onClick={() => setDeletingC(c)} title="Delete" bg={T.errL} color={T.err} icon={<Trash2 size={12} />} />
                <span style={{ display: "flex", alignItems: "center" }}><ChevronRight size={15} color={T.textMute} /></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {showCreate && <CreateModal agents={agents} onClose={() => setShowCreate(false)} onCreated={loadCampaigns} />}

      {showEdit && selected && (
        <EditModal campaign={selected} agents={agents} onClose={() => setShowEdit(false)}
          onUpdated={async () => { await loadCampaigns(); if (selected) loadQueue(selected.id); }} />
      )}

      {showUpload && selected && (
        <UploadModal campaign={selected} agents={agents} onClose={() => setShowUpload(false)}
          onUploaded={() => { loadCampaigns(); if (selected) loadQueue(selected.id); }} />
      )}

      {selected && !showUpload && !showCreate && !showEdit && (
        <DetailDrawer
          campaign={selected} agents={agents} queue={queue} queueLoading={queueLoading}
          onClose={() => { setSelected(null); setQueue([]); }}
          onUpload={() => setShowUpload(true)}
          onToggle={() => handleToggle(selected)}
          onRefreshQueue={() => loadQueue(selected.id)}
          onEdit={() => setShowEdit(true)}
          onDeleteCampaign={() => setDeletingC(selected)}
          onQueueUpdated={() => loadQueue(selected.id)}
        />
      )}

      {deletingC && (
        <ConfirmDelete
          title="Delete Campaign"
          message={`Delete "${deletingC.name}" and all its contacts? This cannot be undone.`}
          onConfirm={handleDeleteCampaign}
          onClose={() => setDeletingC(null)}
          loading={deleteCLoading}
        />
      )}

      <style>{`
        @keyframes ad-spin { to { transform: rotate(360deg); } }
        .ad-spin { animation: ad-spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

/* ─── Tiny helpers ───────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textSub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</label>;
}
function ActionIcon({ onClick, icon, title, bg, color }: any) {
  return (
    <button title={title} onClick={onClick} style={{ width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>
      {icon}
    </button>
  );
}

/* ─── Shared micro-styles ───────────────────────────────── */
const iS: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.borderMd}`, fontSize: 13, marginBottom: 16, background: T.surface2, color: T.text, outline: "none", boxSizing: "border-box" };
const submitBtn: React.CSSProperties = { flex: 1, padding: "10px 18px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const cancelBtn: React.CSSProperties = { flex: 1, padding: "10px 18px", borderRadius: 9, border: `1px solid ${T.borderMd}`, background: T.surface2, color: T.textSub, fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: T.text, verticalAlign: "middle" };