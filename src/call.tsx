// @ts-nocheck
// src/call.tsx — Ringnex · Call Window v3
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCallIPCState } from "./hooks/useCallIPC";
import TransferModal from "./components/TransferModal";
import CallLeadSaleModal from "./components/LeadSaleModal";
import parsePhoneNumberFromString, { AsYouType } from "libphonenumber-js";
import "./index.css";
import api from './api'

import {
  Mic, MicOff, Pause, Play, Phone, PhoneOff,
  ArrowRightLeft, UserPlus, Minus, X, Layers,
  Hash, ChevronLeft, Delete, Volume2, Volume1,
  CircleDot, Loader2, Check, ChevronDown,
  Users, UserMinus, User, Copy, ScrollText,
} from "lucide-react";
import CallParticipantsPanel from "./components/CallParticipantsPanel";

/* ─── Theme ──────────────────────────────────────────────── */
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as any) || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light"))
        setTheme(e.newValue);
    };
    window.addEventListener("storage", h);
    const iv = setInterval(() => {
      try {
        const v = localStorage.getItem("theme") as any;
        if (v === "dark" || v === "light") setTheme(v);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", h); clearInterval(iv); };
  }, []);
  return theme;
}

/* ─── Tokens ─────────────────────────────────────────────── */
const T = (d: boolean) => ({
  P:            "#6366F1",
  P_SOFT:       d ? "rgba(99,102,241,0.16)"  : "#EEF2FF",
  P_BORDER:     d ? "rgba(99,102,241,0.30)"  : "rgba(99,102,241,0.22)",
  P_TEXT:       d ? "#A5B4FC"                : "#4338CA",

  GREEN:        "#22C55E",
  GREEN_SOFT:   d ? "rgba(34,197,94,0.14)"   : "#DCFCE7",
  GREEN_BORDER: d ? "rgba(34,197,94,0.28)"   : "rgba(34,197,94,0.25)",
  GREEN_TEXT:   d ? "#4ADE80"                : "#15803D",

  RED:          "#EF4444",
  RED_SOFT:     d ? "rgba(239,68,68,0.14)"   : "#FEF2F2",
  RED_BORDER:   d ? "rgba(239,68,68,0.28)"   : "rgba(239,68,68,0.25)",
  RED_TEXT:     d ? "#F87171"                : "#B91C1C",

  AMBER:        "#F59E0B",
  AMBER_SOFT:   d ? "rgba(245,158,11,0.14)"  : "#FFFBEB",
  AMBER_BORDER: d ? "rgba(245,158,11,0.28)"  : "rgba(245,158,11,0.25)",
  AMBER_TEXT:   d ? "#FCD34D"                : "#B45309",

  SHELL:        d ? "#0C1120"                : "#FFFFFF",
  TBAR:         d ? "#090D1C"                : "#FAFAFA",
  SURF:         d ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)",
  SURF2:        d ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.075)",
  SURF_HOV:     d ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.11)",

  TEXT:         d ? "#F1F5F9" : "#0F172A",
  MUTED:        d ? "#94A3B8" : "#64748B",
  FAINT:        d ? "#475569" : "#94A3B8",

  BDR:          d ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  BDR2:         d ? "rgba(255,255,255,0.13)" : "rgba(15,23,42,0.11)",
  BDR3:         d ? "rgba(255,255,255,0.20)" : "rgba(15,23,42,0.16)",

  /* ── Glass layer — frosted panels over the animated mesh background ── */
  MESH_BG:      d
    ? "radial-gradient(120% 90% at 12% -10%, rgba(99,102,241,0.28) 0%, transparent 55%)," +
      "radial-gradient(110% 85% at 105% 15%, rgba(34,197,94,0.16) 0%, transparent 50%)," +
      "radial-gradient(120% 100% at 50% 120%, rgba(168,85,247,0.20) 0%, transparent 55%)," +
      "#070A14"
    : "radial-gradient(120% 90% at 12% -10%, rgba(99,102,241,0.16) 0%, transparent 55%)," +
      "radial-gradient(110% 85% at 105% 15%, rgba(34,197,94,0.12) 0%, transparent 50%)," +
      "radial-gradient(120% 100% at 50% 120%, rgba(244,114,182,0.14) 0%, transparent 55%)," +
      "#F4F5FA",
  GLASS:        d ? "rgba(20,24,42,0.55)"     : "rgba(255,255,255,0.55)",
  GLASS_STRONG: d ? "rgba(15,18,34,0.72)"     : "rgba(255,255,255,0.78)",
  GLASS_BDR:    d ? "rgba(255,255,255,0.10)"  : "rgba(255,255,255,0.65)",
  GLASS_HILITE: d ? "rgba(255,255,255,0.06)"  : "rgba(255,255,255,0.85)",
  GLOW_P:       d ? "rgba(99,102,241,0.45)"   : "rgba(99,102,241,0.30)",
});
type Tokens = ReturnType<typeof T>;

