// pages/Contact.tsx
// @ts-nocheck
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCall } from "../context/CallContext";
import { useFloatingChat } from "../context/FloatingChatContext";
import { useTeamCall } from "../context/TeamCallContext";
import { AddContactModal } from "../components/AddContactModal";
import { EditContactModal } from "../components/EditContactModal";
import { DeleteContactModal } from "../components/DeleteContactModal";
import BlockNumberConfirmModal from "../components/BlockNumberConfirmModal";
import { BlockNumberModal } from "../components/BlockNumberModal";
import { useSendEmailModal } from "../components/useSendEmailModal";
import TeamCallChat from "../components/TeamCallChat";
import api from "../api";
import { toast } from "react-hot-toast";
import {
  Search, UserPlus, X, Phone, MessageCircle,
  Pencil, Trash2, Users, Copy, Check, ChevronRight,
  Building2, Mail, Hash,
} from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/* ─── helpers ───────────────────────────────────────────── */
const PALETTE = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#f97316","#ec4899",
];
const avatarColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < (s||"").length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};
const fmtPhone = (e164: string) => {
  try { const p = parsePhoneNumberFromString(e164); if (p?.isValid()) return p.formatNational(); } catch {}
  return e164;
};
const nameIni = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0]||"") + (parts[1]?.[0]||"")).toUpperCase() || "?";
};

/* ─── tokens ────────────────────────────────────────────── */
const dk = (d: boolean) => ({
  // surfaces
  shell:       d ? "#0c0e1c" : "#f0f2f5",
  sidebar:     d ? "#101322" : "#ffffff",
  panel:       d ? "#101322" : "#ffffff",
  card:        d ? "#181b2e" : "#f8f9fc",
  // borders
  border:      d ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  divider:     d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
  // text
  text:        d ? "#f0f1f8" : "#0d0f1e",
  sub:         d ? "#7e8096" : "#6b7280",
  dim:         d ? "#484860" : "#b0b4c4",
  // accent
  accent:      d ? "#818cf8" : "#6366f1",
  accentDeep:  d ? "#6366f1" : "#4f46e5",
  accentSoft:  d ? "rgba(99,102,241,0.13)" : "rgba(99,102,241,0.07)",
  accentBorder:d ? "rgba(99,102,241,0.28)" : "rgba(99,102,241,0.18)",
  // states
  rowHover:    d ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)",
  rowActive:   d ? "rgba(99,102,241,0.11)" : "rgba(99,102,241,0.07)",
  // inputs
  inputBg:     d ? "rgba(255,255,255,0.045)" : "#f3f4f8",
  inputBorder: d ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
  // buttons
  btnCall:     d ? "rgba(99,102,241,0.18)" : "#ede9fe",
  btnMsg:      d ? "rgba(16,185,129,0.18)" : "#d1fae5",
  btnEmail:    d ? "rgba(245,158,11,0.18)" : "#fef3c7",
  btnEdit:     d ? "rgba(6,182,212,0.15)" : "#cffafe",
  btnDel:      d ? "rgba(239,68,68,0.13)" : "#fee2e2",
  // misc
  green:   "#22c55e",
  red:     "#ef4444",
  letter:  d ? "#2e3054" : "#d1d5db",
  shadow:  d ? "0 8px 32px rgba(0,0,0,0.55)" : "0 4px 20px rgba(15,20,60,0.09)",
  sidebarShadow: d ? "none" : "2px 0 12px rgba(0,0,0,0.04)",
});

/* ─── Avatar ────────────────────────────────────────────── */
function Av({ name, size=38, ring=false }: { name:string; size?:number; ring?:boolean }) {
  const c = avatarColor(name);
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:`linear-gradient(135deg,${c}22,${c}44)`,
      border:`${ring?"2":"1.5"}px solid ${c}40`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.35, fontWeight:800, color:c, letterSpacing:"-0.3px",
      userSelect:"none",
    }}>
      {nameIni(name)}
    </div>
  );
}

