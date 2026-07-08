//@ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";
import api from "../api";
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Tag,
  Save,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { DateTimeInput } from "./ui/AppDatePicker";

/* ─── localStorage se theme read karo ───────────────────────── */
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light"; }
    catch { return "light"; }
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
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

/* ─── Design tokens ──────────────────────────────────────────── */
function getTokens(isDark: boolean) {
  return {
    P:           "#5B5BD6",
    P_FOCUS:     "rgba(91,91,214,0.45)",
    P_SHADOW:    "rgba(91,91,214,0.10)",
    P_BG:        isDark ? "rgba(91,91,214,0.14)" : "rgba(91,91,214,0.04)",
    P_BORDER:    isDark ? "rgba(91,91,214,0.25)" : "rgba(91,91,214,0.12)",

    TEXT:        isDark ? "#F0F0F8"                   : "#0D0D12",
    TEXT2:       isDark ? "#A0A0B8"                   : "#6B6B7B",
    MUTED:       isDark ? "#68687A"                   : "#9E9EAD",

    BG:          isDark ? "rgba(18,18,28,0.97)"       : "rgba(255,255,255,0.94)",
    BG_BODY:     isDark ? "rgba(20,20,32,0.60)"       : "rgba(246,247,249,0.40)",
    BG_SUMMARY:  isDark ? "rgba(22,22,34,0.80)"       : "rgba(246,247,249,0.60)",
    BG_CARD:     isDark ? "#1A1A28"                   : "#ffffff",
    BG_INPUT:    isDark ? "#22223A"                   : "#F6F7F9",
    BG_FOOTER:   isDark ? "rgba(18,18,28,0.90)"       : "rgba(255,255,255,0.80)",
    BG_CANCEL:   isDark ? "#22223A"                   : "#F6F7F9",

    BORDER:      isDark ? "rgba(255,255,255,0.08)"    : "rgba(0,0,0,0.07)",
    BORDER_HDR:  isDark ? "rgba(255,255,255,0.07)"    : "rgba(0,0,0,0.06)",
    BORDER_INPUT:isDark ? "rgba(255,255,255,0.10)"    : "rgba(0,0,0,0.10)",
    BORDER_BTN:  isDark ? "rgba(255,255,255,0.08)"    : "rgba(0,0,0,0.08)",

    SHADOW:      isDark
      ? "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.60)",
    OVERLAY:     isDark ? "rgba(0,0,0,0.70)"          : "rgba(16,24,40,0.45)",

    TOGGLE_OFF:  isDark ? "rgba(255,255,255,0.14)"    : "rgba(0,0,0,0.14)",
    CANCEL_TEXT: isDark ? "#A0A0B8"                   : "#6B6B7B",

    ERROR_BG:    isDark ? "rgba(208,40,26,0.12)"      : "rgba(208,40,26,0.07)",
    ERROR_BDR:   isDark ? "rgba(208,40,26,0.28)"      : "rgba(208,40,26,0.18)",
    ERROR_TEXT:  "#D0281A",
  };
}