/* ─── Avatar palette ─────────────────────────────────────── */
const AV_L = [
  { bg:"#EEF2FF", bd:"rgba(99,102,241,0.25)",  tx:"#4338CA" },
  { bg:"#ECFDF5", bd:"rgba(52,211,153,0.25)",  tx:"#065F46" },
  { bg:"#FFF7ED", bd:"rgba(251,146,60,0.25)",  tx:"#9A3412" },
  { bg:"#FDF4FF", bd:"rgba(192,132,252,0.25)", tx:"#7E22CE" },
  { bg:"#EFF6FF", bd:"rgba(96,165,250,0.25)",  tx:"#1D4ED8" },
  { bg:"#F0FDF4", bd:"rgba(74,222,128,0.25)",  tx:"#166534" },
];
const AV_D = [
  { bg:"#1E1B4B", bd:"rgba(129,140,248,0.35)", tx:"#C7D2FE" },
  { bg:"#052E16", bd:"rgba(52,211,153,0.35)",  tx:"#A7F3D0" },
  { bg:"#431407", bd:"rgba(251,146,60,0.35)",  tx:"#FED7AA" },
  { bg:"#3B0764", bd:"rgba(192,132,252,0.35)", tx:"#E9D5FF" },
  { bg:"#172554", bd:"rgba(96,165,250,0.35)",  tx:"#BFDBFE" },
  { bg:"#052E1B", bd:"rgba(74,222,128,0.35)",  tx:"#BBF7D0" },
];
function avPal(name: string, dark: boolean) {
  const c = (name || "?").trimStart().charCodeAt(0);
  return dark ? AV_D[c % AV_D.length] : AV_L[c % AV_L.length];
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2,"0")} · ${(s % 60).toString().padStart(2,"0")}`;

const KEYS = [
  {d:"1",s:""},  {d:"2",s:"ABC"}, {d:"3",s:"DEF"},
  {d:"4",s:"GHI"},{d:"5",s:"JKL"},{d:"6",s:"MNO"},
  {d:"7",s:"PQRS"},{d:"8",s:"TUV"},{d:"9",s:"WXYZ"},
  {d:"*",s:""},  {d:"0",s:"+"},   {d:"#",s:""},
];

/* ─── Copyable phone number (click-to-copy + tooltip) ──────── */
function CopyableNumber({
  value, t, style,
}: { value: string; t: Tokens; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover]   = useState(false);
  const toRef               = useRef<number | null>(null);

  const canCopy = !!value && value !== "—" && value !== "Calling...";

  const doCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canCopy) return;

    const markCopied = () => {
      setCopied(true);
      if (toRef.current) window.clearTimeout(toRef.current);
      toRef.current = window.setTimeout(() => setCopied(false), 1400);
    };

    // 1) Electron native clipboard — most reliable, no permission/focus prompt.
    try {
      if (window?.electronAPI?.writeClipboard?.(value)) { markCopied(); return; }
    } catch {}

    // 2) Browser async clipboard API.
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        markCopied();
        return;
      }
    } catch {}

    // 3) Legacy execCommand fallback (works when the other two are blocked).
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) { markCopied(); return; }
    } catch {}

    console.warn("Copy number failed: all clipboard methods blocked");
  };

  useEffect(() => () => { if (toRef.current) window.clearTimeout(toRef.current); }, []);

  return (
    <span
      onClick={doCopy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={canCopy ? (copied ? "Copied!" : "Click to copy number") : undefined}
      style={{
        position: "relative",
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: canCopy ? "pointer" : "default",
        userSelect: "text", WebkitUserSelect: "text",
        maxWidth: "100%",
        ...style,
      }}
    >
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </span>
      {canCopy && (
        <span style={{
          display: "inline-flex", flexShrink: 0,
          color: copied ? t.GREEN_TEXT : hover ? t.P_TEXT : t.FAINT,
          transition: "color 0.12s ease",
        }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </span>
      )}
      {canCopy && (hover || copied) && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: copied ? t.GREEN : t.SHELL,
          color: copied ? "#fff" : t.TEXT,
          border: `1px solid ${copied ? "transparent" : t.BDR2}`,
          borderRadius: 8, padding: "3px 8px",
          fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
          letterSpacing: "0.02em", zIndex: 50, pointerEvents: "none",
        }}>
          {copied ? "Copied!" : "Copy number"}
        </span>
      )}
    </span>
  );
}

/* ═══ KEYPAD ════════════════════════════════════════════════ */
function Keypad({
  onDigit, onBack, t, isMuted, isOnHold,
  onMute, onHold, onTransfer, onLead, onCallTransfer,
}: {
  onDigit:(d:string)=>void; onBack:()=>void; t:Tokens;
  isMuted:boolean; isOnHold:boolean;
  onMute:()=>void; onHold:()=>void; onTransfer:()=>void;
  onLead:()=>void; onCallTransfer:(n:string)=>void;
}) {
  const [display, setDisplay] = useState("");
  const [mode, setMode]       = useState<"dtmf"|"call">("dtmf");
  const inputRef              = useRef<HTMLInputElement>(null);

  // Focus hidden input so keyboard works immediately
  useEffect(() => { inputRef.current?.focus(); }, [mode]);

  const region = (v:string) => v.startsWith("+")?"US":/^0[3-9]/.test(v)?"PK":"US";
  const toE164 = (v:string) => {
    if (!v) return "";
    try {
      const p = parsePhoneNumberFromString(v, region(v));
      return p?.isValid() ? p.number : v.replace(/[^\d+]/g,"");
    } catch { return v.replace(/[^\d+]/g,""); }
  };
  const phoneFmt = (v:string) => v
    ? v.startsWith("+") ? new AsYouType().input(v) : new AsYouType(region(v)).input(v)
    : "";

  // Allowed chars per mode
  const allowed = mode === "dtmf"
    ? /^[0-9*#]$/
    : /^[0-9+\-()\s]$/;

  const press = (d: string) => {
    setDisplay(p => p + d);
    if (mode === "dtmf") onDigit(d);
    inputRef.current?.focus();
  };

  // Keyboard input handler — supports typing + paste
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      setDisplay(p => p.slice(0, -1));
      return;
    }
    if (e.key === "Enter" && mode === "call") {
      const e164 = toE164(display);
      if (e164) onCallTransfer(e164);
      return;
    }
    if (e.key === "Escape") { onBack(); return; }
    if (e.key.length === 1 && allowed.test(e.key)) {
      const ch = e.key;
      setDisplay(p => p + ch);
      if (mode === "dtmf") onDigit(ch);
    }
  };

  // Paste support
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text");
    const cleaned = mode === "dtmf"
      ? raw.replace(/[^0-9*#]/g, "")
      : raw.replace(/[^0-9+\-() ]/g, "");
    if (!cleaned) return;
    setDisplay(p => p + cleaned);
    if (mode === "dtmf") {
      for (const ch of cleaned) onDigit(ch);
    }
  };

  const e164  = toE164(display);
  const ready = mode === "call" && !!e164;

  const quickBtns = [
    { icon:isMuted?<MicOff size={16}/>:<Mic size={16}/>, label:isMuted?"Unmute":"Mute",
      on:isMuted, color:t.RED, soft:t.RED_SOFT, bdr:t.RED_BORDER, click:onMute },
    { icon:isOnHold?<Play size={16}/>:<Pause size={16}/>, label:isOnHold?"Resume":"Hold",
      on:isOnHold, color:t.AMBER, soft:t.AMBER_SOFT, bdr:t.AMBER_BORDER, click:onHold },
    { icon:<ArrowRightLeft size={16}/>, label:"Transfer",
      on:false, color:t.P, soft:t.P_SOFT, bdr:t.P_BORDER, click:onTransfer },
    { icon:<UserPlus size={16}/>, label:"Lead",
      on:false, color:t.P, soft:t.P_SOFT, bdr:t.P_BORDER, click:onLead },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      {/* Hidden input that captures keyboard + paste */}
      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={()=>{}} // controlled via state
        value=""
        readOnly
        style={{
          position:"absolute", opacity:0, pointerEvents:"none",
          width:1, height:1, top:0, left:0,
        }}
        aria-label="Digit input"
      />

      {/* quick actions */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
        {quickBtns.map(b=>(
          <MiniBtn key={b.label} icon={b.icon} label={b.label}
            active={b.on} color={b.color} soft={b.soft} bdr={b.bdr}
            onClick={b.click} t={t}/>
        ))}
      </div>

      {/* segment */}
      <div style={{
        display:"flex",gap:3,padding:3,borderRadius:999,
        background:t.SURF, border:`1px solid ${t.BDR}`,
      }}>
        {(["dtmf","call"] as const).map(m=>(
          <button key={m} onClick={()=>{setMode(m);setDisplay("");setTimeout(()=>inputRef.current?.focus(),50);}}
            style={{
              flex:1,height:28,borderRadius:999,border:"none",fontFamily:"inherit",
              background:mode===m?(m==="dtmf"?t.P:t.GREEN):"transparent",
              color:mode===m?"#fff":t.MUTED,
              fontSize:10.5,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
              transition:"all 0.14s ease",
            }}>
            {m==="dtmf"?<Hash size={11}/>:<Phone size={11}/>}
            {m==="dtmf"?"DTMF":"Call transfer"}
          </button>
        ))}
      </div>

      {/* display — clickable to re-focus hidden input */}
      <div
        onClick={()=>inputRef.current?.focus()}
        style={{
          minHeight:46,borderRadius:12,
          border:`1px solid ${ready?t.GREEN_BORDER:t.BDR2}`,
          background:t.SURF,padding:"6px 10px 6px 14px",
          display:"flex",alignItems:"center",gap:6,cursor:"text",
          transition:"border-color 0.18s ease",
        }}>
        <span style={{
          flex:1,textAlign:"center",
          fontSize:mode==="call"?16:21,fontWeight:400,
          color:ready?t.GREEN_TEXT:t.TEXT,
          letterSpacing:mode==="dtmf"?"0.16em":"-0.01em",
          fontVariantNumeric:"tabular-nums",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          fontFamily:mode==="dtmf"?"'SF Mono','Fira Code',ui-monospace,monospace":"inherit",
        }}>
          {display
            ? (mode==="call"?phoneFmt(display):display)
            : <em style={{color:t.FAINT,fontSize:11.5,fontStyle:"normal",fontWeight:500}}>
                {mode==="dtmf"
                  ? "Press Digit"
                  : "Type to dial..."}
              </em>
          }
        </span>
        {display&&(
          <button
            onClick={e=>{e.stopPropagation();setDisplay(p=>p.slice(0,-1));inputRef.current?.focus();}}
            aria-label="Delete digit"
            style={{width:28,height:28,borderRadius:"50%",border:"none",
              background:"transparent",color:t.MUTED,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Delete size={15}/>
          </button>
        )}
      </div>

      {/* key grid */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(3,1fr)",
        gap:"8px 12px",justifyItems:"center",padding:"0 6px",
      }}>
        {KEYS.map(({d,s})=><DialKey key={d} digit={d} sub={s} onPress={press} t={t}/>)}
      </div>

      {/* transfer btn (call mode) */}
      {mode==="call"&&(
        <div style={{justifyContent:'center',display:'flex'}}>
        <button onClick={()=>{if(!e164)return;onCallTransfer(e164);}} disabled={!e164}
          style={{
            width:60, height:60,minHeight:40,borderRadius:999,fontFamily:"inherit",
            border:`1px solid ${e164?"transparent":t.BDR}`,
            background:e164?t.GREEN:t.SURF,color:e164?"#fff":t.FAINT,
            fontSize:12.5,fontWeight:700,cursor:e164?"pointer":"not-allowed",
            opacity:e164?1:0.5,
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            transition:"all 0.14s ease",
          }}>
          <Phone size={15}/>
        </button>
        </div>
      )}

      {/* back */}
      <button onClick={onBack}
        style={{
          width:"100%",minHeight:36,borderRadius:999,fontFamily:"inherit",
          border:`1px solid ${t.BDR2}`,background:"transparent",color:t.MUTED,
          fontSize:11.5,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:5,
        }}>
        <ChevronLeft size={14}/> Back to call
      </button>
    </div>
  );
}

function DialKey({digit,sub,onPress,t}:{digit:string;sub:string;onPress:(d:string)=>void;t:Tokens}) {
  const [p,setP]=useState(false);
  return (
    <button onClick={()=>{setP(true);onPress(digit);setTimeout(()=>setP(false),100);}}
      style={{
        width:60,height:60,borderRadius:"50%",fontFamily:"inherit",
        border:`1px solid ${p?t.GLASS_HILITE:t.GLASS_BDR}`,
        background:p?t.GLASS_STRONG:t.GLASS,color:t.TEXT,cursor:"pointer",
        backdropFilter:"blur(10px) saturate(160%)",WebkitBackdropFilter:"blur(10px) saturate(160%)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        transform:p?"scale(0.92)":"scale(1)",
        boxShadow:`inset 0 1px 0 ${t.GLASS_HILITE}`,
        transition:"transform 0.08s ease,background 0.08s ease",
      }}>
      <span style={{fontSize:24,lineHeight:1,fontWeight:300,letterSpacing:"-0.03em"}}>{digit}</span>
      <small style={{fontSize:8.5,fontWeight:800,letterSpacing:"0.15em",opacity:0.5,minHeight:9}}>{sub}</small>
    </button>
  );
}

function MiniBtn({icon,label,active,color,soft,bdr,onClick,t}:any) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,
        border:"none",background:"transparent",padding:0,cursor:"pointer",fontFamily:"inherit"}}>
      <div style={{
        width:40,height:40,borderRadius:"50%",
        background:active?soft:h?t.SURF_HOV:t.SURF2,
        border:`1px solid ${active?bdr:h?t.BDR2:t.BDR}`,
        color:active?color:h?t.TEXT:t.MUTED,
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 0.13s ease",
        transform:h?"translateY(-1px)":"none",
      }}>{icon}</div>
      <span style={{fontSize:9,fontWeight:700,color:active?color:t.MUTED,lineHeight:1}}>{label}</span>
    </button>
  );
}

/* ═══ SPEAKER HOOK ══════════════════════════════════════════ */
type AudioDevice = { deviceId: string; label: string };

function useSpeaker(sendAction: (a: any) => void) {
  const [devices, setDevices]         = useState<AudioDevice[]>([]);
  const [activeId, setActiveId]       = useState<string>("default");
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const pickerRef                     = useRef<HTMLDivElement>(null);

  // Load devices via IPC (proxied through main window renderer)
  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      // Try Electron IPC first
      if (window.electronAPI?.getAudioOutputDevices) {
        const list = await window.electronAPI.getAudioOutputDevices();
        setDevices(list?.length ? list : [{ deviceId: "default", label: "Default speaker" }]);
      } else {
        // Direct browser fallback (dev mode without Electron)
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        const all = await navigator.mediaDevices.enumerateDevices();
        const out = all
          .filter(d => d.kind === "audiooutput")
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || (d.deviceId === "default" ? "Default speaker" : `Speaker ${d.deviceId.slice(0, 6)}`),
          }));
        setDevices(out.length ? out : [{ deviceId: "default", label: "Default speaker" }]);
      }
    } catch {
      setDevices([{ deviceId: "default", label: "Default speaker" }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open picker — load devices on first open
  const toggleOpen = useCallback(async () => {
    if (!open && devices.length === 0) await loadDevices();
    setOpen(p => !p);
  }, [open, devices.length, loadDevices]);

  // Select a device — send IPC action to main window → useTwilioDevice.setSpeaker
  const selectDevice = useCallback((deviceId: string) => {
    setActiveId(deviceId);
    setOpen(false);
    sendAction({ type: "SPEAKER", payload: { deviceId } });
  }, [sendAction]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = devices.find(d => d.deviceId === activeId)?.label ?? "Speaker";

  return { devices, activeId, activeLabel, open, loading, toggleOpen, selectDevice, pickerRef };
}

/* ─── Speaker Picker Popup ───────────────────────────────── */
function SpeakerPicker({
  hook, t,
}: {
  hook: ReturnType<typeof useSpeaker>;
  t: Tokens;
}) {
  const { devices, activeId, activeLabel, open, loading, toggleOpen, selectDevice, pickerRef } = hook;

  // Shorten label for the button
  const shortLabel = activeLabel.length > 18 ? activeLabel.slice(0, 17) + "…" : activeLabel;

  return (
    <div ref={pickerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger button — styled like a chip */}
      <button
        onClick={toggleOpen}
        title={activeLabel}
        style={{
          width: "100%",
          height: 36,
          borderRadius: 10,
          border: `1px solid ${open ? t.P_BORDER : t.BDR2}`,
          background: open ? t.P_SOFT : t.SURF2,
          color: open ? t.P_TEXT : t.TEXT,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11.5,
          fontWeight: 600,
          transition: "all 0.14s ease",
        }}
      >
        <Volume2 size={14} style={{ flexShrink: 0, color: open ? t.P_TEXT : t.MUTED }} />
        <span style={{
          flex: 1, textAlign: "left",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {shortLabel}
        </span>
        <ChevronDown
          size={12}
          style={{
            flexShrink: 0,
            color: t.MUTED,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.14s ease",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: 0, right: 0,
          background: t.SHELL,
          border: `1px solid ${t.BDR2}`,
          borderRadius: 12,
          overflow: "hidden",
          zIndex: 999,
          // no box-shadow per design rules
        }}>
          {/* Header */}
          <div style={{
            padding: "8px 12px 6px",
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: t.MUTED,
            borderBottom: `1px solid ${t.BDR}`,
          }}>
            Output device
          </div>

          {/* Device list */}
          {loading ? (
            <div style={{
              padding: "10px 12px",
              fontSize: 12,
              color: t.MUTED,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <Loader2 size={13} className="aio-spin" /> Loading…
            </div>
          ) : devices.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: t.FAINT }}>
              No devices found
            </div>
          ) : (
            devices.map(d => {
              const isActive = d.deviceId === activeId;
              return (
                <button
                  key={d.deviceId}
                  onClick={() => selectDevice(d.deviceId)}
                  title={d.label}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: isActive ? t.P_SOFT : "transparent",
                    color: isActive ? t.P_TEXT : t.TEXT,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                    borderBottom: `1px solid ${t.BDR}`,
                    transition: "background 0.1s ease",
                  }}
                >
                  {/* Icon: active = colored volume, else muted */}
                  {isActive
                    ? <Volume2 size={13} style={{ flexShrink: 0, color: t.P_TEXT }} />
                    : <Volume1 size={13} style={{ flexShrink: 0, color: t.FAINT }} />
                  }
                  <span style={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {d.label}
                  </span>
                  {isActive && (
                    <Check size={12} style={{ flexShrink: 0, color: t.P_TEXT }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN ══════════════════════════════════════════════════ */
export default function CallDesktopApp() {
  const {state,sendAction,minimizeWindow,closeWindow} = useCallIPCState();
  const [showTransfer,setShowTransfer] = useState(false);
  const [selAgent,setSelAgent]         = useState<any>(null);
  const [showLead,setShowLead]         = useState(false);
  const [showKeypad,setShowKeypad]     = useState(false);
  const [showScript,setShowScript]     = useState(false);
  const [scripts,setScripts]           = useState<any[]>([]);
  const [activeScript,setActiveScript] = useState<any>(null);
  const [scriptsLoaded,setScriptsLoaded] = useState(false);

  const isDark = useLocalTheme()==="dark";
  const t      = useMemo(()=>T(isDark),[isDark]);

  // Read stored user to check privileges
  const storedUser  = useMemo(() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } }, []);
  const canViewScript = storedUser.role === "ADMIN" || storedUser.additionalRole?.viewScript === true;

  // Speaker hook — must be after sendAction is available
  const speaker = useSpeaker(sendAction);

  const name   = state.customerName   || state.incoming?.customerName || "Unknown Caller";
  const number = state.customerNumber || state.incoming?.from         || "—";

  const isIncoming = state.status==="INCOMING";
  const isActive   = state.status==="ON_CALL"||state.status==="DIALING";
  const isOnCall   = state.status==="ON_CALL";
  const isDialing  = state.status==="DIALING";
  const kpOpen     = isOnCall && showKeypad;

  // Fetch agent's assigned scripts (once per session)
  useEffect(() => {
    if (scriptsLoaded) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    api.get("/voice/scripts/my")
      .then(res => {
        const list = res.data.data || [];
        setScripts(list);
        if (list.length > 0) setActiveScript(list[0]);
        setScriptsLoaded(true);
      })
      .catch(() => setScriptsLoaded(true));
  }, [scriptsLoaded]);

  const pal = avPal(name, isDark);

  const pillCfg = useMemo(()=>({
    INCOMING:{ label:"Incoming call", dot:t.P,     bg:t.P_SOFT,     tc:t.P_TEXT    },
    DIALING: { label:"Connecting",    dot:t.AMBER, bg:t.AMBER_SOFT, tc:t.AMBER_TEXT},
    ON_CALL: { label:"On call",       dot:t.GREEN, bg:t.GREEN_SOFT, tc:t.GREEN_TEXT},
  }[state.status]??{ label:"Ready", dot:t.FAINT, bg:t.SURF, tc:t.MUTED }),[state.status,t]);

  const doTransfer  = (p:any)=>{ sendAction({type:"TRANSFER",payload:p}); setShowTransfer(false); setSelAgent(null); };
  const fetchCtx    = useCallback((n:string)=>sendAction({type:"FETCH_CONTACT_INFO",payload:{number:n}}),[sendAction]);
  const openLead    = ()=>{ if(number!=="—")fetchCtx(number); setShowLead(true); };
  const dtmf        = useCallback((d:string)=>sendAction({type:"DTMF",payload:{digit:d}}),[sendAction]);
  const dialpadXfer = useCallback((n:string)=>{ sendAction({type:"TRANSFER",payload:{mode:"dialpad",number:n}}); setShowKeypad(false); },[sendAction]);

  return (
    <>
      <div style={{
        width:"100vw",height:"100vh",
        background:t.MESH_BG,color:t.TEXT,
        backgroundSize:"200% 200%",
        animation:"aio-mesh-drift 22s ease-in-out infinite",
        fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        userSelect:"none",WebkitFontSmoothing:"antialiased",
        display:"flex",flexDirection:"column",overflow:"hidden",
        position:"relative",
      }}>

        {/* ── Titlebar (glass) ── */}
        <div style={{
          height:42,padding:"0 12px",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
          WebkitBackdropFilter:"blur(18px) saturate(160%)",
          borderBottom:`1px solid ${t.GLASS_BDR}`,
          WebkitAppRegion:"drag",zIndex:10,position:"relative",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{
              width:24,height:24,borderRadius:8,
              background:`linear-gradient(135deg, ${t.P}, #818CF8)`,
              display:"flex",alignItems:"center",justifyContent:"center",
              border:`1px solid ${t.GLASS_HILITE}`,
            }}>
              <Layers size={13} color="#fff"/>
            </div>
            <span style={{fontSize:12.5,fontWeight:800,letterSpacing:"-0.02em",color:t.TEXT}}>
              Ringnex
            </span>
          </div>
          <div style={{display:"flex",gap:4,WebkitAppRegion:"no-drag"}}>
            <WinBtn icon={<Minus size={10}/>} onClick={minimizeWindow} t={t}/>
            <WinBtn icon={<X size={10}/>}     onClick={closeWindow}    t={t} danger/>
          </div>
        </div>

        {/* ══════════════════════════════════════
            HERO — ON_CALL: horizontal layout
            INCOMING / DIALING: vertical layout
            KEYPAD open: compact strip
        ══════════════════════════════════════ */}
        {kpOpen ? (
          /* ── Compact hero strip when keypad open ── */
          <div style={{
            padding:"9px 14px",flexShrink:0,
            display:"flex",alignItems:"center",gap:10,
            background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
            WebkitBackdropFilter:"blur(18px) saturate(160%)",
            borderBottom:`1px solid ${t.GLASS_BDR}`,
          }}>
            <div style={{
              width:32,height:32,borderRadius:"50%",flexShrink:0,
              background:pal.bg,border:`1.5px solid ${pal.bd}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:700,color:pal.tx,
            }}>{(name[0]||"?").toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:"0 0 1px",fontSize:12.5,fontWeight:600,color:t.TEXT,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</p>
              <p style={{margin:0,fontSize:10.5,color:t.MUTED,
                fontFamily:"'SF Mono','Fira Code',ui-monospace,monospace",
                fontVariantNumeric:"tabular-nums",letterSpacing:"0.06em"}}>
                {fmt(state.duration||0)}
              </p>
            </div>
            <div style={{
              display:"flex",alignItems:"center",gap:5,flexShrink:0,
              fontSize:9.5,fontWeight:700,color:t.GREEN_TEXT,
              background:t.GREEN_SOFT,border:`1px solid ${t.GREEN_BORDER}`,
              borderRadius:999,padding:"3px 9px",
            }}>
              <div style={{width:5,height:5,borderRadius:"50%",background:t.GREEN}}/>
              Live
            </div>
          </div>

        ) : isOnCall ? (
          /* ── ON CALL: horizontal hero ── */
          <div style={{
            padding:"14px 16px",flexShrink:0,
            display:"flex",alignItems:"center",gap:14,
            borderBottom:`1px solid ${t.GLASS_BDR}`,
            background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
            WebkitBackdropFilter:"blur(18px) saturate(160%)",
            position:"relative",
          }}>
            {/* Avatar — glowing ring */}
            <div style={{
              width:56,height:56,borderRadius:"50%",flexShrink:0,
              background:pal.bg,border:`1.5px solid ${pal.bd}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:20,fontWeight:800,color:pal.tx,
              boxShadow:`0 0 0 4px ${t.P_SOFT}, 0 0 20px ${t.GLOW_P}`,
            }}>
              {(name[0]||"?").toUpperCase()}
            </div>

            {/* Info: name + number stacked */}
            <div style={{flex:1,minWidth:0}}>
              {/* Status pill small */}
              <div style={{
                display:"inline-flex",alignItems:"center",gap:5,
                height:18,padding:"0 8px",borderRadius:999,
                background:t.GREEN_SOFT,border:`1px solid ${t.GREEN_BORDER}`,
                fontSize:9,fontWeight:800,letterSpacing:"0.08em",
                textTransform:"uppercase",color:t.GREEN_TEXT,
                marginBottom:5,
              }}>
                <span style={{
                  width:5,height:5,borderRadius:"50%",background:t.GREEN,
                  animation:"aio-pulse 1.8s ease-in-out infinite",
                }}/>
                On call
              </div>
              <h1 style={{
                margin:0,fontSize:16,fontWeight:800,letterSpacing:"-0.03em",color:t.TEXT,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                lineHeight:1.2,
              }}>{name}</h1>
              <CopyableNumber value={number} t={t} style={{
                margin:"3px 0 0",fontSize:11.5,fontWeight:500,color:t.MUTED,
                letterSpacing:"0.03em",fontVariantNumeric:"tabular-nums",
              }}/>
            </div>

            {/* Timer — right side */}
            <div style={{
              flexShrink:0,textAlign:"right",
            }}>
              <div style={{
                fontSize:22,fontWeight:300,letterSpacing:"0.10em",
                fontVariantNumeric:"tabular-nums",
                fontFamily:"'SF Mono','Fira Code',ui-monospace,monospace",
                color:t.TEXT,lineHeight:1,
              }}>
                {fmt(state.duration||0)}
              </div>
            </div>
          </div>

        ) : (
          /* ── INCOMING / DIALING / IDLE: vertical hero (glass card) ── */
          <div style={{
            padding:"18px 16px 14px",flexShrink:0,
            display:"flex",flexDirection:"column",alignItems:"center",
            background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
            WebkitBackdropFilter:"blur(18px) saturate(160%)",
            borderBottom:`1px solid ${t.GLASS_BDR}`,
          }}>
            {/* Status pill */}
            <div style={{
              display:"inline-flex",alignItems:"center",gap:7,
              height:26,padding:"0 12px",borderRadius:999,
              background:pillCfg.bg,color:pillCfg.tc,
              border:`1px solid ${t.GLASS_BDR}`,
              fontSize:10.5,fontWeight:800,letterSpacing:"0.08em",textTransform:"uppercase",
              marginBottom:16,
            }}>
              <span style={{
                width:6,height:6,borderRadius:"50%",background:pillCfg.dot,flexShrink:0,
                animation:state.status!=="READY"?"aio-pulse 1.8s ease-in-out infinite":"none",
              }}/>
              {pillCfg.label}
            </div>

            {/* Avatar zone */}
            <div style={{
              width:106,height:106,position:"relative",
              display:"flex",alignItems:"center",justifyContent:"center",
              marginBottom:12,
            }}>
              {isIncoming&&<>
                <div className="aio-r1" style={{borderColor:pal.bd}}/>
                <div className="aio-r2" style={{borderColor:pal.bd}}/>
              </>}
              {isDialing ? (
                <div style={{
                  width:86,height:86,borderRadius:"50%",
                  background:t.AMBER_SOFT,border:`1.5px solid ${t.AMBER_BORDER}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  position:"relative",zIndex:2,
                  boxShadow:`0 0 0 5px ${t.AMBER_SOFT}, 0 0 24px ${t.AMBER_BORDER}`,
                }}>
                  {(name[0]||"?").toUpperCase() || <Loader2 size={32} color={t.AMBER} className="aio-spin"/>}
                </div>
              ) : (
                <div style={{
                  width:86,height:86,borderRadius:"50%",
                  background:pal.bg,border:`1.5px solid ${pal.bd}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:32,fontWeight:800,color:pal.tx,
                  position:"relative",zIndex:2,
                  boxShadow:`0 0 0 5px ${t.P_SOFT}, 0 0 24px ${t.GLOW_P}`,
                }}>
                  {(name[0]||"?").toUpperCase()}
                </div>
              )}
            </div>

            <h1 style={{
              margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.03em",
              color:t.TEXT,textAlign:"center",maxWidth:240,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
            }}>{name}</h1>
            <CopyableNumber value={number} t={t} style={{
              margin:"5px 0 0",fontSize:12.5,fontWeight:500,color:t.MUTED,
              letterSpacing:"0.04em",fontVariantNumeric:"tabular-nums",maxWidth:240,
            }}/>

            {isDialing&&(
              <div style={{
                marginTop:10,fontSize:13,fontWeight:600,letterSpacing:"0.04em",
                fontFamily:"'SF Mono','Fira Code',ui-monospace,monospace",
                color:t.AMBER_TEXT,
              }}>Calling…</div>
            )}
          </div>
        )}

        {/* ── Body ── flex:1, column, space-between ── */}
        <div style={{
          flex:1,minHeight:0,
          display:"flex",flexDirection:"column",
          overflow:"hidden",
        }}>
          {kpOpen ? (
            /* Keypad fills body with scroll */
            <div style={{flex:1,overflowY:"auto",padding:"10px 14px 12px"}}>
              <Keypad
                onDigit={dtmf} onBack={()=>setShowKeypad(false)} t={t}
                isMuted={state.isMuted} isOnHold={state.isOnHold}
                onMute={()=>sendAction({type:"MUTE"})}
                onHold={()=>sendAction({type:"HOLD"})}
                onTransfer={()=>setShowTransfer(true)}
                onLead={openLead}
                onCallTransfer={dialpadXfer}
              />
            </div>
          ) : (
            <>
              {/* Scrollable content area */}
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px 0"}}>
                {/* Live state chips — ON_CALL only */}
                {isOnCall&&(
                  <div style={{display:"flex",gap:8,marginBottom:14}}>
                    <Chip
                      icon={state.isMuted?<MicOff size={12}/>:<Mic size={12}/>}
                      label={state.isMuted?"Muted":"Live mic"}
                      active={state.isMuted}
                      ac={t.RED}   as_={t.RED_SOFT}   ab={t.RED_BORDER}
                      ic={t.GREEN} is_={t.GREEN_SOFT}  ib={t.GREEN_BORDER}
                    />
                    <Chip
                      icon={state.isOnHold?<Pause size={12}/>:<CircleDot size={12}/>}
                      label={state.isOnHold?"On hold":"Live"}
                      active={state.isOnHold}
                      ac={t.AMBER} as_={t.AMBER_SOFT}  ab={t.AMBER_BORDER}
                      ic={t.GREEN} is_={t.GREEN_SOFT}   ib={t.GREEN_BORDER}
                    />
                  </div>
                )}

                {/* Action grid — active calls */}
                {isActive&&(
                  <div style={{
                    display:"grid",gridTemplateColumns:"repeat(3,1fr)",
                    gap:"14px 8px",justifyItems:"center",padding:"0 2px",
                  }}>
                    <RndBtn icon={state.isMuted?<MicOff size={21}/>:<Mic size={21}/>}
                      label={state.isMuted?"Unmute":"Mute"}
                      active={state.isMuted} ac={t.RED} as_={t.RED_SOFT} ab={t.RED_BORDER}
                      onClick={()=>sendAction({type:"MUTE"})} t={t}/>
                    <RndBtn icon={state.isOnHold?<Play size={21}/>:<Pause size={21}/>}
                      label={state.isOnHold?"Resume":"Hold"}
                      active={state.isOnHold} ac={t.AMBER} as_={t.AMBER_SOFT} ab={t.AMBER_BORDER}
                      onClick={()=>sendAction({type:"HOLD"})} t={t}/>
                    <RndBtn icon={<ArrowRightLeft size={21}/>} label="Transfer"
                      onClick={()=>setShowTransfer(true)} t={t}/>
                    <RndBtn icon={<UserPlus size={21}/>} label="Lead"
                      onClick={openLead} t={t}/>
                    {/* <RndBtn
                      icon={<Volume2 size={21}/>}
                      label="Speaker"
                      active={speaker.open}
                      ac={t.P} as_={t.P_SOFT} ab={t.P_BORDER}
                      onClick={speaker.toggleOpen}
                      t={t}/> */}
                    <RndBtn icon={<Hash size={21}/>} label="Keypad"
                      onClick={()=>setShowKeypad(true)} t={t}/>
                    {canViewScript && scripts.length > 0 && (
                      <RndBtn icon={<ScrollText size={21}/>} label="Script"
                        active={showScript} ac={t.P} as_={t.P_SOFT} ab={t.P_BORDER}
                        onClick={()=>setShowScript(v=>!v)} t={t}/>
                    )}
                  </div>
                )}

                {/* Speaker picker — shown when speaker button is active */}
                {isActive && speaker.open && (
                  <div style={{ marginTop: 10 }}>
                    <SpeakerPicker hook={speaker} t={t} />
                  </div>
                )}

                {/* Participants panel — transfer status + per-person remove */}
                {
                  isOnCall && (
                    <CallParticipantsPanel
                    conferenceName={state.conferenceName}
                    selfCallSid={state.callSid}
                    apiClient={api}
                
                    
                    />
                  )
                }
                

                {/* Idle state */}
                {!isIncoming&&!isActive&&(
                  <div style={{width:"100%",textAlign:"center",padding:"16px 0 0"}}>
                    <div style={{
                      width:52,height:52,borderRadius:"50%",
                      border:`1px solid ${t.BDR2}`,background:t.SURF,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      margin:"0 auto 10px",
                    }}>
                      <Phone size={19} color={t.MUTED}/>
                    </div>
                    <p style={{margin:0,fontSize:12.5,fontWeight:600,color:t.MUTED}}>
                      Waiting for call activity…
                    </p>
                  </div>
                )}
              </div>

              {/* ── CTA zone — ALWAYS pinned to bottom (glass) ── */}
              <div style={{
                flexShrink:0,
                padding:"14px 14px 16px",
                borderTop: isActive ? `1px solid ${t.GLASS_BDR}` : "none",
                display:"flex",justifyContent:"center",alignItems:"center",
                background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
                WebkitBackdropFilter:"blur(18px) saturate(160%)",
              }}>
                {/* Incoming: Decline + Accept */}
                {isIncoming&&(
                  <div style={{
                    width:"100%",display:"flex",
                    justifyContent:"space-around",alignItems:"center",
                    padding:"0 12px",
                  }}>
                    <CTABtn icon={<PhoneOff size={25}/>} label="Decline"
                      bg={t.RED} rotate onClick={()=>sendAction({type:"REJECT"})} t={t}/>
                    <CTABtn icon={<Phone size={25}/>} label="Accept"
                      bg={t.GREEN} onClick={()=>sendAction({type:"ACCEPT"})} t={t}/>
                  </div>
                )}

                

                {/* Active: End call */}
                {isActive&&(
                  <EndBtn onClick={()=>sendAction({type:"HANGUP"})} t={t}/>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer (glass) ── */}
        <div style={{
          height:26,flexShrink:0,
          borderTop:`1px solid ${t.GLASS_BDR}`,
          background:t.GLASS,backdropFilter:"blur(18px) saturate(160%)",
          WebkitBackdropFilter:"blur(18px) saturate(160%)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:8.5,fontWeight:900,letterSpacing:"0.16em",
          textTransform:"uppercase",color:t.FAINT,
        }}>
          Ringnex Platform
        </div>

        {/* ══ Script Sidebar Overlay ══
             Slides in over the content area (below titlebar, above footer).
             position:absolute so it stays inside the 100vh container.       */}
        <div style={{
          position: "absolute",
          top: 42,          /* below titlebar */
          bottom: 26,       /* above footer */
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          /* slide-in: translateX(0) when open, translateX(100%) when closed */
          transform: showScript ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: showScript ? "auto" : "none",
        }}>
          {/* Frosted backdrop */}
          <div style={{
            position: "absolute", inset: 0,
            background: isDark
              ? "linear-gradient(160deg, rgba(7,10,20,0.97) 0%, rgba(14,12,30,0.97) 100%)"
              : "linear-gradient(160deg, rgba(244,245,250,0.97) 0%, rgba(255,255,255,0.97) 100%)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }} />

          {/* Content sits on top of backdrop */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Header bar ── */}
            <div style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px 10px",
              borderBottom: `1px solid ${t.BDR2}`,
              background: t.SURF,
            }}>
              {/* Icon + title */}
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: t.P_SOFT, border: `1px solid ${t.P_BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ScrollText size={14} color={t.P_TEXT} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: t.P_TEXT, marginBottom: 1 }}>
                  Call Script
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeScript?.title || ""}
                </div>
              </div>
              {/* Close */}
              <button
                onClick={() => setShowScript(false)}
                style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                  border: `1px solid ${t.BDR2}`, background: t.SURF,
                  color: t.MUTED, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* ── Script switcher (only when multiple) ── */}
            {scripts.length > 1 && (
              <div style={{
                flexShrink: 0,
                display: "flex", gap: 6, overflowX: "auto",
                padding: "10px 14px 8px",
                borderBottom: `1px solid ${t.BDR}`,
              }}>
                {scripts.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveScript(s)}
                    style={{
                      flexShrink: 0,
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${activeScript?.id === s.id ? t.P_BORDER : t.BDR}`,
                      background: activeScript?.id === s.id ? t.P_SOFT : "transparent",
                      color: activeScript?.id === s.id ? t.P_TEXT : t.MUTED,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            {/* ── Script body (scrollable) ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px", background: isDark ? "rgba(255,255,255,0.015)" : "rgba(15,23,42,0.02)" }}>
              <style>{`
                .csb h1{font-size:16px;font-weight:800;margin:0 0 10px;color:${t.TEXT};letter-spacing:-0.01em}
                .csb h2{font-size:14px;font-weight:700;margin:14px 0 6px;color:${t.TEXT};border-bottom:1px solid ${t.BDR};padding-bottom:4px}
                .csb h3{font-size:13px;font-weight:700;margin:10px 0 5px;color:${t.TEXT}}
                .csb p{margin:0 0 9px;font-size:13px;line-height:1.75;color:${t.MUTED}}
                .csb ul,.csb ol{padding-left:20px;margin:0 0 9px}
                .csb li{font-size:13px;color:${t.MUTED};margin-bottom:5px;line-height:1.65}
                .csb strong{font-weight:700;color:${t.TEXT}}
                .csb em{font-style:italic;color:${t.MUTED}}
                .csb u{text-decoration:underline}
                .csb blockquote{
                  border-left:3px solid ${t.P};
                  margin:10px 0;padding:10px 14px;
                  background:${t.P_SOFT};border-radius:0 8px 8px 0;
                  font-size:13px;color:${t.P_TEXT};line-height:1.65;font-style:italic
                }
                .csb hr{border:none;border-top:1px solid ${t.BDR};margin:14px 0}
                .csb-scroll::-webkit-scrollbar{width:4px}
                .csb-scroll::-webkit-scrollbar-track{background:transparent}
                .csb-scroll::-webkit-scrollbar-thumb{background:${t.BDR2};border-radius:4px}
              `}</style>
              <div
                className="csb csb-scroll"
                dangerouslySetInnerHTML={{ __html: activeScript?.content || `<p style='color:${t.FAINT}'>No content.</p>` }}
              />
            </div>

            {/* ── Footer strip ── */}
            <div style={{
              flexShrink: 0,
              padding: "10px 14px",
              borderTop: `1px solid ${t.BDR2}`,
              background: t.SURF,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 10, color: t.FAINT, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Read-only · Agent view
              </span>
              <button
                onClick={() => setShowScript(false)}
                style={{
                  fontSize: 11, fontWeight: 700, color: t.MUTED,
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <X size={11} /> Close Script
              </button>
            </div>
          </div>
        </div>
        {/* ══ End Script Sidebar ══ */}

        <style>{`
          *,*::before,*::after{box-sizing:border-box}
          body{margin:0;overflow:hidden}
          .aio-r1,.aio-r2{position:absolute;border-radius:50%;border:1.5px solid;pointer-events:none}
          .aio-r1{inset:8px;animation:aio-ring 2s ease-out infinite}
          .aio-r2{inset:0;animation:aio-ring 2s ease-out 0.4s infinite}
          .aio-spin{animation:aio-rotate 1.1s linear infinite}
          @keyframes aio-ring{0%{transform:scale(0.9);opacity:.75}100%{transform:scale(1.55);opacity:0}}
          @keyframes aio-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.68)}}
          @keyframes aio-mesh-drift{0%,100%{background-position:0% 0%}50%{background-position:100% 60%}}
          @keyframes aio-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        `}</style>
      </div>

      <TransferModal
        show={showTransfer} type="supervisor"
        agent={selAgent} setAgent={setSelAgent}
        onTransfer={doTransfer}
        onCancel={()=>{setShowTransfer(false);setSelAgent(null);}}
        agentList={state.agentList||[]} contacts={state.contacts||[]}
      />
      <CallLeadSaleModal
        isOpen={showLead} onClose={()=>setShowLead(false)}
        customerName={name} customerNumber={number}
        contactInfo={state.contactInfo||null}
        fetchContactInfo={fetchCtx} isDark={isDark}
      />
    </>
  );
}

/* ═══ Sub-components ════════════════════════════════════════ */

function WinBtn({icon,onClick,danger=false,t}:any) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:22,height:22,borderRadius:"50%",border:"none",cursor:"pointer",
        background:h?(danger?t.RED_SOFT:t.SURF2):"transparent",
        color:h?(danger?t.RED:t.P):t.MUTED,
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 0.12s ease",
      }}>{icon}</button>
  );
}

function Chip({icon,label,active,ac,as:_,as_,ab,ic,is:__,is_,ib}:any) {
  const soft   = active ? as_ : is_;
  const color  = active ? ac  : ic;
  const border = active ? ab  : ib;
  return (
    <div style={{
      flex:1,height:30,
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,
      background:soft,border:`1px solid ${border}`,borderRadius:999,
    }}>
      <span style={{display:"flex",color}}>{icon}</span>
      <span style={{fontSize:11,fontWeight:700,color,lineHeight:1}}>{label}</span>
    </div>
  );
}

function RndBtn({icon,label,onClick,active=false,ac,as_,ab,disabled=false,t}:any) {
  const [h,setH]=useState(false);
  const bg = disabled?t.SURF : active?as_ : h?t.GLASS_STRONG:t.GLASS;
  const cl = disabled?t.FAINT : active?ac : t.TEXT;
  const bd = disabled?t.BDR  : active?ab : h?t.GLASS_HILITE:t.GLASS_BDR;
  return (
    <button onClick={disabled?undefined:onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:68,display:"flex",flexDirection:"column",alignItems:"center",gap:7,
        background:"transparent",border:"none",padding:0,fontFamily:"inherit",
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,
      }}>
      <div style={{
        width:58,height:58,borderRadius:"50%",
        background:bg,color:cl,border:`1px solid ${bd}`,
        backdropFilter:"blur(12px) saturate(160%)",WebkitBackdropFilter:"blur(12px) saturate(160%)",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"transform 0.13s ease,background 0.13s ease,box-shadow 0.13s ease",
        transform:h&&!disabled?"translateY(-2px) scale(1.04)":"none",
        boxShadow:active?`0 0 0 4px ${as_}, inset 0 1px 0 ${t.GLASS_HILITE}`:`inset 0 1px 0 ${t.GLASS_HILITE}`,
      }}>{icon}</div>
      <span style={{
        fontSize:11,lineHeight:1,fontWeight:700,letterSpacing:"-0.01em",
        color:active?ac:disabled?t.FAINT:t.MUTED,
      }}>{label}</span>
    </button>
  );
}