/* ─── Copy phone ────────────────────────────────────────── */
function CopyPhone({ phone, t }: { phone:string; t:ReturnType<typeof dk> }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(phone); }
    catch { const el = Object.assign(document.createElement("textarea"),{value:phone,style:"position:fixed;opacity:0"}); document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setOk(true); toast.success("Copied!"); setTimeout(()=>setOk(false),1400);
  };
  return (
    <button onClick={copy} title="Copy number" style={{
      display:"inline-flex",alignItems:"center",gap:5,
      background:"none",border:"none",cursor:"pointer",
      fontSize:13.5,color:t.text,fontFamily:"'DM Mono',monospace",
      padding:"3px 8px",borderRadius:7,transition:"background 0.12s",
    }}
      onMouseEnter={e=>e.currentTarget.style.background=t.accentSoft}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
    >
      {fmtPhone(phone)}
      {ok ? <Check size={11} color={t.accent}/> : <Copy size={11} color={t.dim}/>}
    </button>
  );
}

/* ─── Round action button ───────────────────────────────── */
function Orb({ icon:Icon, color, bg, onClick, tip, off=false }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <motion.button
        whileHover={!off?{scale:1.07}:{}} whileTap={!off?{scale:0.92}:{}}
        onClick={!off?onClick:undefined}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        title={tip}
        style={{
          width:44,height:44,borderRadius:"50%",border:"none",
          background:off?"rgba(128,128,128,0.08)":bg,
          color:off?"#9ca3af":color,
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:off?"not-allowed":"pointer",
          boxShadow: hov&&!off ? `0 4px 16px ${color}44` : "none",
          transition:"all 0.15s",flexShrink:0,
        }}>
        <Icon size={18}/>
      </motion.button>
      <span style={{fontSize:10,fontWeight:600,color:off?"#9ca3af":color,letterSpacing:"0.03em",opacity:off?0.5:0.8}}>
        {tip}
      </span>
    </div>
  );
}

/* ─── Contact list row ──────────────────────────────────── */
function Row({ name, sub, active, onClick, t }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:"flex",alignItems:"center",gap:11,
        padding:"8px 16px",cursor:"pointer",userSelect:"none",
        background: active ? t.rowActive : hov ? t.rowHover : "transparent",
        borderLeft:`3px solid ${active?t.accent:"transparent"}`,
        transition:"background 0.1s,border-color 0.1s",
      }}>
      <Av name={name} size={36}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{
          fontSize:13,fontWeight:600,color:t.text,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
        }}>
          {name}
        </div>
        {sub && (
          <div style={{
            fontSize:11.5,color:t.sub,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            marginTop:1,
          }}>
            {sub}
          </div>
        )}
      </div>
      <AnimatePresence>
        {(active||hov) && (
          <motion.div initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
            <ChevronRight size={13} color={active?t.accent:t.dim}/>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Letter divider ────────────────────────────────────── */
function LetterBar({ letter, t }: { letter:string; t:ReturnType<typeof dk> }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:8,
      padding:"10px 16px 4px",
    }}>
      <span style={{
        fontSize:10,fontWeight:900,color:t.letter,
        letterSpacing:"0.12em",textTransform:"uppercase",
      }}>
        {letter}
      </span>
      <div style={{flex:1,height:"1px",background:t.divider}}/>
    </div>
  );
}

/* ─── Info row in detail panel ──────────────────────────── */
function InfoRow({ label, children, t }: { label:string; children:React.ReactNode; t:ReturnType<typeof dk> }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",minHeight:44,
      borderBottom:`1px solid ${t.divider}`,
      gap:12,
    }}>
      <div style={{
        width:88,flexShrink:0,fontSize:12,fontWeight:600,
        color:t.dim,textTransform:"capitalize",letterSpacing:"0.01em",
      }}>
        {label}
      </div>
      <div style={{flex:1,paddingRight:8}}>{children}</div>
    </div>
  );
}

/* ─── Section heading in detail ─────────────────────────── */
function SectionHead({ label, t }: { label:string; t:ReturnType<typeof dk> }) {
  return (
    <div style={{
      fontSize:10.5,fontWeight:800,color:t.dim,
      letterSpacing:"0.10em",textTransform:"uppercase",
      padding:"20px 0 10px",
    }}>
      {label}
    </div>
  );
}