/* ─── react-select styles — theme-aware ─────────────────────── */
function getSelectStyles(tk: ReturnType<typeof getTokens>) {
  return {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${s.isFocused ? tk.P_FOCUS : tk.BORDER_INPUT}`,
      borderRadius: 10,
      padding: "2px 4px",
      minHeight: 44,
      backgroundColor: tk.BG_INPUT,
      boxShadow: s.isFocused ? `0 0 0 3px ${tk.P_SHADOW}` : "none",
      "&:hover": { borderColor: "rgba(91,91,214,0.35)" },
    }),
    menu: (p: any) => ({
      ...p,
      borderRadius: 12,
      boxShadow: tk.SHADOW,
      background: tk.BG_CARD,
      border: `1px solid ${tk.BORDER}`,
      zIndex: 9999,
      marginTop: 4,
      overflow: "hidden",
    }),
    menuList: (p: any) => ({ ...p, background: tk.BG_CARD }),
    option: (p: any, s: any) => ({
      ...p,
      backgroundColor: s.isSelected
        ? tk.P
        : s.isFocused
        ? "rgba(91,91,214,0.09)"
        : "transparent",
      color: s.isSelected ? "#fff" : tk.TEXT,
      padding: "10px 14px",
      fontSize: 13,
    }),
    placeholder: (p: any) => ({ ...p, color: tk.MUTED, fontSize: 13 }),
    singleValue: (p: any) => ({ ...p, color: tk.TEXT, fontSize: 13 }),
    input: (p: any) => ({ ...p, color: tk.TEXT }),
    multiValue: (p: any) => ({
      ...p,
      backgroundColor: "rgba(91,91,214,0.12)",
      borderRadius: 8,
    }),
    multiValueLabel: (p: any) => ({ ...p, color: tk.P, fontWeight: 600 }),
    multiValueRemove: (p: any) => ({
      ...p,
      color: tk.P,
      "&:hover": { background: "rgba(91,91,214,0.20)", color: tk.P },
    }),
  };
}

/* ─── Types ──────────────────────────────────────────────────── */
type DispositionOption = { value: number | string; label: string; color?: string; };
type EndCallData = { contactName: string; contactNumber: string; startTime: string; endTime: string; durationSeconds: number; };
type Props = { leadId: number; callData: EndCallData; onClose: () => void; onCallEnded?: (data: any) => void; };

function formatDuration(seconds: number) {
  const m = Math.floor((seconds || 0) / 60);
  const s = (seconds || 0) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ═══ Component ══════════════════════════════════════════════ */
export default function EndCallPopup({ leadId, callData, onClose, onCallEnded }: Props) {
  const { user } = useAuth();
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);
  const selectStyles = useMemo(() => getSelectStyles(tk), [tk]);

  const [dispositionId, setDispositionId] = useState<number | string | null>(null);
  const [nextFollowup, setNextFollowup]   = useState<string>("");
  const [note, setNote]                   = useState("");
  const [file, setFile]                   = useState<File | null>(null);
  const [dispositions, setDispositions]   = useState<DispositionOption[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [addToContacts, setAddToContacts] = useState<boolean>(false);
  const [clientName, setClientName]       = useState(callData.contactName || "Unknown Caller");
  const [clientPhone, setClientPhone]     = useState(callData.contactNumber || "");
  const [clientAddress, setClientAddress] = useState("");
  const [tags, setTags]                   = useState<{ value: string; label: string }[]>([]);
  const [showTags, setShowTags]           = useState(false);

  const minDateTime = new Date().toISOString().slice(0, 16);

  /* dynamic styles that depend on tk */
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    color: tk.TEXT,
    border: `1px solid ${tk.BORDER_INPUT}`,
    borderRadius: 10,
    outline: "none",
    background: tk.BG_INPUT,
    transition: "border-color 140ms ease",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: tk.MUTED,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 6,
    display: "block",
  };

  const sectionStyle = {
    background: tk.BG_CARD,
    border: `1px solid ${tk.BORDER}`,
    borderRadius: 14,
    padding: 16,
  };

  const sectionTitleStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: tk.TEXT,
    letterSpacing: "0.02em",
    marginBottom: 14,
  };

  /* ── Fetch contact info ── */
  useEffect(() => {
    const fetchInfo = async () => {
      if (!callData.contactNumber) return;
      try {
        const res = await api.post("/voice/leads/phone", { phone: callData.contactNumber });
        const isExisting = res.data.isContact || false;
        setAddToContacts(isExisting);
        if (isExisting && res.data?.contact) {
          setClientName(res.data.contact.name || callData.contactName || "Unknown Caller");
          setClientAddress(res.data.contact.addresses?.[0]?.address || "");
        }
      } catch (err) { console.error("Failed to fetch phone info", err); }
    };
    fetchInfo();
  }, [callData.contactNumber, callData.contactName]);

  /* ── Load dispositions ── */
  useEffect(() => {
    api.get("/voice/dispositions/all")
      .then((res) => {
        const active = (res.data || [])
          .filter((d: any) => d.status !== false)
          .sort((a: any, b: any) => a.sequence - b.sequence)
          .map((d: any) => ({ value: d.id, label: d.name, color: d.color }));
        setDispositions(active);
      })
      .catch((err) => console.error("Dispositions fetch failed", err));
  }, []);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!note.trim()) { setError("Please write a remark before ending the call"); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        type: "lead",
        client: {
          name: clientName.trim() || "Unknown",
          phone: clientPhone.trim() || callData.contactNumber,
          address: clientAddress.trim(),
        },
        dispositionId: dispositionId || null,
        nextFollowupDate: nextFollowup || null,
        alternatePhone: null,
        comments: note.trim() || null,
        tags: tags.map((t) => t.value),
        addToContacts,
      };
      const res = await api.post("/voice/leads/create", payload);
      toast.success("Lead created successfully! ✅");
      onCallEnded?.(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save remark");
    } finally { setLoading(false); }
  };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: tk.OVERLAY,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 720,
        background: tk.BG,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderRadius: 22,
        boxShadow: tk.SHADOW,
        border: `1px solid ${tk.BORDER}`,
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 20px",
          borderBottom: `1px solid ${tk.BORDER_HDR}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.TEXT, letterSpacing: "-0.02em" }}>
              End Call
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: tk.MUTED }}>
              Save lead details, follow-up and remarks from this call
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${tk.BORDER_BTN}`,
            background: tk.BG_INPUT, color: tk.TEXT2,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Summary strip ── */}
        <div style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${tk.BORDER_HDR}`,
          background: tk.BG_SUMMARY,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
        }}>
          {[
            { label: "Contact", value: callData.contactName || "Unknown Caller", mono: false },
            { label: "Number",  value: callData.contactNumber || "—",             mono: true  },
            { label: "Duration",value: null,                                       mono: true  },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{
              background: tk.BG_CARD,
              border: `1px solid ${tk.BORDER}`,
              borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={labelStyle}>{label}</div>
              {label === "Duration" ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.TEXT, display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace" }}>
                  <Clock3 size={13} style={{ color: tk.MUTED }} />
                  {formatDuration(callData.durationSeconds || 0)}
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.TEXT, fontFamily: mono ? "monospace" : "inherit" }}>
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{
          padding: 20,
          background: tk.BG_BODY,
          maxHeight: "65vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 14,
        }}>

          {error && (
            <div style={{
              color: tk.ERROR_TEXT, background: tk.ERROR_BG,
              border: `1px solid ${tk.ERROR_BDR}`,
              borderRadius: 10, padding: "10px 12px",
              fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Client details */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Client Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <User size={13} /> Client Name
                  </span>
                </label>
                <input
                  type="text" value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name..." style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = tk.P_FOCUS; e.target.style.background = isDark ? "#1A1A2E" : "#fff"; }}
                  onBlur={e  => { e.target.style.borderColor = tk.BORDER_INPUT; e.target.style.background = tk.BG_INPUT; }}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Phone size={13} /> Phone Number
                  </span>
                </label>
                <input
                  type="text" value={clientPhone || callData.contactNumber}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Phone number..." style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = tk.P_FOCUS; e.target.style.background = isDark ? "#1A1A2E" : "#fff"; }}
                  onBlur={e  => { e.target.style.borderColor = tk.BORDER_INPUT; e.target.style.background = tk.BG_INPUT; }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={13} /> Address
                  </span>
                </label>
                <input
                  type="text" value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Enter full address..." style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = tk.P_FOCUS; e.target.style.background = isDark ? "#1A1A2E" : "#fff"; }}
                  onBlur={e  => { e.target.style.borderColor = tk.BORDER_INPUT; e.target.style.background = tk.BG_INPUT; }}
                />
              </div>
            </div>

            {/* Save to contacts toggle */}
            <div style={{
              marginTop: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              background: tk.P_BG,
              border: `1px solid ${tk.P_BORDER}`,
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.TEXT }}>
                  Save number to contacts
                </div>
                <div style={{ fontSize: 12, color: tk.MUTED, marginTop: 2 }}>
                  Keep this contact available for future calls
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddToContacts((prev) => !prev)}
                style={{
                  position: "relative", width: 52, height: 28,
                  borderRadius: 999, border: "none",
                  background: addToContacts ? tk.P : tk.TOGGLE_OFF,
                  cursor: "pointer", transition: "background 0.2s ease", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3,
                  left: addToContacts ? 25 : 3,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.2s ease",
                }} />
              </button>
            </div>
          </div>

          {/* Call outcome */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Call Outcome</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={13} /> Disposition
                  </span>
                </label>
                <Select
                  options={dispositions}
                  value={dispositions.find((o) => o.value === dispositionId) ?? null}
                  onChange={(opt) => setDispositionId(opt?.value ?? null)}
                  placeholder="Select disposition..."
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={13} /> Next Follow-up
                  </span>
                </label>
                <DateTimeInput
                  min={minDateTime}
                  value={nextFollowup}
                  onChange={(val) => setNextFollowup(val)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MessageSquare size={12} /> Remark / Notes *
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was discussed? Any commitments? Next steps?..."
              rows={5}
              style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
              onFocus={e => { e.target.style.borderColor = tk.P_FOCUS; e.target.style.background = isDark ? "#1A1A2E" : "#fff"; }}
              onBlur={e  => { e.target.style.borderColor = tk.BORDER_INPUT; e.target.style.background = tk.BG_INPUT; }}
            />
          </div>

          {/* Tags */}
          <div style={sectionStyle}>
            <label style={{
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", userSelect: "none",
              fontSize: 13, fontWeight: 500, color: tk.TEXT,
            }}>
              <input
                type="checkbox" checked={showTags}
                onChange={(e) => setShowTags(e.target.checked)}
                style={{ accentColor: tk.P }}
              />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Tag size={13} /> Add Tags
              </span>
            </label>
            {showTags && (
              <div style={{ marginTop: 12 }}>
                <CreatableSelect
                  isMulti value={tags}
                  onChange={setTags as any}
                  styles={selectStyles}
                  placeholder="Type tag and press Enter..."
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 20px",
          borderTop: `1px solid ${tk.BORDER_HDR}`,
          background: tk.BG_FOOTER,
          display: "flex", gap: 10,
        }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: "11px 16px",
            fontSize: 13, fontWeight: 500,
            color: tk.CANCEL_TEXT,
            background: tk.BG_CANCEL,
            border: `1px solid ${tk.BORDER_BTN}`,
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}>
            Cancel
          </button>

          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 1, padding: "11px 16px",
            fontSize: 13, fontWeight: 700,
            color: "#fff",
            background: loading ? "rgba(91,91,214,0.50)" : tk.P,
            border: "none", borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "inherit",
            boxShadow: loading ? "none" : "0 6px 20px rgba(91,91,214,0.32)",
            transition: "all 0.15s",
          }}>
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.5)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
                Saving...
              </>
            ) : (
              <><Save size={16} /> End & Save</>
            )}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}