// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  X, Plus, Edit2, Trash2, Bold, Italic,
  UnderlineIcon, List, ListOrdered, ChevronLeft, Save, FileText,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";

const MAX = 10;

/* ── Toolbar button ── */
function TBtn({ onClick, active, title, children }: any) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
        background: active ? "rgba(99,102,241,0.18)" : "transparent",
        color: active ? "#6366F1" : "#64748B",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >{children}</button>
  );
}

/* ── Tiptap editor for template body ── */
function BodyEditor({ initialValue, onChange, isDark }: { initialValue: string; onChange: (html: string) => void; isDark: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialValue || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `outline:none;min-height:140px;padding:12px;font-size:13.5px;line-height:1.7;color:${isDark ? "#E8E8F0" : "#1A1A2E"};font-family:'Inter',-apple-system,sans-serif;`,
      },
    },
  });

  useEffect(() => {
    if (editor) setTimeout(() => editor.commands.focus(), 50);
  }, [editor]);

  if (!editor) return null;
  const bd = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const bg = isDark ? "rgba(30,30,40,0.9)" : "#FAFAFA";
  return (
    <div style={{ border: `1px solid ${bd}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: `1px solid ${bd}`, background: isDark ? "rgba(255,255,255,0.03)" : "#F8F9FA", flexWrap: "wrap" }}>
        <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={13}/></TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={13}/></TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={13}/></TBtn>
        <div style={{ width: 1, height: 20, background: bd, margin: "4px 4px" }} />
        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={13}/></TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={13}/></TBtn>
      </div>
      {/* Editor area */}
      <div style={{ background: bg }}>
        <style>{`
          .sms-tiptap p{margin:0 0 6px}
          .sms-tiptap ul,.sms-tiptap ol{padding-left:18px;margin:0 0 6px}
          .sms-tiptap li{margin-bottom:3px}
          .sms-tiptap strong{font-weight:700}
          .sms-tiptap em{font-style:italic}
          .sms-tiptap u{text-decoration:underline}
          .sms-tiptap .ProseMirror:focus{outline:none}
        `}</style>
        <div className="sms-tiptap">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN MODAL
════════════════════════════════════════════════════════ */
export default function SmsTemplatesModal({
  open, onClose, onUse,
}: {
  open: boolean;
  onClose: () => void;
  onUse: (template: { title: string; body: string }) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  // tokens
  const bg       = isDark ? "#0F0F14"                    : "#F6F7F9";
  const card     = isDark ? "rgba(23,23,31,0.98)"        : "#FFFFFF";
  const bdr      = isDark ? "rgba(255,255,255,0.07)"     : "rgba(0,0,0,0.07)";
  const text     = isDark ? "#F0F0F5"                    : "#0D0D12";
  const muted    = isDark ? "#68687A"                    : "#9E9EAD";
  const accent   = "#5B5BD6";
  const accentBg = isDark ? "rgba(91,91,214,0.14)"      : "rgba(91,91,214,0.08)";
  const inputBg  = isDark ? "rgba(30,30,40,0.9)"         : "#F6F7F9";
  const inputBrd = isDark ? "rgba(255,255,255,0.09)"     : "rgba(0,0,0,0.10)";
  const rowHov   = isDark ? "rgba(255,255,255,0.03)"     : "rgba(0,0,0,0.02)";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/message/templates");
      setTemplates(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) { load(); setView("list"); } }, [open]);

  const openCreate = () => { setTitle(""); setBody(""); setEditTarget(null); setView("create"); };
  const openEdit = (t: any) => { setTitle(t.title); setBody(t.body); setEditTarget(t); setView("edit"); };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!body.trim() || body === "<p></p>") { toast.error("Body required"); return; }
    setSaving(true);
    try {
      if (view === "create") {
        await api.post("/message/templates", { title, body });
        toast.success("Template created");
      } else {
        await api.put(`/message/templates/${editTarget.id}`, { title, body });
        toast.success("Template saved");
      }
      await load();
      setView("list");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    setDeleting(id);
    try {
      await api.delete(`/message/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: card, borderRadius: 20, width: "100%", maxWidth: 580, maxHeight: "88vh", display: "flex", flexDirection: "column", border: `1px solid ${bdr}`, boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.55)" : "0 24px 80px rgba(0,0,0,0.14)", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {view !== "list" && (
              <button onClick={() => setView("list")} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: text }}>
                {view === "list" ? "SMS Templates" : view === "create" ? "New Template" : "Edit Template"}
              </div>
              {view === "list" && (
                <div style={{ fontSize: 11.5, color: muted, marginTop: 1 }}>
                  {templates.length}/{MAX} templates used
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "list" && templates.length < MAX && (
              <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Plus size={14} /> New
              </button>
            )}
            {view !== "list" && (
              <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", background: saving ? "rgba(91,91,214,0.5)" : `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}>
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${bdr}`, background: "transparent", color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>

          {/* LIST VIEW */}
          {view === "list" && (
            loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 13 }}>Loading…</div>
            ) : templates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px" }}>
                <FileText size={36} color={muted} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, color: muted, fontSize: 13 }}>No templates yet — create your first one!</p>
                <button onClick={openCreate} style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <Plus size={14} /> Create Template
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map(t => (
                  <div key={t.id}
                    style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", background: card, transition: "box-shadow 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = isDark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    {/* Template header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: text }}>{t.title}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* Use button */}
                        <button onClick={() => { onUse(t); onClose(); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: `1px solid rgba(91,91,214,0.28)`, background: accentBg, color: accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Use
                        </button>
                        <button onClick={() => openEdit(t)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(239,68,68,0.20)", background: isDark ? "rgba(239,68,68,0.10)" : "#FEF2F2", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {/* Template preview */}
                    <div style={{ padding: "10px 14px" }}>
                      <style>{`
                        .sms-tmpl-preview p{margin:0 0 4px;font-size:12.5px;color:${muted};line-height:1.6}
                        .sms-tmpl-preview ul,.sms-tmpl-preview ol{padding-left:16px;margin:0 0 4px}
                        .sms-tmpl-preview li{font-size:12.5px;color:${muted};margin-bottom:2px}
                        .sms-tmpl-preview strong{font-weight:700;color:${text}}
                        .sms-tmpl-preview em{font-style:italic}
                        .sms-tmpl-preview u{text-decoration:underline}
                      `}</style>
                      <div className="sms-tmpl-preview" dangerouslySetInnerHTML={{ __html: t.body }} style={{ maxHeight: 80, overflow: "hidden" }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* CREATE / EDIT VIEW */}
          {(view === "create" || view === "edit") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Template Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Follow Up, Appointment Reminder…"
                  style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${inputBrd}`, background: inputBg, color: text, fontSize: 13.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {/* Body */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Message Body</label>
                <BodyEditor key={`${view}-${editTarget?.id ?? "new"}`} initialValue={body} onChange={setBody} isDark={isDark} />
                <p style={{ margin: "6px 0 0", fontSize: 11, color: muted }}>Supports bold, italic, underline, and lists.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