/* ─── Detail shell (shared layout) ─────────────────────── */
function Shell({ name, subtitle, actions, children, t }: any) {
  const color = avatarColor(name);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      {/* hero header */}
      <div style={{
        padding:"28px 28px 22px",
        borderBottom:`1px solid ${t.border}`,
        background: t.sidebar,
        flexShrink:0,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
          <div style={{
            width:60,height:60,borderRadius:"50%",flexShrink:0,
            background:`linear-gradient(135deg,${color}28,${color}50)`,
            border:`2px solid ${color}44`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22,fontWeight:900,color,userSelect:"none",
          }}>
            {nameIni(name)}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{
              fontSize:19,fontWeight:800,color:t.text,
              letterSpacing:"-0.4px",marginBottom:3,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            }}>
              {name}
            </div>
            <div style={{fontSize:12.5,color:t.sub}}>{subtitle}</div>
          </div>
        </div>
        {/* orb row */}
        <div style={{display:"flex",gap:20}}>{actions}</div>
      </div>

      {/* tab bar */}
      <div style={{
        display:"flex",padding:"0 24px",
        borderBottom:`1px solid ${t.border}`,
        background:t.sidebar,flexShrink:0,
      }}>
        <div style={{
          padding:"11px 2px",fontSize:13,fontWeight:700,
          color:t.accent,
          borderBottom:`2.5px solid ${t.accent}`,
          marginBottom:"-1px",letterSpacing:"-0.1px",
        }}>
          Info
        </div>
      </div>

      {/* scrollable body */}
      <div style={{
        flex:1,overflowY:"auto",
        padding:"0 28px 28px",
        minHeight:0,
      }}
        className="ct-detail-scroll"
      >
        {children}
      </div>
    </div>
  );
}

/* ─── My Contact detail ─────────────────────────────────── */
function MyDetail({ c, t, onCall, onMsg, onEdit, onDel, canMsg, canEdit, canDel }: any) {
  const name = `${c.firstName||""} ${c.lastName||""}`.trim() || "Unknown";
  const primary = c.phones?.[0]?.numberE164;
  return (
    <Shell
      name={name}
      subtitle={c.company || "Contact"}
      t={t}
      actions={<>
        <Orb icon={Phone}         color={t.accent}  bg={t.btnCall}  tip="Call"    off={!primary} onClick={()=>onCall(primary)}/>
        {canMsg && <Orb icon={MessageCircle} color="#10b981" bg={t.btnMsg}  tip="Message" off={!primary} onClick={()=>onMsg(primary,name)}/>}
        {canEdit&& <Orb icon={Pencil}        color="#06b6d4" bg={t.btnEdit} tip="Edit"    onClick={onEdit}/>}
        {canDel && <Orb icon={Trash2}        color="#ef4444" bg={t.btnDel}  tip="Delete"  onClick={onDel}/>}
      </>}
    >
      {/* phones */}
      {c.phones?.length > 0 && (<>
        <SectionHead label="Contact Information" t={t}/>
        {c.phones.map((p:any,i:number)=>(
          <InfoRow key={i} label={p.label||"Work"} t={t}>
            <CopyPhone phone={p.numberE164} t={t}/>
          </InfoRow>
        ))}
      </>)}

      {/* email */}
      {c.email && (
        <InfoRow label="Email" t={t}>
          <span style={{fontSize:13,color:t.text}}>{c.email}</span>
        </InfoRow>
      )}

      {/* company / title / website */}
      {(c.company||c.title||c.website) && (<>
        <SectionHead label="Organization" t={t}/>
        {c.company && <InfoRow label="Company" t={t}><span style={{fontSize:13,color:t.text}}>{c.company}</span></InfoRow>}
        {c.title   && <InfoRow label="Title"   t={t}><span style={{fontSize:13,color:t.text}}>{c.title}</span></InfoRow>}
        {c.website && <InfoRow label="Website" t={t}><a href={c.website} target="_blank" rel="noreferrer" style={{fontSize:13,color:t.accent,textDecoration:"none"}}>{c.website}</a></InfoRow>}
      </>)}

      {/* notes */}
      {c.notes && (<>
        <SectionHead label="Notes" t={t}/>
        <div style={{
          fontSize:13,color:t.sub,lineHeight:1.7,
          whiteSpace:"pre-wrap",
          padding:"10px 14px",borderRadius:10,
          background:t.card,border:`1px solid ${t.border}`,
        }}>
          {c.notes}
        </div>
      </>)}
    </Shell>
  );
}

