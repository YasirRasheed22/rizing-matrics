// @ts-nocheck
// src/components/TransferModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import parsePhoneNumberFromString, { AsYouType } from "libphonenumber-js";
import {
  X, Phone, CheckCircle2, Search,
  Globe, Delete,
  Users, ContactIcon, Grid3X3,
  ArrowRightLeft,
} from "lucide-react";

/* ─── localStorage theme hook ───────────────────────── */
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

/* ─── design tokens ─────────────────────────────────── */
function getTokens(isDark: boolean) {
  return {
    P:          "#5B5BD6",
    P_T:        "rgba(91,91,214,0.10)",
    P_L:        isDark ? "rgba(91,91,214,0.18)" : "#EDEDFB",
    P_FOCUS:    "rgba(91,91,214,0.45)",
    P_SHADOW:   "rgba(91,91,214,0.08)",
    P_BORDER:   "rgba(91,91,214,0.20)",

    TEXT:       isDark ? "#F0F0F8"                    : "#0D0D12",
    TEXT2:      isDark ? "#A0A0B8"                    : "#4B4B5A",
    MUTED:      isDark ? "#68687A"                    : "#9E9EAD",

    BG:         isDark ? "#1E1E2E"                    : "#F6F7F9",
    BG_MODAL:   isDark ? "#12121A"                    : "#ffffff",
    BG_CARD:    isDark ? "#1A1A28"                    : "#ffffff",
    BG_INPUT:   isDark ? "#22223A"                    : "#F6F7F9",
    BG_INPUT_F: isDark ? "#1A1A2E"                    : "#ffffff",
    BG_TAB_ACT: isDark ? "#12121A"                    : "#ffffff",
    BG_HEADER:  isDark ? "#12121A"                    : "#ffffff",
    BG_FOOTER:  isDark ? "#1E1E2E"                    : "#F6F7F9",

    BORDER:     isDark ? "rgba(255,255,255,0.08)"     : "rgba(0,0,0,0.07)",
    BORDER_INPUT: isDark ? "rgba(255,255,255,0.10)"   : "rgba(0,0,0,0.07)",

    SHADOW:     isDark
      ? "0 24px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)",
    OVERLAY:    isDark ? "rgba(0,0,0,0.72)"           : "rgba(0,0,0,0.40)",

    AVAIL_BG:   isDark ? "rgba(22,163,74,0.15)"       : "#DCFCE7",
    AVAIL_FG:   "#16A34A",
    BUSY_BG:    isDark ? "rgba(217,119,6,0.15)"       : "#FEF3C7",
    BUSY_FG:    "#D97706",

    STATUS_DOT_BORDER: isDark ? "#12121A"             : "#ffffff",
  };
}

/* ─── avatar palette ─────────────────────────────────── */
const PALETTES_LIGHT = [
  { bg:"#EDEDFB", fg:"#5B5BD6" }, { bg:"#DCFCE7", fg:"#16A34A" },
  { bg:"#FEF3C7", fg:"#D97706" }, { bg:"#FCE7F3", fg:"#DB2777" },
  { bg:"#DBEAFE", fg:"#2563EB" }, { bg:"#FFE4E6", fg:"#E11D48" },
  { bg:"#F3E8FF", fg:"#9333EA" },
];
const PALETTES_DARK = [
  { bg:"#1E1E3A", fg:"#818CF8" }, { bg:"#0F2A1E", fg:"#4ADE80" },
  { bg:"#2A1A0F", fg:"#FBB249" }, { bg:"#2A1030", fg:"#E879F9" },
  { bg:"#0F1E3A", fg:"#60A5FA" }, { bg:"#2A0F14", fg:"#FB7185" },
  { bg:"#231530", fg:"#C084FC" },
];
function pal(name = "", isDark = false) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTES_LIGHT.length;
  return isDark ? PALETTES_DARK[h] : PALETTES_LIGHT[h];
}

/* ─── dialpad keys ───────────────────────────────────── */
const KEYS: [string, string][] = [
  ["1",""], ["2","ABC"], ["3","DEF"],
  ["4","GHI"], ["5","JKL"], ["6","MNO"],
  ["7","PQRS"], ["8","TUV"], ["9","WXYZ"],
  ["*",""], ["0","+"], ["#",""],
];

