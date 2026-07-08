// components/FloatingChatWidget.tsx
// @ts-nocheck

import { X, Send, MessageCircle } from "lucide-react";
import { useFloatingChat } from "../context/FloatingChatContext";
import { useTheme } from "../context/ThemeContext";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";

/* ─── helpers ────────────────────────────────────────── */
const getInitials = (name: string) =>
  (name || "?").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = ["#5B5BD6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316"];
function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const fmtTime = (t: string) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const fmtDay = (t: string) => {
  const d = new Date(t), today = new Date();
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString())  return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/* ─── main ───────────────────────────────────────────── */
export default function FloatingChatWidget() {
  const { open, phoneNumber, closeChat, contactName, socket, user } = useFloatingChat();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const widgetBg      = isDark ? "rgba(20,20,28,0.98)"          : "#fff";
  const widgetShadow  = isDark
    ? "0 -4px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.07)"
    : "0 -4px 40px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)";
  const headerGrad    = isDark
    ? "linear-gradient(135deg, #5B5BD6 0%, #3A3AA8 100%)"
    : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)";
  const msgAreaBg     = isDark ? "#0F0F14"                       : "#F6F7F9";
  const inputAreaBg   = isDark ? "rgba(23,23,31,0.98)"          : "#fff";
  const inputAreaBord = isDark ? "rgba(255,255,255,0.07)"        : "rgba(0,0,0,0.07)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"          : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"        : "rgba(0,0,0,0.10)";
  const inputFocBord  = isDark ? "rgba(124,124,240,0.45)"        : "rgba(91,91,214,0.40)";
  const inputColor    = isDark ? "#F0F0F5"                        : "#0D0D12";
  const inputPh       = isDark ? "#3A3A4A"                        : undefined; // handled via CSS
  const emptyIconBg   = isDark ? "rgba(124,124,240,0.12)"        : "rgba(91,91,214,0.10)";
  const emptyTitle    = isDark ? "#A0A0B0"                        : "#9E9EAD";
  const emptySubtitle = isDark ? "#3A3A4A"                        : "#C8C8D4";
  const accentMain    = isDark ? "#7C7CF0"                        : "#5B5BD6";
  const daySepColor   = isDark ? "rgba(255,255,255,0.07)"        : "rgba(0,0,0,0.07)";
  const dayLabelColor = isDark ? "#4A4A5A"                        : "#9E9EAD";

  // "them" bubble
  const themBubbleBg   = isDark ? "rgba(35,35,48,0.95)"         : "#fff";
  const themBubbleClr  = isDark ? "#E0E0F0"                      : "#0D0D12";
  const themBubbleBord = isDark ? "rgba(255,255,255,0.07)"       : "rgba(0,0,0,0.06)";
  const themBubbleShd  = isDark ? "0 1px 4px rgba(0,0,0,0.40)"  : "0 1px 4px rgba(0,0,0,0.08)";

  // "me" bubble
  const meBubbleBg  = isDark ? "#6B6BF0" : "#5B5BD6";
  const meBubbleShd = isDark
    ? "0 2px 8px rgba(124,124,240,0.40)"
    : "0 2px 8px rgba(91,91,214,0.30)";

  // send button
  const sendActiveBg  = isDark ? "#7C7CF0"                      : "#5B5BD6";
  const sendActiveShd = isDark
    ? "0 2px 8px rgba(124,124,240,0.45)"
    : "0 2px 8px rgba(91,91,214,0.35)";
  const sendDisabledBg = isDark ? "rgba(255,255,255,0.07)"      : "rgba(0,0,0,0.08)";
  const sendDisabledCl = isDark ? "#3A3A4A"                      : "#C8C8D4";

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const socketRef               = useRef<any>(null);

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* fetch history */
  useEffect(() => {
    if (!open || !phoneNumber) return;
    setMessages([]);
    api.get(`/message/conversation/${phoneNumber}`).then(res => {
      if (res.data.success) {
        const normalized = res.data.messages.map((m: any) => ({
          id:     m.id,
          text:   m.text || m.body,
          sender: m.sender || (m.direction === "outbound" ? "me" : "them"),
          time:   m.time || m.createdAt,
        }));
        setMessages(normalized);
        setTimeout(scrollBottom, 100);
      }
    });
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, phoneNumber]);

  /* real-time */
  useEffect(() => {
    if (!socket || !open || !phoneNumber) return;
    const handler = ({ phoneNumber: pn, message }: any) => {
      if (pn !== phoneNumber) return;
      setMessages(prev => [...prev, {
        id:     message.id,
        text:   message.text || message.body || message.content || "",
        sender: message.sender || (message.direction === "outbound" ? "me" : "them"),
        time:   message.time || message.createdAt || message.timestamp || new Date().toISOString(),
      }]);
      setTimeout(scrollBottom, 80);
    };
    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [socket, open, phoneNumber, scrollBottom]);

  /* socket room */
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !user?.id) return;
    s.emit("join-user-room", { userId: user.id });
    return () => s.emit("leave-user-room", { userId: user.id });
  }, [user?.id]);

  /* send */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !phoneNumber || sending) return;
    setSending(true);
    try {
      const res = await api.post("/message/send", { to: phoneNumber, body: text });
      if (res.data.success) {
        setMessages(prev => [...prev, { text, sender: "me", time: new Date().toISOString() }]);
        setInput("");
        setTimeout(scrollBottom, 50);
      }
    } catch (err) {
      console.error("Send failed", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const color    = nameColor(contactName || "?");
  const initials = getInitials(contactName || "");
  const canSend  = !!input.trim() && !sending;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      style={{
        position: "fixed", bottom: 0, right: 24,
        width: 376, height: 540,
        background: widgetBg,
        backdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
        WebkitBackdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
        borderRadius: "18px 18px 0 0",
        boxShadow: widgetShadow,
        border: isDark ? "1px solid rgba(255,255,255,0.07)" : "none",
        borderBottom: "none",
        zIndex: 9999,
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Scrollbar styles ── */}
      <style>{`
        .fcw-msgs::-webkit-scrollbar { width: 4px; }
        .fcw-msgs::-webkit-scrollbar-track { background: transparent; }
        .fcw-msgs::-webkit-scrollbar-thumb {
          background: ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.15)"};
          border-radius: 99px;
        }
        .fcw-msgs::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.30)"};
        }
        .fcw-input::placeholder { color: ${isDark ? "#3A3A4A" : "#BBBBC8"}; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: headerGrad, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}30`, border: `1.5px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, letterSpacing: "0.01em" }}>
          {initials}
        </div>

        {/* Name + number */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contactName || "Unknown"}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.70)", marginTop: 1, fontFamily: "monospace, monospace" }}>
            {phoneNumber}
          </div>
        </div>

        {/* Close */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={closeChat}
          style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <X size={16} color="#fff" />
        </motion.button>
      </div>

      {/* ── Messages ── */}
      <div className="fcw-msgs" style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 0, background: msgAreaBg }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: emptyIconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={22} color={accentMain} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: emptyTitle, fontWeight: 600 }}>No messages yet</p>
            <p style={{ margin: 0, fontSize: 12, color: emptySubtitle }}>Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe     = m.sender === "me";
            const showDay  = i === 0 || !isSameDay(messages[i - 1].time, m.time);
            const nextSame = i < messages.length - 1 && messages[i + 1].sender === m.sender;

            return (
              <div key={m.id || i}>
                {/* Day separator */}
                {showDay && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 12px" }}>
                    <div style={{ flex: 1, height: 1, background: daySepColor }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: dayLabelColor, whiteSpace: "nowrap" }}>
                      {fmtDay(m.time)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: daySepColor }} />
                  </div>
                )}

                {/* Bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: nextSame ? 3 : 10 }}
                >
                  <div style={{
                    maxWidth: "76%",
                    padding: "9px 13px",
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? meBubbleBg : themBubbleBg,
                    color: isMe ? "#fff" : themBubbleClr,
                    fontSize: 13.5, lineHeight: 1.5, wordBreak: "break-word",
                    boxShadow: isMe ? meBubbleShd : themBubbleShd,
                    border: isMe ? "none" : `1px solid ${themBubbleBord}`,
                  }}>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.text}</p>
                    <div style={{ fontSize: 10.5, marginTop: 4, opacity: isDark ? 0.55 : 0.65, textAlign: isMe ? "right" : "left" }}>
                      {m.time ? fmtTime(m.time) : ""}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ padding: "10px 12px", background: inputAreaBg, borderTop: `1px solid ${inputAreaBord}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="fcw-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          style={{
            flex: 1, padding: "9px 14px", borderRadius: 50,
            border: `1px solid ${inputBorder}`,
            background: inputBg, fontSize: 13.5, color: inputColor,
            outline: "none", fontFamily: "inherit", transition: "border 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = inputFocBord)}
          onBlur={e  => (e.target.style.borderColor = inputBorder)}
        />

        <motion.button
          whileHover={canSend ? { scale: 1.08 } : {}}
          whileTap={canSend ? { scale: 0.93 } : {}}
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            width: 38, height: 38, borderRadius: 50, border: "none",
            background: canSend ? sendActiveBg : sendDisabledBg,
            color: canSend ? "#fff" : sendDisabledCl,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: canSend ? "pointer" : "not-allowed",
            flexShrink: 0, transition: "background 0.18s, color 0.18s",
            boxShadow: canSend ? sendActiveShd : "none",
          }}
        >
          <Send size={16} style={{ transform: "translateX(1px)" }} />
        </motion.button>
      </div>
    </motion.div>
  );
}