function EndBtn({onClick,t}:any) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:66,height:66,borderRadius:"50%",border:"none",
        background:`linear-gradient(145deg, #F87171, ${t.RED})`,
        color:"#fff",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"transform 0.13s ease,filter 0.13s ease,box-shadow 0.13s ease",
        transform:h?"translateY(-2px) scale(1.05)":"none",
        filter:h?"brightness(1.06)":"none",
        boxShadow:`0 0 0 1px rgba(255,255,255,0.18) inset, 0 0 24px ${t.RED_BORDER}`,
      }}>
      <PhoneOff size={24}/>
    </button>
  );
}

function CTABtn({icon,label,bg,onClick,rotate=false,t}:any) {
  const [h,setH]=useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <button onClick={onClick}
        onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{
          width:66,height:66,borderRadius:"50%",border:"none",
          background:`linear-gradient(145deg, ${bg}EE, ${bg})`,color:"#fff",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform 0.13s ease,filter 0.13s ease,box-shadow 0.13s ease",
          transform:h?"translateY(-2px) scale(1.06)":"none",
          filter:h?"brightness(1.06)":"none",
          boxShadow:`0 0 0 1px rgba(255,255,255,0.18) inset, 0 0 ${h?28:18}px ${bg}66`,
        }}>
        <span style={{display:"flex",transform:rotate?"rotate(135deg)":"none"}}>{icon}</span>
      </button>
      <span style={{fontSize:12,fontWeight:700,color:t.MUTED}}>{label}</span>
    </div>
  );
}