/* ─── interfaces ─────────────────────────────────────── */
interface Agent { sipIdentity: string; name: string; role: string; status?: string; isAvailable?: boolean; }
interface Props {
  show: boolean; type?: "blind" | "supervisor";
  agent: Agent | null; setAgent: (a: Agent | null) => void;
  onTransfer: (payload: any) => void; onCancel: () => void;
  agentList: Agent[]; contacts: any[];
}
// ═══ AgentsTab — BAHAR nikalo TransferModal se ═══
function AgentsTab({
  filteredAgents, selectedAgent, setAgent,
  search, setSearch, searchRef,
  onCancel, onTransfer,
  tk, isDark,
}: {
  filteredAgents: Agent[];
  selectedAgent: Agent | null;
  setAgent: (a: Agent | null) => void;
  search: string;
  setSearch: (s: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  onCancel: () => void;
  onTransfer: (p: any) => void;
  tk: ReturnType<typeof getTokens>;
  isDark: boolean;
}) {
  return (
    <>
      <div style={{ padding: "12px 16px 10px" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} color={tk.MUTED} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name or SIP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px 10px 38px",
              borderRadius: 12,
              border: `1px solid ${tk.BORDER_INPUT}`,
              background: tk.BG_INPUT,
              outline: "none",
              fontSize: 13.5, color: tk.TEXT, fontFamily: "inherit",
              transition: "border 0.15s, box-shadow 0.15s, background 0.15s",
            }}
            onFocus={e => {
              e.target.style.borderColor = tk.P_FOCUS;
              e.target.style.boxShadow   = `0 0 0 3px ${tk.P_SHADOW}`;
              e.target.style.background  = tk.BG_INPUT_F;
            }}
            onBlur={e => {
              e.target.style.borderColor = tk.BORDER_INPUT;
              e.target.style.boxShadow   = "none";
              e.target.style.background  = tk.BG_INPUT;
            }}
          />
        </div>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto", padding: "0 16px 12px" }}>
        {filteredAgents.length === 0 ? (
          <EmptyState icon={<Users size={28} color={tk.MUTED} />} text="No agents match your search" tk={tk} />
        ) : (
          filteredAgents.map(agent => {
            const isSelected = selectedAgent?.sipIdentity === agent.sipIdentity;
            const isAvail    = agent.isAvailable !== false && agent.status !== "busy" && agent.status !== "offline";
            const { bg: avBg, fg: avFg } = pal(agent.name, isDark);
            return (
              <motion.button
                key={agent.sipIdentity}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAgent(isSelected ? null : agent)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 14,
                  border: `1px solid ${isSelected ? "rgba(91,91,214,0.25)" : tk.BORDER}`,
                  background: isSelected ? tk.P_L : tk.BG_CARD,
                  marginBottom: 8, cursor: "pointer", textAlign: "left",
                  boxShadow: isSelected ? `0 2px 12px rgba(91,91,214,0.12)` : "none",
                  transition: "all 0.14s",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: avBg, color: avFg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700,
                    border: `1.5px solid ${avFg}25`,
                  }}>
                    {(agent.name?.[0] || "?").toUpperCase()}
                  </div>
                  <span style={{
                    position: "absolute", right: 0, bottom: 0,
                    width: 11, height: 11, borderRadius: "50%",
                    background: isAvail ? "#16A34A" : agent.status === "busy" ? "#F59E0B" : (isDark ? "#3A3A4A" : "#D1D5DB"),
                    border: `2px solid ${tk.STATUS_DOT_BORDER}`,
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? tk.P : tk.TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: 12, color: tk.MUTED, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {agent.sipIdentity}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: isAvail ? tk.AVAIL_FG : tk.BUSY_FG,
                    background: isAvail ? tk.AVAIL_BG : tk.BUSY_BG,
                    border: `1px solid ${isAvail ? tk.AVAIL_FG + "30" : tk.BUSY_FG + "30"}`,
                    borderRadius: 9999, padding: "2px 9px",
                  }}>
                    {isAvail ? "Available" : "Busy"}
                  </span>
                  {isSelected && <CheckCircle2 size={18} color={tk.P} />}
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 10,
        padding: "12px 16px",
        borderTop: `1px solid ${tk.BORDER}`,
        background: tk.BG_FOOTER,
      }}>
        <FooterBtn label="Cancel" onClick={onCancel} tk={tk} />
        <FooterBtn
          label="Transfer"
          icon={<ArrowRightLeft size={14} />}
          primary disabled={!selectedAgent}
          onClick={() => onTransfer({ mode: "agent", target: selectedAgent })}
          tk={tk}
        />
      </div>
    </>
  );
}

// ═══ ContactsTab — BAHAR nikalo TransferModal se ═══
function ContactsTab({
  contacts, onTransfer, tk, isDark,
}: {
  contacts: any[];
  onTransfer: (p: any) => void;
  tk: ReturnType<typeof getTokens>;
  isDark: boolean;
}) {
  return (
    <div style={{ maxHeight: 420, overflowY: "auto", padding: "12px 16px" }}>
      {contacts.length === 0 ? (
        <EmptyState icon={<ContactIcon size={28} color={tk.MUTED} />} text="No contacts found" tk={tk} />
      ) : (
        contacts.map(c => {
          const num  = c?.phones?.[0]?.numberE164;
          const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed Contact";
          const { bg: avBg, fg: avFg } = pal(name, isDark);
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTransfer({ mode: "contact", number: num })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 14,
                border: `1px solid ${tk.BORDER}`,
                background: tk.BG_CARD,
                marginBottom: 8, cursor: "pointer", textAlign: "left",
                transition: "all 0.14s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = tk.BG; e.currentTarget.style.borderColor = tk.P_BORDER; }}
              onMouseLeave={e => { e.currentTarget.style.background = tk.BG_CARD; e.currentTarget.style.borderColor = tk.BORDER; }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: avBg, color: avFg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700,
                border: `1.5px solid ${avFg}25`,
                flexShrink: 0,
              }}>
                {(name[0] || "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: tk.TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}
                </div>
                <div style={{ fontSize: 12, color: tk.MUTED, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  {num || "No number"}
                </div>
              </div>
              <Phone size={15} color={tk.MUTED} style={{ flexShrink: 0 }} />
            </motion.button>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export default function TransferModal({
  show, type = "supervisor",
  agent: selectedAgent, setAgent,
  onTransfer, onCancel,
  agentList = [], contacts = [],
}: Props) {
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);

  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"agents"|"contacts">("agents");
  const [rawInput, setRawInput] = useState("");

  // ✅ Ref — focus gyaib hone wali problem ka fix
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── phone helpers ── */
  const detectRegion = (v: string) => v.startsWith("+") ? "US" : /^0(3|4|5|6|7|8|9)/.test(v) ? "PK" : "US";
  const pretty = (v: string) => v
    ? v.startsWith("+") ? new AsYouType().input(v) : new AsYouType(detectRegion(v)).input(v)
    : "";
  const toE164 = (v: string) => {
    if (!v) return "";
    try {
      const p = parsePhoneNumberFromString(v, detectRegion(v));
      return p?.isValid() ? p.number : v.replace(/[^\d+]/g, "");
    } catch { return v.replace(/[^\d+]/g, ""); }
  };
  const phoneDisplay = useMemo(() => pretty(rawInput), [rawInput]);

  /* ── filtered agents ── */
  const filteredAgents = useMemo(() =>
    (agentList || [])
      .filter(a => a.role === "AGENT")
      .filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.sipIdentity?.toLowerCase().includes(search.toLowerCase())
      ),
    [agentList, search]
  );

  /* ── keyboard on dialpad ── */
  const onKey = useCallback((e: KeyboardEvent) => {
    if (!show || tab !== "dialpad") return;
    if (/^[0-9*#+]$/.test(e.key)) setRawInput(p => p + e.key);
    else if (e.key === "Backspace") setRawInput(p => p.slice(0, -1));
  }, [show, tab]);
  useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onKey]);

  /* ── reset on close ── */
  useEffect(() => {
    if (!show) { setSearch(""); setRawInput(""); setTab("agents"); setAgent(null); }
  }, [show, setAgent]);

  // ✅ Tab change hone par search input ko re-focus karo (agents tab)
  useEffect(() => {
    if (show && tab === "agents" && searchRef.current) {
      // small delay — framer motion animation settle hone do
      const t = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [tab, show]);

  
  /* ══════════════════════════════════════════════════════
     DIALPAD TAB
     ══════════════════════════════════════════════════════ */
  const DialpadTab = () => (
    <div style={{ padding:"16px 20px 20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", width:"100%", marginBottom:20 }}>
        <Globe size={16} color={tk.MUTED} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
        <div style={{
          width:"100%",
          padding:"14px 46px 14px 42px",
          borderRadius:14,
          border:`1.5px solid ${rawInput ? tk.P_FOCUS : tk.BORDER_INPUT}`,
          background: rawInput ? tk.BG_INPUT_F : tk.BG_INPUT,
          fontSize:22, fontWeight:700, color:tk.TEXT,
          fontVariantNumeric:"tabular-nums",
          letterSpacing:"0.04em", textAlign:"center",
          minHeight:54, boxSizing:"border-box",
          transition:"border 0.15s, background 0.15s",
          boxShadow: rawInput ? `0 0 0 3px ${tk.P_SHADOW}` : "none",
          wordBreak:"break-all",
        }}>
          {phoneDisplay || <span style={{ fontSize:14, fontWeight:400, color:tk.MUTED }}>Enter number…</span>}
        </div>
        {rawInput && (
          <button
            onClick={() => setRawInput(p => p.slice(0,-1))}
            style={{
              position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:4, borderRadius:8,
            }}
          >
            <Delete size={18} color={tk.MUTED}/>
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, width:"100%", maxWidth:240, marginBottom:20 }}>
        {KEYS.map(([digit, letters]) => (
          <DialKey key={digit} digit={digit} letters={letters} onPress={() => setRawInput(p => p + digit)} tk={tk}/>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={toE164(rawInput) ? { scale:1.06 } : {}}
        onClick={() => onTransfer({ mode:"dialpad", number:toE164(rawInput) })}
        disabled={!toE164(rawInput)}
        style={{
          width:64, height:64, borderRadius:"50%",
          border:"none",
          background: toE164(rawInput) ? "#16A34A" : (isDark ? "#2A2A3A" : "#D1D5DB"),
          cursor: toE164(rawInput) ? "pointer" : "not-allowed",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow: toE164(rawInput) ? "0 6px 20px rgba(22,163,74,0.32)" : "none",
          transition:"all 0.15s",
        }}
      >
        <Phone size={24} color="#fff"/>
      </motion.button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  const TABS = [
    { id:"agents",   label:"Agents",   Icon:Users       },
    { id:"contacts", label:"Contacts", Icon:ContactIcon },
    
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="tm-backdrop"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: tk.OVERLAY,
            backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
            padding:16,
          }}
          onClick={onCancel}
        >
          <motion.div
            key="tm-modal"
            initial={{ y:20, opacity:0, scale:0.96 }}
            animate={{ y:0,  opacity:1, scale:1    }}
            exit={{    y:16, opacity:0, scale:0.96 }}
            transition={{ type:"spring", stiffness:300, damping:26 }}
            onClick={e => e.stopPropagation()}
            style={{
              width:"100%", maxWidth:500,
              background: tk.BG_MODAL,
              borderRadius:22, overflow:"hidden",
              boxShadow: tk.SHADOW,
              border:`1px solid ${tk.BORDER}`,
              fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
            }}
          >
            {/* ── header ── */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"16px 18px 14px",
              borderBottom:`1px solid ${tk.BORDER}`,
              background: tk.BG_HEADER,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:38, height:38, borderRadius:12,
                  background: tk.P_L,
                  border:`1px solid rgba(91,91,214,0.18)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <ArrowRightLeft size={17} color={tk.P}/>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:tk.TEXT, letterSpacing:"-0.02em" }}>
                    {type === "blind" ? "Blind Transfer" : "Supervised Transfer"}
                  </div>
                  <div style={{ fontSize:12, color:tk.MUTED, marginTop:1 }}>
                    Choose where to transfer this call
                  </div>
                </div>
              </div>
              <CloseBtn onClick={onCancel} tk={tk}/>
            </div>

            {/* ── tabs ── */}
            <div style={{ display:"flex", borderBottom:`1px solid ${tk.BORDER}`, background:tk.BG }}>
              {TABS.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id as any)}
                    style={{
                      flex:1, border:"none",
                      borderBottom: active ? `2.5px solid ${tk.P}` : "2.5px solid transparent",
                      background: active ? tk.BG_TAB_ACT : "transparent",
                      padding:"11px 8px",
                      fontSize:12.5, fontWeight:700,
                      color: active ? tk.P : tk.MUTED,
                      cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                      transition:"all 0.14s",
                      fontFamily:"inherit",
                    }}
                  >
                    <Icon size={14}/>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── tab content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity:0, y:6 }}
                animate={{ opacity:1, y:0 }}
                exit={{    opacity:0, y:-6 }}
                transition={{ duration:0.14 }}
              >
                {tab === "agents"   &&  <AgentsTab
                        filteredAgents={filteredAgents}
                        selectedAgent={selectedAgent}
                        setAgent={setAgent}
                        search={search}
                        setSearch={setSearch}
                        searchRef={searchRef}
                        onCancel={onCancel}
                        onTransfer={onTransfer}
                        tk={tk}
                        isDark={isDark}
                      />}
                {tab === "contacts" && (
                  <ContactsTab
                    contacts={contacts}
                    onTransfer={onTransfer}
                    tk={tk}
                    isDark={isDark}
                  />
                )}
                {/* {tab === "dialpad"  && <DialpadTab  />} */}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function CloseBtn({ onClick, tk }: { onClick: () => void; tk: any }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width:32, height:32, borderRadius:9,
        border:"none",
        background: h ? tk.BG : "transparent",
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        color: h ? tk.TEXT : tk.MUTED, transition:"all 0.14s",
      }}
    >
      <X size={17}/>
    </button>
  );
}

function EmptyState({ icon, text, tk }: { icon: React.ReactNode; text: string; tk: any }) {
  return (
    <div style={{ padding:"40px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      {icon}
      <span style={{ fontSize:13.5, color:tk.MUTED, fontWeight:500 }}>{text}</span>
    </div>
  );
}

function FooterBtn({ label, icon=null, primary=false, disabled=false, onClick, tk }: any) {
  const [h, setH] = useState(false);
  const bg    = primary
    ? disabled ? (tk ? "#3A3A4A" : "#D1D5DB") : h ? "#4747C2" : tk.P
    : h ? tk.BG : tk.BG_CARD;
  const color = primary ? "#fff" : h ? tk.TEXT : tk.TEXT2;
  const border = primary ? "none" : `1px solid ${tk.BORDER}`;
  const shadow = primary && !disabled ? (h ? "0 6px 18px rgba(91,91,214,0.34)" : "0 4px 14px rgba(91,91,214,0.24)") : "none";
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      disabled={disabled}
      style={{
        display:"flex", alignItems:"center", gap:7,
        padding:"10px 18px", borderRadius:11,
        border, background:bg, color,
        fontSize:13.5, fontWeight:700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow:shadow, fontFamily:"inherit",
        transition:"all 0.14s",
      }}
    >
      {icon}{label}
    </button>
  );
}

function DialKey({ digit, letters, onPress, tk }: { digit:string; letters:string; onPress:()=>void; tk:any }) {
  const [h, setH] = useState(false);
  return (
    <motion.button
      whileTap={{ scale:0.91 }}
      onClick={onPress}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        height:64, borderRadius:16,
        border:`1px solid ${h ? "rgba(91,91,214,0.20)" : tk.BORDER}`,
        background: h ? tk.P_L : tk.BG,
        cursor:"pointer", gap:2,
        transition:"all 0.12s",
        fontFamily:"inherit",
      }}
    >
      <span style={{ fontSize:20, fontWeight:700, color: h ? tk.P : tk.TEXT, lineHeight:1 }}>
        {digit}
      </span>
      {letters && (
        <span style={{ fontSize:9, fontWeight:600, color: h ? tk.P : tk.MUTED, letterSpacing:"0.10em" }}>
          {letters}
        </span>
      )}
    </motion.button>
  );
}