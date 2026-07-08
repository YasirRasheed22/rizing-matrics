// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Heading3, ChevronLeft, Save,
  Quote, Minus, Users, X, Check, Search, Loader2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import toast from "react-hot-toast";

/* ─── Toolbar button ──────────────────────────────────────── */
function TBtn({ onClick, active, disabled, children, title }: any) {
  const [h, setH] = useState(false);
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      disabled={disabled}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 7, border: "none", cursor: "pointer",
        background: active ? "rgba(99,102,241,0.18)" : h ? "rgba(99,102,241,0.08)" : "transparent",
        color: active ? "#6366F1" : "#64748B",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Toolbar separator ───────────────────────────────────── */
const Sep = () => <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.10)", margin: "0 4px" }} />;

export default function ScriptEditorPage() {
  const { theme } = useTheme();
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();
  const isNew     = !id || id === "new";
  const isDark    = theme === "dark";

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(!isNew);
  const [agents,      setAgents]      = useState<any[]>([]);
  const [assigned,    setAssigned]    = useState<Set<number>>(new Set());
  const [agentSearch, setAgentSearch] = useState("");
  const [scriptId,    setScriptId]    = useState<number | null>(isNew ? null : Number(id));

  // tokens
  const bg         = isDark ? "#0F0F14"                      : "#F6F7F9";
  const card       = isDark ? "rgba(23,23,31,0.95)"          : "#fff";
  const cardBord   = isDark ? "rgba(255,255,255,0.07)"       : "rgba(0,0,0,0.07)";
  const text       = isDark ? "#F0F0F5"                      : "#0D0D12";
  const muted      = isDark ? "#68687A"                      : "#9E9EAD";
  const accent     = isDark ? "#7C7CF0"                      : "#5B5BD6";
  const inputBg    = isDark ? "rgba(30,30,40,0.9)"           : "#F6F7F9";
  const inputBord  = isDark ? "rgba(255,255,255,0.09)"       : "rgba(0,0,0,0.10)";
  const toolbarBg  = isDark ? "rgba(255,255,255,0.04)"       : "#F8F9FA";
  const editorBg   = isDark ? "rgba(15,15,20,0.80)"          : "#FAFAFA";
  const editorText = isDark ? "#E8E8F0"                      : "#1A1A2E";

  /* ─── Tiptap editor ───────────────────────────────────── */
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: "",
    editorProps: {
      attributes: {
        style: `outline:none; min-height:320px; padding:20px; font-size:14px; line-height:1.75; color:${editorText}; font-family:'Inter',-apple-system,sans-serif;`,
      },
    },
  });

  /* ─── Load existing script ────────────────────────────── */
  useEffect(() => {
    if (isNew) return;
    api.get(`/voice/scripts/${id}`)
      .then(res => {
        const s = res.data.data;
        setTitle(s.title);
        setDescription(s.description || "");
        editor?.commands.setContent(s.content || "");
        const ids = new Set<number>((s.assignments || []).map((a: any) => a.user.id));
        setAssigned(ids);
      })
      .catch(() => toast.error("Failed to load script"))
      .finally(() => setLoading(false));
  }, [id, editor]);

  /* ─── Load agents list ────────────────────────────────── */
  useEffect(() => {
    api.get("/auth/available-for-transfer")
      .then(res => setAgents(res.data.agents || []))
      .catch(() => {});
  }, []);

  /* ─── Save ────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const content = editor?.getHTML() || "";
      if (isNew) {
        const res = await api.post("/voice/scripts", {
          title, description, content,
          assignedUserIds: Array.from(assigned),
        });
        const newId = res.data.data.id;
        setScriptId(newId);
        toast.success("Script created!");
        navigate(`/admin/scripts/${newId}`, { replace: true });
      } else {
        await api.put(`/voice/scripts/${scriptId ?? id}`, { title, description, content });
        await api.put(`/voice/scripts/${scriptId ?? id}/assign`, { userIds: Array.from(assigned) });
        toast.success("Script saved!");
      }
    } catch { toast.error("Failed to save script"); }
    finally { setSaving(false); }
  };

  const toggleAgent = (agentId: number) => {
    setAssigned(prev => {
      const next = new Set(prev);
      next.has(agentId) ? next.delete(agentId) : next.add(agentId);
      return next;
    });
  };

  const filteredAgents = agents.filter(a =>
    (a.name || "").toLowerCase().includes(agentSearch.toLowerCase()) ||
    (a.email || "").toLowerCase().includes(agentSearch.toLowerCase())
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color={accent} style={{ animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "24px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/admin/scripts")} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${cardBord}`, background: card, color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: text, letterSpacing: "-0.02em" }}>
              {isNew ? "New Script" : "Edit Script"}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: muted }}>
              Rich text editor — bold, headings, lists supported
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: saving ? "rgba(91,91,214,0.5)" : `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`,
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer",
            boxShadow: saving ? "none" : "0 4px 14px rgba(91,91,214,0.30)", fontFamily: "inherit",
          }}
        >
          {saving ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Script"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* LEFT — Editor */}
        <div>
          {/* Meta fields */}
          <div style={{ background: card, border: `1px solid ${cardBord}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Script Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Cold Call Opening Script"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${inputBord}`, background: inputBg, color: text, fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 14 }}>Short Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional note about this script"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${inputBord}`, background: inputBg, color: text, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* Rich text editor */}
          <div style={{ background: card, border: `1px solid ${cardBord}`, borderRadius: 16, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, padding: "10px 14px", background: toolbarBg, borderBottom: `1px solid ${cardBord}` }}>
              <TBtn title="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={14} /></TBtn>
              <TBtn title="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={14} /></TBtn>
              <TBtn title="Underline" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></TBtn>
              <Sep />
              <TBtn title="Heading 1" active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></TBtn>
              <TBtn title="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></TBtn>
              <TBtn title="Heading 3" active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></TBtn>
              <Sep />
              <TBtn title="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={15} /></TBtn>
              <TBtn title="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></TBtn>
              <Sep />
              <TBtn title="Blockquote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={14} /></TBtn>
              <TBtn title="Horizontal rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={14} /></TBtn>
            </div>

            {/* Editor area */}
            <div style={{ background: editorBg }}>
              <style>{`
                .tiptap-script-editor h1 { font-size:22px; font-weight:800; margin:0 0 12px; color:${editorText}; }
                .tiptap-script-editor h2 { font-size:17px; font-weight:700; margin:16px 0 8px; color:${editorText}; }
                .tiptap-script-editor h3 { font-size:14px; font-weight:700; margin:14px 0 6px; color:${editorText}; }
                .tiptap-script-editor p  { margin:0 0 10px; }
                .tiptap-script-editor ul { padding-left:22px; margin:0 0 10px; }
                .tiptap-script-editor ol { padding-left:22px; margin:0 0 10px; }
                .tiptap-script-editor li { margin-bottom:4px; }
                .tiptap-script-editor blockquote { border-left:3px solid #6366F1; margin:10px 0; padding:8px 14px; background:rgba(99,102,241,0.06); border-radius:0 8px 8px 0; color:${isDark ? "#A5B4FC" : "#4338CA"}; }
                .tiptap-script-editor hr { border:none; border-top:1px solid ${cardBord}; margin:16px 0; }
                .tiptap-script-editor strong { font-weight:700; }
                .tiptap-script-editor em { font-style:italic; }
                .tiptap-script-editor u  { text-decoration:underline; }
                .tiptap-script-editor p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:${muted}; pointer-events:none; float:left; height:0; }
              `}</style>
              <div className="tiptap-script-editor">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Agent assignment */}
        <div style={{ background: card, border: `1px solid ${cardBord}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${cardBord}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color={accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: text }}>Assign to Agents</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: muted }}>
              {assigned.size} agent{assigned.size !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Search agents */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${cardBord}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: inputBg, border: `1px solid ${inputBord}`, borderRadius: 8, padding: "7px 12px" }}>
              <Search size={13} color={muted} />
              <input
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                placeholder="Search agents…"
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, color: text, outline: "none", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Agent list */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filteredAgents.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>No agents found</div>
            ) : filteredAgents.map(agent => {
              const isChecked = assigned.has(agent.id);
              return (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", cursor: "pointer",
                    borderBottom: `1px solid ${cardBord}`,
                    background: isChecked ? (isDark ? "rgba(99,102,241,0.08)" : "rgba(91,91,214,0.05)") : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: isChecked ? (isDark ? "rgba(99,102,241,0.25)" : "#EEF2FF") : (isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: isChecked ? accent : muted }}>
                    {(agent.name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.email}</div>
                  </div>
                  {/* Checkbox */}
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isChecked ? accent : inputBord}`, background: isChecked ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                    {isChecked && <Check size={11} color="#fff" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