/* ═══ PARTICIPANTS PANEL ════════════════════════════════════
   Live legs in the conference: customer, agent (you), aur
   transfer target. Har leg ka connection status + remove (X).
═══════════════════════════════════════════════════════════ */
function partStatus(p: any, t: Tokens) {
  const s = (p?.status || "").toLowerCase();
  if (["ringing", "queued", "initiated", "dialing"].includes(s))
    return { label: "Ringing…", color: t.AMBER_TEXT, soft: t.AMBER_SOFT, bdr: t.AMBER_BORDER, pulse: true };
  if (["in-progress", "answered", "completed-bridge"].includes(s))
    return { label: "Connected", color: t.GREEN_TEXT, soft: t.GREEN_SOFT, bdr: t.GREEN_BORDER, pulse: false };
  if (s === "no-answer" || s === "busy" || s === "failed" || s === "canceled")
    return { label: "No answer", color: t.RED_TEXT, soft: t.RED_SOFT, bdr: t.RED_BORDER, pulse: false };
  return { label: "Connected", color: t.GREEN_TEXT, soft: t.GREEN_SOFT, bdr: t.GREEN_BORDER, pulse: false };
}

function partLabel(p: any) {
  if (p?.displayName) return p.displayName;
  if (p?.number) return p.number;
  if (p?.identity) return p.identity;
  return "Unknown";
}



createRoot(document.getElementById("root")!).render(<CallDesktopApp/>);