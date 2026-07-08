//@ts-nocheck
// src/components/TeamCallChat.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Send, Paperclip, Pencil, Trash2, Check, Download,
  FileText, Minimize2, Maximize2, MessageCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ref, push, onValue, serverTimestamp, off, update } from "firebase/database";
import { db } from "../hooks/firebase";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../main";

/* ─── theme tokens ─────────────────────────────────────── */
function tk(dark: boolean) {
  return dark
    ? {
        bg:         "rgba(13,15,28,0.96)",
        bgGlass:    "blur(28px) saturate(180%)",
        border:     "rgba(255,255,255,0.09)",
        header:     "rgba(99,102,241,0.10)",
        msgBg:      "rgba(255,255,255,0.06)",
        msgBorder:  "rgba(255,255,255,0.07)",
        meBubble:   "linear-gradient(135deg,#4338ca,#6366f1)",
        text:       "#f1f5f9",
        textMuted:  "rgba(255,255,255,0.40)",
        textDim:    "rgba(255,255,255,0.22)",
        input:      "rgba(255,255,255,0.05)",
        inputBorder:"rgba(255,255,255,0.10)",
        btnHover:   "rgba(255,255,255,0.08)",
        attachBg:   "rgba(255,255,255,0.05)",
        editBanner: "rgba(99,102,241,0.12)",
        editBorder: "rgba(99,102,241,0.22)",
        delRow:     "rgba(239,68,68,0.07)",
        delBorder:  "rgba(239,68,68,0.18)",
        scrollbar:  "#1e2035",
        shadow:     "0 32px 80px rgba(0,0,0,0.65)",
        accent:     "#6366f1",
        accentSoft: "rgba(99,102,241,0.18)",
        green:      "#22c55e",
        red:        "#ef4444",
        iconColor:  "rgba(255,255,255,0.40)",
      }
    : {
        bg:         "rgba(255,255,255,0.98)",
        bgGlass:    "blur(20px) saturate(150%)",
        border:     "rgba(15,23,42,0.09)",
        header:     "rgba(99,102,241,0.05)",
        msgBg:      "#f4f5f8",
        msgBorder:  "rgba(15,23,42,0.07)",
        meBubble:   "linear-gradient(135deg,#4338ca,#6366f1)",
        text:       "#0f172a",
        textMuted:  "#64748b",
        textDim:    "#94a3b8",
        input:      "#f8fafc",
        inputBorder:"rgba(15,23,42,0.12)",
        btnHover:   "rgba(15,23,42,0.05)",
        attachBg:   "#f4f5f8",
        editBanner: "#eef2ff",
        editBorder: "#c7d2fe",
        delRow:     "#fef2f2",
        delBorder:  "#fecaca",
        scrollbar:  "#e2e8f0",
        shadow:     "0 24px 64px rgba(15,23,42,0.18)",
        accent:     "#6366f1",
        accentSoft: "#eef2ff",
        green:      "#16a34a",
        red:        "#dc2626",
        iconColor:  "#94a3b8",
      };
}

/* ─── helpers ──────────────────────────────────────────── */
const getChatId = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const fmtTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const isImg = (url: string, mime?: string) =>
  mime?.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(url || "");
function forceDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url; a.download = name || "download"; a.rel = "noreferrer";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function useThemeDetect() {
  const [dark, setDark] = useState(() => {
    try { return (localStorage.getItem("theme") || "light") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    const handler = () => {
      try { setDark((localStorage.getItem("theme") || "light") === "dark"); } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return dark;
}

/* ─── file validation ──────────────────────────────────── */
const SUPPORTED_MIME = [
  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml","image/bmp",
  "application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain","application/zip","application/x-rar-compressed",
  "application/x-zip-compressed","video/mp4","audio/mpeg","audio/mp3",
];
const SUPPORTED_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|mp4|mp3)$/i;
const isSupportedFile = (f: File) => SUPPORTED_MIME.includes(f.type) || SUPPORTED_EXT.test(f.name);

/* ─── types ────────────────────────────────────────────── */
interface AttachEntry {
  id: string; file: File;
  status: "pending"|"uploading"|"done"|"error"|"cancelled"|"unsupported";
  progress: number; url?: string; cancelFn?: () => void;
}
interface MsgAtt { url: string; fileName: string; mimeType: string; size: number; }

/* ─── AttachPreview (compact row in tray) ──────────────── */
function AttachPreview({ f, onRemove, t }: { f: AttachEntry; onRemove:(id:string)=>void; t: ReturnType<typeof tk> }) {
  const preview = useRef(f.file.type.startsWith("image/") ? URL.createObjectURL(f.file) : "");
  useEffect(() => () => { if (preview.current) URL.revokeObjectURL(preview.current); }, []);

  const unsup = f.status === "unsupported";
  const done  = f.status === "done";
  const err   = ["error","cancelled"].includes(f.status);
  const bar   = done ? t.green : err ? t.red : unsup ? "#f59e0b" : t.accent;

  return (
    <div style={{
      display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
      borderRadius:10,background:t.attachBg,border:`1px solid ${t.border}`,
      minWidth:170,maxWidth:230,flexShrink:0,
    }}>
      <div style={{
        width:30,height:30,borderRadius:8,flexShrink:0,overflow:"hidden",
        display:"flex",alignItems:"center",justifyContent:"center",
        background: preview.current ? "transparent" : t.accentSoft,
      }}>
        {preview.current
          ? <img src={preview.current} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
          : <FileText size={14} color={t.accent} />}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:600,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>
          {f.file.name}
        </div>
        <div style={{height:2,borderRadius:99,background:t.border,overflow:"hidden"}}>
          <div style={{
            height:"100%",borderRadius:99,background:bar,
            width:done||err||unsup?"100%":`${f.progress}%`,
            transition:"width 0.3s ease",
          }} />
        </div>
      </div>
      {f.status !== "done" && (
        <button onClick={()=>onRemove(f.id)} style={{
          width:18,height:18,borderRadius:"50%",border:"none",padding:0,
          background:t.border,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        }}>
          <X size={9} color={t.textMuted} />
        </button>
      )}
    </div>
  );
}

/* ─── attachment inside bubble ─────────────────────────── */
function BubbleAtt({ att, isMe, t }: { att:MsgAtt; isMe:boolean; t: ReturnType<typeof tk> }) {
  if (isImg(att.url, att.mimeType)) {
    return (
      <div style={{marginTop:6,borderRadius:10,overflow:"hidden",maxWidth:220,cursor:"pointer"}}
        onClick={() => window.open(att.url,"_blank")}>
        <img src={att.url} alt={att.fileName} style={{width:"100%",display:"block",borderRadius:10}} />
      </div>
    );
  }
  return (
    <div onClick={() => forceDownload(att.url,att.fileName)} style={{
      marginTop:6,display:"flex",alignItems:"center",gap:8,
      padding:"8px 10px",borderRadius:10,cursor:"pointer",
      background:isMe?"rgba(0,0,0,0.18)":t.attachBg,
      border:`1px solid ${isMe?"rgba(255,255,255,0.10)":t.border}`,
    }}>
      <FileText size={15} color={isMe?"#c7d2fe":t.accent} />
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,color:isMe?"#e2e8f0":t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.fileName}</div>
        <div style={{fontSize:10,color:isMe?"rgba(255,255,255,0.45)":t.textMuted}}>{fmtSize(att.size)}</div>
      </div>
      <Download size={12} color={isMe?"rgba(255,255,255,0.45)":t.textMuted} />
    </div>
  );
}

/* ─── message bubble ───────────────────────────────────── */
function MsgBubble({
  msg, myId, t, dark, onStartEdit, onDelete,
}: {
  msg:any; myId:number; t:ReturnType<typeof tk>; dark:boolean;
  onStartEdit:(msg:any)=>void; onDelete:(msg:any,forAll:boolean)=>void;
}) {
  const isMe = String(msg.senderId) === String(myId);
  const [hover,  setHover]  = useState(false);
  const [delOpen,setDelOpen] = useState(false);

  if (msg.deleted) {
    return (
      <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",padding:"2px 0"}}>
        <div style={{
          fontSize:11.5,fontStyle:"italic",
          color:t.textDim,padding:"5px 12px",borderRadius:10,
          border:`1px solid ${t.border}`,background:t.msgBg,
        }}>🚫 Message deleted</div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>{ setHover(false); setDelOpen(false); }}
      style={{
        display:"flex",flexDirection:"column",
        alignItems:isMe?"flex-end":"flex-start",
        padding:"2px 0",
      }}
    >
      {/* bubble */}
      <div style={{
        maxWidth:"78%",padding:"9px 12px",
        borderRadius:16,
        borderBottomRightRadius:isMe?3:16,
        borderBottomLeftRadius:isMe?16:3,
        background:isMe?t.meBubble:t.msgBg,
        border:isMe?"none":`1px solid ${t.msgBorder}`,
        color:isMe?"#fff":t.text,
        fontSize:13,lineHeight:1.55,
        boxShadow:isMe
          ? "0 2px 8px rgba(99,102,241,0.25)"
          : dark ? "0 1px 4px rgba(0,0,0,0.20)" : "0 1px 4px rgba(15,23,42,0.06)",
      }}>
        {msg.text && <div style={{wordBreak:"break-word"}}>{msg.text}</div>}
        {msg.editedAt && (
          <span style={{fontSize:9.5,opacity:0.5,marginLeft:4}}>(edited)</span>
        )}
        {msg.attachments?.map((a: MsgAtt, i: number) => (
          <BubbleAtt key={i} att={a} isMe={isMe} t={t} />
        ))}
        <div style={{fontSize:10,opacity:0.5,textAlign:"right",marginTop:4,letterSpacing:"0.02em"}}>
          {fmtTime(msg.time)}
        </div>
      </div>

      {/* action bar — appears below bubble on hover */}
      <AnimatePresence>
        {hover && !delOpen && (
          <motion.div
            initial={{opacity:0,y:-4,scale:0.94}}
            animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-4,scale:0.94}}
            transition={{duration:0.12}}
            style={{
              display:"flex",gap:4,marginTop:4,
              flexDirection:isMe?"row-reverse":"row",
            }}
          >
            {isMe && (
              <ActionBtn
                icon={<Pencil size={11}/>}
                label="Edit"
                t={t}
                onClick={()=>{ setHover(false); onStartEdit(msg); }}
              />
            )}
            <ActionBtn
              icon={<Trash2 size={11}/>}
              label="Delete"
              t={t}
              danger
              onClick={()=>setDelOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* delete confirm row — also below the bubble */}
      <AnimatePresence>
        {delOpen && (
          <motion.div
            initial={{opacity:0,y:-4,scale:0.95}}
            animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-4,scale:0.95}}
            transition={{duration:0.14}}
            style={{
              marginTop:5,borderRadius:12,overflow:"hidden",
              border:`1px solid ${t.delBorder}`,
              background:t.delRow,
              display:"flex",flexDirection:"column",
              minWidth:192,
              boxShadow:dark?"0 8px 24px rgba(0,0,0,0.40)":"0 4px 16px rgba(220,38,38,0.08)",
            }}
          >
            {/* header */}
            <div style={{
              padding:"8px 12px 6px",display:"flex",alignItems:"center",gap:7,
              borderBottom:`1px solid ${t.delBorder}`,
            }}>
              <Trash2 size={12} color={t.red} />
              <span style={{fontSize:12,fontWeight:700,color:t.red}}>Delete message?</span>
              <button onClick={()=>setDelOpen(false)}
                style={{marginLeft:"auto",border:"none",background:"transparent",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}>
                <X size={12} color={t.textMuted} />
              </button>
            </div>
            {/* options */}
            <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
              {isMe && (
                <button
                  onClick={()=>{ setDelOpen(false); setHover(false); onDelete(msg,true); }}
                  style={{
                    width:"100%",padding:"7px 10px",borderRadius:8,
                    border:`1px solid ${t.red}33`,
                    background:dark?"rgba(239,68,68,0.10)":"rgba(239,68,68,0.07)",
                    color:t.red,fontSize:12,fontWeight:700,
                    cursor:"pointer",textAlign:"left",
                    display:"flex",alignItems:"center",gap:7,fontFamily:"inherit",
                  }}>
                  <Trash2 size={11} color={t.red}/>
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={()=>{ setDelOpen(false); setHover(false); onDelete(msg,false); }}
                style={{
                  width:"100%",padding:"7px 10px",borderRadius:8,
                  border:`1px solid ${t.border}`,
                  background:t.btnHover,
                  color:t.text,fontSize:12,fontWeight:600,
                  cursor:"pointer",textAlign:"left",
                  display:"flex",alignItems:"center",gap:7,fontFamily:"inherit",
                }}>
                <X size={11} color={t.textMuted}/>
                Delete for Me
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({
  icon, label, t, danger=false, onClick,
}: { icon:React.ReactNode; label:string; t:ReturnType<typeof tk>; danger?:boolean; onClick:()=>void }) {
  const [hov,setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      title={label}
      style={{
        display:"flex",alignItems:"center",gap:4,
        padding:"3px 8px",borderRadius:6,
        border:`1px solid ${danger?(hov?"rgba(239,68,68,0.4)":t.border):t.border}`,
        background:danger?(hov?"rgba(239,68,68,0.08)":t.btnHover):t.btnHover,
        color:danger?(hov?t.red:t.textMuted):t.textMuted,
        fontSize:11,fontWeight:600,cursor:"pointer",
        transition:"all 0.12s",fontFamily:"inherit",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════ */
interface TeamCallChatProps {
  peer: { id: number|string; name: string };
  onClose: () => void;
}

export default function TeamCallChat({ peer, onClose }: TeamCallChatProps) {
  const { user } = useAuth();
  const dark = useThemeDetect();
  const t    = tk(dark);
  const myId = Number(user?.id);
  const peerId = Number(peer.id);
  const chatPath = `teamChats/${getChatId(myId, peerId)}/messages`;

  const [messages, setMessages]       = useState<any[]>([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [attachments, setAttachments] = useState<AttachEntry[]>([]);
  const [editTarget, setEditTarget]   = useState<any|null>(null);
  const [minimized, setMinimized]     = useState(false);
  const [unread, setUnread]           = useState(0);
  const [isDragOver, setIsDragOver]   = useState(false);

  const msgEndRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const dragCounter  = useRef(0);
  const minimizedRef = useRef(minimized);
  useEffect(() => { minimizedRef.current = minimized; }, [minimized]);

  /* ── Firebase ── */
  useEffect(() => {
    const r = ref(db, chatPath);
    let first = true;
    const fn = (snap: any) => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([k,v]: any) => ({...v, _key:k}))
        .filter((m:any) => !m.hiddenFor?.[myId])
        .sort((a:any,b:any) => (a.timestamp||0)-(b.timestamp||0));
      setMessages(arr);
      if (!first && minimizedRef.current) setUnread(n => n+1);
      first = false;
    };
    onValue(r, fn);
    return () => off(r,"value",fn);
  }, [chatPath, myId]);

  useEffect(() => {
    if (!minimized) { setUnread(0); setTimeout(()=>msgEndRef.current?.scrollIntoView({behavior:"smooth"}),60); }
  }, [minimized]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages.length]);

  /* ── upload ── */
  const uploadOne = (entry: AttachEntry): Promise<MsgAtt|null> =>
    new Promise(resolve => {
      const fd = new FormData(); fd.append("file", entry.file);
      const xhr = new XMLHttpRequest();
      setAttachments(p => p.map(f => f.id===entry.id ? {...f,status:"uploading",progress:0,cancelFn:()=>xhr.abort()} : f));
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded/e.total)*100);
          setAttachments(p => p.map(f => f.id===entry.id ? {...f,progress:pct} : f));
        }
      };
      xhr.onload = () => {
        if (xhr.status>=200&&xhr.status<300) {
          try {
            const d = JSON.parse(xhr.responseText);
            const url = d.url||d.fileUrl||d.data?.url;
            setAttachments(p => p.map(f => f.id===entry.id ? {...f,status:"done",progress:100,url} : f));
            resolve({url, fileName:entry.file.name, mimeType:entry.file.type, size:entry.file.size});
          } catch { setAttachments(p=>p.map(f=>f.id===entry.id?{...f,status:"error"}:f)); resolve(null); }
        } else { setAttachments(p=>p.map(f=>f.id===entry.id?{...f,status:"error"}:f)); resolve(null); }
      };
      xhr.onerror = ()=>{ setAttachments(p=>p.map(f=>f.id===entry.id?{...f,status:"error"}:f)); resolve(null); };
      xhr.onabort = ()=>{ setAttachments(p=>p.map(f=>f.id===entry.id?{...f,status:"cancelled"}:f)); resolve(null); };
      const token = localStorage.getItem("token");
      xhr.open("POST", API_URL+"/contacts/upload");
      if (token) xhr.setRequestHeader("Authorization",`Bearer ${token}`);
      xhr.send(fd);
    });

  const addFiles = useCallback((files: File[]) => {
    setAttachments(p => [...p, ...files.map(file => ({
      id:`${Date.now()}-${Math.random()}`, file,
      status: isSupportedFile(file) ? "pending" : "unsupported" as any,
      progress:0,
    }))]);
  }, []);

  const removeAttach = useCallback((id:string) => {
    setAttachments(p => { const e=p.find(f=>f.id===id); e?.cancelFn?.(); return p.filter(f=>f.id!==id); });
  }, []);

  /* ── send ── */
  const sendMessage = useCallback(async () => {
    const trimmed  = text.trim();
    const toUpload = attachments.filter(f=>f.status==="pending");
    const hasDone  = attachments.some(f=>f.status==="done"&&f.url);
    if (!trimmed&&!toUpload.length&&!hasDone) return;
    if (sending) return;
    setSending(true);

    const uploaded: MsgAtt[] = [];
    if (toUpload.length) {
      const results = await Promise.all(toUpload.map(uploadOne));
      results.forEach(r=>{ if(r) uploaded.push(r); });
    }
    attachments.filter(f=>f.status==="done"&&f.url).forEach(f=>{
      if (!uploaded.find(u=>u.url===f.url))
        uploaded.push({url:f.url!,fileName:f.file.name,mimeType:f.file.type,size:f.file.size});
    });

    setText(""); setAttachments([]);
    if (inputRef.current) inputRef.current.style.height="36px";

    const payload: any = { senderId:myId, senderName:user?.name||"Agent", time:new Date().toISOString(), timestamp:serverTimestamp() };
    if (trimmed) payload.text = trimmed;
    if (uploaded.length) payload.attachments = uploaded;

    await push(ref(db, chatPath), payload);
    setSending(false);
    setTimeout(()=>msgEndRef.current?.scrollIntoView({behavior:"smooth"}),60);
  }, [text, attachments, sending, myId, user?.name, chatPath]);

  /* ── edit ── */
  const submitEdit = useCallback(async () => {
    if (!editTarget) return;
    const newText = text.trim(); if (!newText) return;
    await update(ref(db,`${chatPath}/${editTarget._key}`), {text:newText, editedAt:new Date().toISOString()});
    setEditTarget(null); setText("");
  }, [editTarget, text, chatPath]);

  const startEdit = useCallback((msg:any) => {
    setEditTarget(msg); setText(msg.text||"");
    setTimeout(()=>inputRef.current?.focus(),50);
  }, []);

  const cancelEdit = useCallback(() => { setEditTarget(null); setText(""); }, []);

  /* ── delete ── */
  const handleDelete = useCallback(async (msg:any, forAll:boolean) => {
    const p = `${chatPath}/${msg._key}`;
    if (forAll) await update(ref(db,p), {deleted:true, text:null, attachments:null});
    else        await update(ref(db,p), {[`hiddenFor/${myId}`]:true});
  }, [chatPath, myId]);

  /* ── drag & drop ── */
  const onDragEnter = useCallback((e:React.DragEvent)=>{ e.preventDefault(); e.stopPropagation(); if(++dragCounter.current===1) setIsDragOver(true); },[]);
  const onDragLeave = useCallback((e:React.DragEvent)=>{ e.preventDefault(); e.stopPropagation(); if(--dragCounter.current===0) setIsDragOver(false); },[]);
  const onDragOver  = useCallback((e:React.DragEvent)=>{ e.preventDefault(); e.stopPropagation(); },[]);
  const onDrop      = useCallback((e:React.DragEvent)=>{
    e.preventDefault(); e.stopPropagation();
    dragCounter.current=0; setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  },[addFiles]);

  const onKey = (e:React.KeyboardEvent) => {
    if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); editTarget?submitEdit():sendMessage(); }
    if (e.key==="Escape"&&editTarget) cancelEdit();
  };

  const hasContent = text.trim().length>0
    || attachments.some(f=>!["cancelled","error","unsupported"].includes(f.status));

  /* ─────────────────────────── render ─────────────────── */
  const W = minimized ? 240 : 370;

  return (
    <>
      <style>{`
        .tcc-scrollbar::-webkit-scrollbar{width:4px}
        .tcc-scrollbar::-webkit-scrollbar-thumb{background:${t.scrollbar};border-radius:99px}
        .tcc-scrollbar::-webkit-scrollbar-track{background:transparent}
        .tcc-input::placeholder{color:${t.textMuted}}
        .tcc-input:focus{outline:none;border-color:${t.accent}!important}
        .tcc-btn-icon:hover{background:${t.btnHover}!important}
        @keyframes tcc-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{
        position:"fixed", bottom:88, right:22, zIndex:10001,
        width:W, fontFamily:"'Inter',-apple-system,sans-serif",
      }}>
        <motion.div
          initial={{opacity:0,y:18,scale:0.95}}
          animate={{opacity:1,y:0,scale:1}}
          exit={{opacity:0,y:14,scale:0.96}}
          transition={{type:"spring",stiffness:350,damping:30}}
          style={{
            borderRadius:20,
            background:t.bg,
            backdropFilter:t.bgGlass,
            WebkitBackdropFilter:t.bgGlass,
            border:`1px solid ${t.border}`,
            boxShadow:t.shadow,
            display:"flex",flexDirection:"column",
            maxHeight: minimized ? "auto" : 580,
            overflow:"hidden",
          }}
        >
          {/* ── HEADER ── */}
          <div
            onClick={()=>setMinimized(m=>!m)}
            style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"12px 14px",cursor:"pointer",userSelect:"none",
              background:t.header,
              borderBottom: minimized ? "none" : `1px solid ${t.border}`,
            }}
          >
            {/* avatar */}
            <div style={{
              width:36,height:36,borderRadius:"50%",flexShrink:0,
              background:t.accentSoft,
              border:`2px solid ${t.accent}44`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:800,fontSize:13,color:t.accent,letterSpacing:"-0.5px",
            }}>
              {(peer.name?.[0]||"?").toUpperCase()}
            </div>

            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13.5,fontWeight:700,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"-0.2px"}}>
                {peer.name}
              </div>
              <div style={{fontSize:10.5,color:t.textMuted,display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:t.green,flexShrink:0,display:"inline-block"}} />
                Direct message
              </div>
            </div>

            {/* unread badge */}
            {minimized && unread > 0 && (
              <div style={{
                minWidth:19,height:19,borderRadius:999,padding:"0 5px",
                background:t.red,color:"#fff",fontSize:10.5,fontWeight:800,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>{unread > 99 ? "99+" : unread}</div>
            )}

            <div style={{display:"flex",gap:2,flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button
                className="tcc-btn-icon"
                onClick={()=>setMinimized(m=>!m)}
                title={minimized?"Expand":"Minimise"}
                style={{width:28,height:28,border:"none",background:"transparent",cursor:"pointer",color:t.iconColor,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,padding:0,transition:"background 0.12s"}}>
                {minimized ? <Maximize2 size={13}/> : <Minimize2 size={13}/>}
              </button>
              <button
                className="tcc-btn-icon"
                onClick={onClose}
                title="Close"
                style={{width:28,height:28,border:"none",background:"transparent",cursor:"pointer",color:t.iconColor,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,padding:0,transition:"background 0.12s"}}>
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* ── BODY (hidden when minimized) ── */}
          {!minimized && (
            <>
              {/* messages */}
              <div
                className="tcc-scrollbar"
                onDragEnter={onDragEnter} onDragLeave={onDragLeave}
                onDragOver={onDragOver}   onDrop={onDrop}
                style={{
                  flex:1,overflowY:"auto",padding:"12px 14px",
                  display:"flex",flexDirection:"column",gap:0,
                  minHeight:0,position:"relative",
                }}
              >
                {/* drag overlay */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      style={{
                        position:"absolute",inset:6,zIndex:10,borderRadius:14,
                        background:dark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.07)",
                        border:`2px dashed ${t.accent}99`,
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,
                        backdropFilter:"blur(6px)",
                        pointerEvents:"none",
                      }}
                    >
                      <Paperclip size={26} color={t.accent}/>
                      <div style={{fontSize:13.5,fontWeight:700,color:t.accent}}>Drop files here</div>
                      <div style={{fontSize:11.5,color:t.textMuted}}>Single or multiple files</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* empty state */}
                {messages.length === 0 && (
                  <div style={{
                    flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    color:t.textDim,fontSize:12.5,gap:10,padding:"32px 0",
                  }}>
                    <div style={{
                      width:52,height:52,borderRadius:"50%",
                      background:t.accentSoft,
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }}>
                      <MessageCircle size={22} color={t.accent}/>
                    </div>
                    <div style={{textAlign:"center",lineHeight:1.6}}>
                      <div style={{fontWeight:700,color:t.textMuted,fontSize:13}}>Start the conversation</div>
                      <div style={{color:t.textDim,fontSize:11.5,marginTop:2}}>Message {peer.name}</div>
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <MsgBubble
                    key={msg._key} msg={msg} myId={myId}
                    t={t} dark={dark}
                    onStartEdit={startEdit}
                    onDelete={handleDelete}
                  />
                ))}
                <div ref={msgEndRef}/>
              </div>

              {/* attach tray */}
              {attachments.length > 0 && (
                <div style={{
                  borderTop:`1px solid ${t.border}`,
                  padding:"8px 12px",
                  display:"flex",gap:6,overflowX:"auto",
                  scrollbarWidth:"none",
                }}>
                  {attachments.map(f=>(
                    <AttachPreview key={f.id} f={f} onRemove={removeAttach} t={t}/>
                  ))}
                </div>
              )}

              {/* edit banner */}
              {editTarget && (
                <div style={{
                  display:"flex",alignItems:"center",gap:8,
                  padding:"7px 14px",
                  background:t.editBanner,
                  borderTop:`1px solid ${t.editBorder}`,
                }}>
                  <Pencil size={12} color={t.accent}/>
                  <span style={{flex:1,fontSize:11.5,color:t.accent,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    Editing: <span style={{opacity:0.75}}>{editTarget.text}</span>
                  </span>
                  <button onClick={cancelEdit}
                    style={{border:"none",background:"transparent",cursor:"pointer",color:t.textMuted,padding:0,display:"flex",alignItems:"center",flexShrink:0}}>
                    <X size={13}/>
                  </button>
                </div>
              )}

              {/* input row */}
              <div style={{
                display:"flex",alignItems:"flex-end",gap:8,
                padding:"10px 12px",
                borderTop:`1px solid ${t.border}`,
                background:dark?"rgba(0,0,0,0.15)":"rgba(248,250,252,0.8)",
              }}>
                <input ref={fileRef} type="file" multiple hidden
                  onChange={e=>{ if(e.target.files){addFiles(Array.from(e.target.files));e.target.value="";} }}
                />
                <button
                  className="tcc-btn-icon"
                  onClick={()=>fileRef.current?.click()}
                  title="Attach files"
                  style={{
                    width:34,height:34,flexShrink:0,borderRadius:10,border:`1px solid ${t.border}`,
                    background:t.attachBg,color:t.iconColor,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",padding:0,transition:"background 0.12s",
                  }}>
                  <Paperclip size={15}/>
                </button>

                <textarea
                  ref={inputRef}
                  value={text}
                  className="tcc-input"
                  onChange={e=>{
                    setText(e.target.value);
                    e.target.style.height="36px";
                    e.target.style.height=Math.min(e.target.scrollHeight,96)+"px";
                  }}
                  onKeyDown={onKey}
                  placeholder={editTarget?"Edit message…":`Message ${peer.name}…`}
                  rows={1}
                  style={{
                    flex:1,resize:"none",
                    border:`1px solid ${t.inputBorder}`,
                    borderRadius:10,background:t.input,color:t.text,
                    fontSize:13,padding:"8px 11px",
                    lineHeight:1.45,height:36,maxHeight:96,
                    scrollbarWidth:"none",fontFamily:"inherit",transition:"border-color 0.15s",
                  }}
                />

                <button
                  disabled={!hasContent&&!editTarget}
                  onClick={editTarget?submitEdit:sendMessage}
                  style={{
                    width:34,height:34,flexShrink:0,borderRadius:10,border:"none",
                    background:(hasContent||editTarget)?t.accent:"transparent",
                    border2:`1px solid ${t.border}`,
                    color:(hasContent||editTarget)?"#fff":t.textDim,
                    cursor:(hasContent||editTarget)?"pointer":"not-allowed",
                    display:"flex",alignItems:"center",justifyContent:"center",padding:0,
                    transition:"all 0.15s",
                    boxShadow:(hasContent||editTarget)?"0 4px 12px rgba(99,102,241,0.35)":"none",
                  }}>
                  {sending
                    ? <div style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"tcc-spin 0.7s linear infinite"}}/>
                    : editTarget ? <Check size={15}/> : <Send size={14}/>
                  }
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