/* ─── Company / Agent detail ────────────────────────────── */
function AgentDetail({ a, t, onCall, onChat }: any) {
  const name = a.name || "Agent";
  return (
    <Shell
      name={name}
      subtitle="Team Agent"
      t={t}
      actions={<>
        <Orb icon={Phone}         color={t.accent}  bg={t.btnCall} tip="Call"    onClick={onCall}/>
        <Orb icon={MessageCircle} color="#10b981"   bg={t.btnMsg}  tip="Message" onClick={onChat}/>
      </>}
    >
      <SectionHead label="Agent Information" t={t}/>
      <InfoRow label="Status" t={t}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:t.green,fontWeight:600}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block",boxShadow:`0 0 0 3px ${t.green}30`}}/>
          Online
        </span>
      </InfoRow>
      {a.sipIdentity && (
        <InfoRow label="SIP" t={t}>
          <span style={{fontSize:13,color:t.sub,fontFamily:"monospace"}}>{a.sipIdentity}</span>
        </InfoRow>
      )}
      {a.email && (
        <InfoRow label="Email" t={t}>
          <span style={{fontSize:13,color:t.sub}}>{a.email}</span>
        </InfoRow>
      )}
  
    </Shell>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
function Empty({ t }: { t:ReturnType<typeof dk> }) {
  return (
    <div style={{
      height:"100%",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:14,
      color:t.dim,padding:"40px 24px",
    }}>
      <div style={{
        width:64,height:64,borderRadius:"50%",
        background:t.accentSoft,border:`1.5px solid ${t.accentBorder}`,
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>
        <Users size={26} color={t.accent} strokeWidth={1.6}/>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:700,color:t.sub,marginBottom:5}}>
          Select a contact
        </div>
        <div style={{fontSize:12.5,color:t.dim,lineHeight:1.6}}>
          Click any name to view details
        </div>
      </div>
    </div>
  );
}

/* ─── Spinner ───────────────────────────────────────────── */
function Spin({ t }: { t:ReturnType<typeof dk> }) {
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:120}}>
      <div style={{
        width:22,height:22,borderRadius:"50%",
        border:`2.5px solid ${t.accentSoft}`,
        borderTopColor:t.accent,
        animation:"ct-spin 0.75s linear infinite",
      }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function Contact() {
  const { startCall, blockModal, closeBlockModal, unblockNumber } = useCall();
  const { openChat }  = useFloatingChat();
  const teamCall      = useTeamCall();
  const { token, user } = useAuth();
  const { theme }     = useTheme();
  const isDark        = theme === "dark";
  const t             = dk(isDark);
  const { openSendEmailModal, SendEmailModal } = useSendEmailModal();

  const canMsg    = user?.role === "ADMIN" || user?.additionalRole?.viewMessages    === true;
  const canEdit   = user?.role === "ADMIN" || user?.additionalRole?.canEditContact  === true;
  const canDelete = user?.role === "ADMIN" || user?.additionalRole?.canDeleteContact=== true;

  const [tab,  setTab]  = useState<"my"|"co">("my");
  const [contacts,  setContacts]  = useState<any[]>([]);
  const [agents,    setAgents]    = useState<any[]>([]);
  const [search,    setSearch]    = useState("");
  const [sel,       setSel]       = useState<any|null>(null);
  const [loadC, setLoadC] = useState(true);
  const [loadA, setLoadA] = useState(false);
  const [loadedA, setLoadedA] = useState(false);

  const [addOpen,  setAddOpen]   = useState(false);
  const [editC,    setEditC]     = useState<any|null>(null);
  const [delC,     setDelC]      = useState<any|null>(null);
  const [delLoad,  setDelLoad]   = useState(false);
  const [chatPeer, setChatPeer]  = useState<{id:number|string;name:string}|null>(null);

  const fetchC = useCallback(async () => {
    try { const r = await api.get("/contacts",{headers:{Authorization:`Bearer ${token}`}}); setContacts(r.data.data||[]); }
    catch(e){console.error(e);}
    finally { setLoadC(false); }
  }, [token]);

  const fetchA = useCallback(async () => {
    if (loadedA) return;
    setLoadA(true);
    try { const r = await api.get("/auth/team-call-agents",{params:{page:1,limit:200}}); setAgents(r.data?.data||[]); setLoadedA(true); }
    catch(e){console.error(e);}
    finally { setLoadA(false); }
  }, [loadedA]);

  useEffect(()=>{ if(token) fetchC(); },[token]);
  useEffect(()=>{ if(tab==="co") fetchA(); },[tab,fetchA]);
  useEffect(()=>{ setSel(null); setSearch(""); },[tab]);

  const groupC = useMemo(()=>{
    const s=search.toLowerCase();
    const list=contacts.filter(c=>`${c.firstName} ${c.lastName||""} ${c.company||""}`.toLowerCase().includes(s));
    const g:Record<string,any[]>={};
    list.forEach(c=>{ const L=c.firstName?.[0]?.toUpperCase()||"#"; (g[L]=g[L]||[]).push(c); });
    return g;
  },[contacts,search]);

  const groupA = useMemo(()=>{
    const s=search.toLowerCase();
    const list=agents.filter(a=>(a.name||"").toLowerCase().includes(s));
    const g:Record<string,any[]>={};
    list.forEach(a=>{ const L=(a.name?.[0]||"#").toUpperCase(); (g[L]=g[L]||[]).push(a); });
    return g;
  },[agents,search]);

  const handleAdd = async (data:any) => {
    try {
      await api.post("/contacts",{
        firstName:data.firstName,lastName:data.lastName,nickName:data.nickName,
        company:data.company,title:data.title,email:data.email||null,
        source:data.source,birthdate:data.birthdate||null,
        website:data.website||null,notes:data.notes||null,
        addresses:data.addresses?.map((a:any)=>({address:a.address,city:a.city,state:a.state,zip:a.zip,label:a.label})),
        phones:data.phones.map((p:any)=>({numberE164:p.number,label:p.type,isPrimary:false})),
      },{headers:{Authorization:`Bearer ${token}`}});
      fetchC(); setAddOpen(false); toast.success("Contact added!");
    } catch { toast.error("Failed to add contact"); }
  };

  const handleEdit = async (data:any) => {
    if (!editC) return;
    try {
      await api.put(`/contacts/${editC.id}`,{
        firstName:data.firstName,lastName:data.lastName,nickName:data.nickName,
        company:data.company,title:data.title,email:data.email||null,
        source:data.source,birthdate:data.birthdate||null,
        website:data.website||null,notes:data.notes||null,
        addresses:data.addresses?.map((a:any)=>({address:a.address,city:a.city,state:a.state,zip:a.zip,label:a.label})),
        phones:data.phones.map((p:any)=>({numberE164:p.number,label:p.type,isPrimary:false})),
      },{headers:{Authorization:`Bearer ${token}`}});
      fetchC(); setEditC(null); toast.success("Contact updated!");
    } catch { toast.error("Failed to update"); }
  };

  const handleDel = async () => {
    if (!delC) return; setDelLoad(true);
    try {
      await api.delete(`/contacts/${delC.id}`,{headers:{Authorization:`Bearer ${token}`}});
      fetchC(); if(sel?.id===delC.id) setSel(null); setDelC(null); toast.success("Deleted!");
    } catch { toast.error("Failed to delete"); }
    finally { setDelLoad(false); }
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes ct-spin{to{transform:rotate(360deg)}}
        .ct-list::-webkit-scrollbar{width:3px}
        .ct-list::-webkit-scrollbar-thumb{border-radius:99px;background:${isDark?"#252840":"#dde1ee"}}
        .ct-list::-webkit-scrollbar-track{background:transparent}
        .ct-detail-scroll::-webkit-scrollbar{width:3px}
        .ct-detail-scroll::-webkit-scrollbar-thumb{border-radius:99px;background:${isDark?"#252840":"#dde1ee"}}
        .ct-detail-scroll::-webkit-scrollbar-track{background:transparent}
        .ct-search::placeholder{color:${t.dim}}
        .ct-search:focus{outline:none;border-color:${t.accent}77!important}
      `}</style>

      {/* ── root shell — absolute fill of DashboardLayout's <main position:relative> ── */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, bottom:0,
        display:"flex", flexDirection:"column",
        background:t.shell,
        fontFamily:"'Inter',-apple-system,sans-serif",
        overflow:"hidden",
      }}>

        {/* ── top bar ── */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"13px 20px",
          background:t.sidebar,
          borderBottom:`1px solid ${t.border}`,
          flexShrink:0,
          zIndex:2,
        }}>
          <span style={{fontSize:17,fontWeight:800,color:t.text,letterSpacing:"-0.35px"}}>
            Contacts
          </span>
          {tab==="my" && (
            <motion.button
              whileHover={{scale:1.03}} whileTap={{scale:0.96}}
              onClick={()=>setAddOpen(true)}
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"7px 14px",borderRadius:9,border:"none",
                background:t.accentDeep,color:"#fff",
                fontSize:12.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                boxShadow:`0 3px 10px ${t.accentDeep}55`,
              }}
            >
              <UserPlus size={13}/> New Contact
            </motion.button>
          )}
        </div>

        {/* ── split body ── */}
        <div style={{
          flex:1, display:"flex",
          minHeight:0,           /* ← critical: lets flex children shrink */
          overflow:"hidden",
        }}>

          {/* ══ SIDEBAR ══ */}
          <div style={{
            width:300, flexShrink:0,
            display:"flex", flexDirection:"column",
            background:t.sidebar,
            borderRight:`1px solid ${t.border}`,
            boxShadow:t.sidebarShadow,
            overflow:"hidden",  /* ← contains the scrollable list */
            minHeight:0,
          }}>

            {/* tabs */}
            <div style={{
              display:"flex",
              borderBottom:`1px solid ${t.border}`,
              padding:"0 6px",
              flexShrink:0,
            }}>
              {([["my","My Contacts"],["co","Company"]] as const).map(([k,label])=>(
                <button key={k} onClick={()=>setTab(k)} style={{
                  flex:1, padding:"11px 4px", border:"none", background:"transparent",
                  fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  color: tab===k ? t.accent : t.sub,
                  borderBottom:`2.5px solid ${tab===k?t.accent:"transparent"}`,
                  marginBottom:"-1px", transition:"color 0.15s,border-color 0.15s",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* search */}
            <div style={{padding:"10px 12px",flexShrink:0}}>
              <div style={{position:"relative"}}>
                <Search size={13} style={{
                  position:"absolute",left:10,top:"50%",
                  transform:"translateY(-50%)",
                  color:t.dim,pointerEvents:"none",
                }}/>
                <input
                  className="ct-search"
                  value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search…"
                  style={{
                    width:"100%",boxSizing:"border-box",
                    padding:"8px 30px 8px 30px",
                    borderRadius:8,border:`1.5px solid ${t.inputBorder}`,
                    background:t.inputBg,color:t.text,fontSize:12.5,
                    fontFamily:"inherit",transition:"border-color 0.15s",
                  }}
                />
                {search && (
                  <button onClick={()=>setSearch("")} style={{
                    position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                    border:"none",background:"transparent",cursor:"pointer",
                    color:t.dim,padding:0,display:"flex",alignItems:"center",
                  }}>
                    <X size={12}/>
                  </button>
                )}
              </div>
            </div>

            {/* scrollable list — flex:1 + overflow:auto + minHeight:0 */}
            <div
              className="ct-list"
              style={{
                flex:1, overflowY:"auto",
                minHeight:0,   /* ← critical */
                paddingBottom:8,
              }}
            >
              {tab==="my" ? (
                loadC ? <Spin t={t}/> :
                Object.keys(groupC).length===0
                  ? <div style={{padding:"32px 16px",textAlign:"center",fontSize:12.5,color:t.dim}}>
                      {search?"No contacts match":"No contacts yet"}
                    </div>
                  : Object.keys(groupC).sort().map(L=>(
                      <div key={L}>
                        <LetterBar letter={L} t={t}/>
                        {groupC[L].map((c:any)=>{
                          const name=`${c.firstName||""} ${c.lastName||""}`.trim()||"Unknown";
                          const ph=c.phones?.[0]?.numberE164;
                          return (
                            <Row key={c.id} name={name}
                              sub={ph?`Work · ${fmtPhone(ph)}`:(c.company||"")}
                              active={sel?.id===c.id&&tab==="my"}
                              onClick={()=>setSel(c)} t={t}
                            />
                          );
                        })}
                      </div>
                    ))
              ) : (
                loadA ? <Spin t={t}/> :
                Object.keys(groupA).length===0
                  ? <div style={{padding:"32px 16px",textAlign:"center",fontSize:12.5,color:t.dim}}>
                      {search?"No agents match":"No team agents"}
                    </div>
                  : Object.keys(groupA).sort().map(L=>(
                      <div key={L}>
                        <LetterBar letter={L} t={t}/>
                        {groupA[L].map((a:any)=>(
                          <Row key={a.id} name={a.name||"Agent"}
                            sub="Team Agent · Online"
                            active={sel?.id===a.id&&tab==="co"}
                            onClick={()=>setSel(a)} t={t}
                          />
                        ))}
                      </div>
                    ))
              )}
            </div>
          </div>

          {/* ══ DETAIL PANEL ══ */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            background:t.panel,
            minHeight:0, overflow:"hidden",
          }}>
            <AnimatePresence mode="wait">
              {sel ? (
                <motion.div key={`${tab}-${sel.id}`}
                  initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                  transition={{duration:0.14}}
                  style={{height:"100%",display:"flex",flexDirection:"column",minHeight:0}}
                >
                  {tab==="my"
                    ? <MyDetail c={sel} t={t}
                        onCall={(n:string)=>startCall(n)}
                        onMsg={(n:string,name:string)=>openChat(n,name)}
                        onEdit={()=>setEditC(sel)}
                        onDel={()=>setDelC(sel)}
                        canMsg={canMsg} canEdit={canEdit} canDel={canDelete}
                      />
                    : <AgentDetail a={sel} t={t}
                        onCall={()=>teamCall?.startCall({id:sel.id,name:sel.name,sipIdentity:sel.sipIdentity})}
                        onChat={()=>setChatPeer({id:sel.id,name:sel.name||"Agent"})}
                      />
                  }
                </motion.div>
              ) : (
                <motion.div key="empty"
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  style={{height:"100%"}}
                >
                  <Empty t={t}/>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* floating team chat */}
      {chatPeer && <TeamCallChat peer={chatPeer} onClose={()=>setChatPeer(null)}/>}

      {/* modals */}
      <AddContactModal open={addOpen} onClose={()=>setAddOpen(false)} onSubmit={handleAdd}/>
      <EditContactModal open={!!editC} contact={editC} onClose={()=>setEditC(null)} onSubmit={handleEdit}/>
      <DeleteContactModal open={!!delC} contact={delC} loading={delLoad} onClose={()=>setDelC(null)} onConfirm={handleDel}/>
      <BlockNumberModal modal={blockModal} onClose={closeBlockModal} onUnblock={async(n:string)=>{ await unblockNumber(n); closeBlockModal(); startCall(n); }}/>
      {SendEmailModal}
    </>
  );
}
