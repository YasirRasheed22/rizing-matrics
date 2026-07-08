//@ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { Info as InfoIcon } from "lucide-react";
import RemarkModal from "../components/RemarkModal";
import {
  Pencil, Save, X, Phone, User, MapPin, Calendar, Tag,
  Trash2, Paperclip, ArrowLeft, MessageSquare, FileText, Shield,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { DateInput } from "../components/ui/AppDatePicker";
import { formatDate } from "../hooks/dateFormat";

type Lead = {
  id: number; clientName: string; clientPhone: string; clientAddress: string;
  alternatePhone?: string; comments?: string; tags?: string[];
  nextFollowupDate?: string; createdAt: string;
  disposition?: { id: number; name: string; color: string };
  addedBy?: { id: number; name: string }; remarks?: any[]; logs?: any[];
};
type Remark = {
  id: number; note: string; createdAt: string;
  user?: { name: string }; userId?: number; attachmentUrl?: string;
};
type Log = {
  id: number; action: string; message?: string; createdAt: string;
  oldData?: any; newData?: any; user?: { name: string };
};

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" }, { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" }, { bg: "#EFF6FF", text: "#5B5BD6" },
  { bg: "#FFF1F2", text: "#E11D48" }, { bg: "#F0FDFA", text: "#0D9488" },
  { bg: "#FFFBEB", text: "#D97706" }, { bg: "#FDF4FF", text: "#A21CAF" },
];
const AVATAR_COLORS_DARK = [
  { bg: "rgba(79,70,229,0.18)", text: "#818CF8" }, { bg: "rgba(22,163,74,0.18)", text: "#4ADE80" },
  { bg: "rgba(234,88,12,0.18)", text: "#FB923C" }, { bg: "rgba(91,91,214,0.18)", text: "#A5B4FC" },
  { bg: "rgba(225,29,72,0.18)", text: "#FB7185" }, { bg: "rgba(13,148,136,0.18)", text: "#2DD4BF" },
  { bg: "rgba(217,119,6,0.18)", text: "#FCD34D" }, { bg: "rgba(162,28,175,0.18)", text: "#E879F9" },
];

const getAvatarColor = (str: string, dark = false) => {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return dark ? AVATAR_COLORS_DARK[idx] : AVATAR_COLORS[idx];
};

const getInitials = (name: string) =>
  (name || "?").trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

function safeParseJSON(value: any) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } }
  return value;
}

function formatValue(val: any) {
  if (val === null || val === undefined || val === "") return "-";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) { try { return new Date(val).toLocaleString(); } catch { return val; } }
    return val;
  }
  return String(val);
}

function getReadableEntries(data: any) {
  const parsed = safeParseJSON(data);
  if (!parsed) return [];
  if (parsed.clientName || parsed.clientPhone || parsed.clientAddress)
    return Object.entries(parsed).map(([key, value]) => ({ key, value: formatValue(value) }));
  if (parsed.remark || parsed.leadUpdate) {
    const rows: { key: string; value: string }[] = [];
    if (parsed.remark) Object.entries(parsed.remark).forEach(([key, value]) => rows.push({ key: `remark.${key}`, value: formatValue(value) }));
    if (parsed.leadUpdate) Object.entries(parsed.leadUpdate).forEach(([key, value]) => rows.push({ key: `leadUpdate.${key}`, value: formatValue(value) }));
    return rows;
  }
  if (typeof parsed === "object") return Object.entries(parsed).map(([key, value]) => ({ key, value: formatValue(value) }));
  return [{ key: "value", value: String(parsed) }];
}

function JsonTooltip({ title, data }: { title: string; data: any }) {
  const rows = getReadableEntries(data);
  if (!rows.length) return <span style={{ color: "#D0D5DD" }}>—</span>;
  return (
    <OverlayTrigger placement="left"
      overlay={
        <Tooltip id={`tooltip-${title}-${Math.random()}`}>
          <div style={{ maxWidth: 380, textAlign: "left" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
            <div style={{ maxHeight: 260, overflowY: "auto", whiteSpace: "normal", fontSize: 12, lineHeight: 1.5 }}>
              {rows.map((row, index) => (
                <div key={index} style={{ marginBottom: 4 }}><strong>{row.key}:</strong> {row.value}</div>
              ))}
            </div>
          </div>
        </Tooltip>
      }
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <InfoIcon size={14} color="#6b7280" />
      </div>
    </OverlayTrigger>
  );
}

function LogsDataTable({ logs, isDark }: { logs: Log[]; isDark: boolean }) {
  const textPrimary   = isDark ? "#F0F0F5" : "#101828";
  const textSecondary = isDark ? "#A0A0B0" : "#344054";
  const textMuted     = isDark ? "#68687A"  : "#667085";
  const cardBg        = isDark ? "rgba(23,23,31,0.95)" : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)" : "#EAECF0";
  const thBg          = isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB";
  const thBorder      = isDark ? "rgba(255,255,255,0.06)" : "#EAECF0";
  const tdBorder      = isDark ? "rgba(255,255,255,0.05)" : "#F2F4F7";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)" : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)" : "#D0D5DD";
  const paginBg       = isDark ? "rgba(255,255,255,0.02)" : "#F9FAFB";
  const paginBorder   = isDark ? "rgba(255,255,255,0.06)" : "#EAECF0";
  const accentMain    = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)" : "#EFF6FF";
  const prevBtnBg     = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const prevBtnBord   = isDark ? "rgba(255,255,255,0.09)" : "#D0D5DD";
  const prevBtnColor  = isDark ? "#A0A0B0" : "#344054";

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Log>[]>(() => [
    {
      accessorKey: "user", header: "User",
      cell: ({ row }) => {
        const name = row.original.user?.name || "System";
        const avatar = getAvatarColor(name, isDark);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: textPrimary }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatar.bg, color: avatar.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(name)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "action", header: "Action",
      cell: ({ row }) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: accentBg, color: accentMain, fontSize: 12, fontWeight: 700 }}>
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: "message", header: "Message",
      cell: ({ row }) => <div style={{ color: textSecondary, fontSize: 13 }}>{row.original.message || "-"}</div>,
    },
    { id: "oldData", header: "Old Data", cell: ({ row }) => <JsonTooltip title="Old Data" data={row.original.oldData} /> },
    { id: "newData", header: "New Data", cell: ({ row }) => <JsonTooltip title="New Data" data={row.original.newData} /> },
    {
      accessorKey: "createdAt", header: "Date",
      cell: ({ row }) => <div style={{ color: textMuted, fontSize: 13 }}>{new Date(row.original.createdAt).toLocaleString()}</div>,
    },
  ], [isDark, textPrimary, textSecondary, textMuted, accentMain, accentBg]);

  const table = useReactTable({
    data: logs || [], columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${thBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input type="text" placeholder="Search logs..." value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={{ padding: "8px 12px", fontSize: 13, color: textPrimary, border: `1px solid ${inputBorder}`, borderRadius: 8, outline: "none", background: inputBg, maxWidth: 320, width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
          onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
          onBlur={(e) => (e.target.style.borderColor = inputBorder)}
        />
        <div style={{ fontSize: 13, color: textMuted }}>Total: {logs.length} logs</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={{ background: thBg }}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: "pointer", userSelect: "none", padding: "10px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${thBorder}` }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${tdBorder}` }}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30, color: textMuted }}>No logs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${paginBorder}`, background: paginBg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: textMuted }}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${prevBtnBord}`, background: prevBtnBg, color: table.getCanPreviousPage() ? prevBtnColor : textMuted, cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500 }}>
            Previous
          </button>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${accentMain}`, background: table.getCanNextPage() ? accentMain : (isDark ? "#2A2A3A" : "#94A3B8"), color: "#fff", cursor: table.getCanNextPage() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SingleLeadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Design tokens ──
  const pageBg        = isDark ? "#0F0F14"                  : "#F8F9FC";
  const headerBg      = isDark ? "rgba(23,23,31,0.97)"      : "#fff";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const cardBg        = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#A0A0B0"                  : "#344054";
  const textMuted     = isDark ? "#68687A"                  : "#667085";
  const textSoft      = isDark ? "#C0C0D0"                  : "#475467";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.08)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const tabActiveClr  = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const tabInactiveClr= isDark ? "#68687A"                  : "#667085";
  const tabHoverClr   = isDark ? "#C0C0D0"                  : "#344054";
  const tabBorder     = isDark ? "rgba(255,255,255,0.06)"   : "#EAECF0";
  const divider       = isDark ? "rgba(255,255,255,0.05)"   : "#F2F4F7";
  const backBtnBg     = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const backBtnBord   = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const emptyIconClr  = isDark ? "#3A3A4A"                  : "#D0D5DD";
  const countBadgeBg  = isDark ? "rgba(255,255,255,0.06)"   : "#F9FAFB";
  const countBadgeBord= isDark ? "rgba(255,255,255,0.08)"   : "#EAECF0";
  const attachBtnBg   = isDark ? "rgba(255,255,255,0.06)"   : "#F9FAFB";
  const attachBtnBord = isDark ? "rgba(255,255,255,0.08)"   : "#EAECF0";
  const delBtnBg      = isDark ? "rgba(239,68,68,0.15)"     : "#FEF2F2";
  const delBtnBord    = isDark ? "rgba(239,68,68,0.30)"     : "#FECACA";
  const cancelBtnBg   = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const cancelBtnBord = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const editBtnBg     = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const editBtnBord   = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const spinBorder    = isDark ? "rgba(124,124,240,0.15)"   : "#DBEAFE";
  const selectBg      = isDark ? "rgba(30,30,42,0.90)"      : "#fff";

  const inputStyle = {
    width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary,
    border: `1px solid ${inputBorder}`, borderRadius: 8, outline: "none",
    background: inputBg, transition: "all 0.15s", boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  const selectStyle = {
    ...inputStyle,
    background: selectBg, cursor: "pointer",
  };

  const InfoCard = ({ label, icon: Icon, value, children }: any) => (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 18 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>{label}</label>
      {children ? children : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          {Icon && <Icon size={16} style={{ color: textMuted, flexShrink: 0 }} />}
          <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary, wordBreak: "break-word" }}>{value || "—"}</span>
        </div>
      )}
    </div>
  );

  const EditableInput = ({ label, value, onChange, type = "text" }: any) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
        onBlur={(e) => (e.target.style.borderColor = inputBorder)} />
    </div>
  );

  const EditableSelect = ({ label, value, options, onChange }: any) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>{label}</label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={selectStyle}
        onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
        onBlur={(e) => (e.target.style.borderColor = inputBorder)}>
        <option value="">Select</option>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const [activeTab, setActiveTab] = useState<"info" | "remarks" | "logs">("info");
  const [lead, setLead] = useState<Lead | null>(null);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [editingRemark, setEditingRemark] = useState<Remark | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispositions, setDispositions] = useState([]);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", clientAddress: "", dispositionId: "", nextFollowupDate: "", alternatePhone: "", tags: [] as string[] });

  useEffect(() => {
    api.get("/voice/dispositions/all").then((res) => {
      setDispositions((res.data || []).filter((d: any) => d.status !== false).sort((a: any, b: any) => a.sequence - b.sequence).map((d: any) => ({ value: d.id, label: d.name, color: d.color })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/voice/leads/single/${id}`).then((res) => {
      const response = res.data;
      setLead(response.lead);
      setRemarks(response.lead.remarks || []);
      setLogs(response.lead.logs || []);
    }).catch((err) => console.error("SingleLead fetch error", err))
    .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead) return;
    setForm({
      clientName: lead.clientName || "", clientPhone: lead.clientPhone || "",
      clientAddress: lead.clientAddress || "", dispositionId: lead.disposition?.id || "",
      nextFollowupDate: lead.nextFollowupDate ? lead.nextFollowupDate.split("T")[0] : "",
      alternatePhone: lead.alternatePhone || "", tags: lead.tags || [],
    });
  }, [lead]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        client: { name: form.clientName, phone: form.clientPhone, address: form.clientAddress },
        dispositionId: form.dispositionId || null,
        nextFollowupDate: form.nextFollowupDate || null,
        alternatePhone: form.alternatePhone || null,
        tags: form.tags || [],
      };
      const res = await api.put(`/voice/leads/update/${lead.id}`, payload);
      toast.success("Lead updated successfully");
      setLead(res.data.lead); setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update lead");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg, fontFamily: "'Inter', -apple-system, sans-serif", color: textMuted, gap: 10, flexDirection: "column" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading Lead...
    </div>
  );

  if (!lead) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <User size={24} style={{ color: isDark ? "#3A3A4A" : "#9CA3AF" }} />
        </div>
        <p style={{ color: textSecondary, fontWeight: 600, fontSize: 15, margin: 0 }}>Lead not found</p>
      </div>
    </div>
  );

  const avatar = getAvatarColor(lead.clientName || "Lead", isDark);
  const tabs = [
    { key: "info",    label: "Lead Info",                    icon: User },
    { key: "remarks", label: `Remarks (${remarks.length})`,  icon: MessageSquare },
    { key: "logs",    label: `Logs (${logs.length})`,        icon: FileText },
  ];

  return (
    <div style={{ minHeight: "100vh", background: pageBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", backdropFilter: isDark ? "blur(24px)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${backBtnBord}`, background: backBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textMuted, flexShrink: 0 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatar.bg, color: avatar.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
            {getInitials(lead.clientName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>{lead.clientName}</h1>
            <p style={{ color: textMuted, fontSize: 13, margin: "2px 0 0" }}>{lead.clientPhone}</p>
            <div style={{ marginTop: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: lead.disposition?.color || (isDark ? "#3A3A4A" : "#98A2B3"), color: "#fff", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.9 }} />
                {lead.disposition?.name || "New"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => { setEditingRemark(null); setShowRemarkModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: accentMain, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600, boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)" }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Remark
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${tabBorder}`, padding: "0 28px", display: "flex", gap: 0 }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key as "info" | "remarks" | "logs")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? tabActiveClr : tabInactiveClr, borderBottom: isActive ? `2px solid ${tabActiveClr}` : "2px solid transparent", transition: "all 0.15s", marginBottom: -1, whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = tabHoverClr; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = tabInactiveClr; }}
            >
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Info tab — view mode */}
        {activeTab === "info" && !isEditing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoCard label="Name"           icon={User}     value={lead.clientName} />
              <InfoCard label="Phone"          icon={Phone}    value={lead.clientPhone} />
              <InfoCard label="Address"        icon={MapPin}   value={lead.clientAddress} />
              <InfoCard label="Disposition">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: lead.disposition?.color || (isDark ? "#3A3A4A" : "#98A2B3"), color: "#fff", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.9 }} />
                  {lead.disposition?.name || "-"}
                </span>
              </InfoCard>
              <InfoCard label="Next Follow-up" icon={Calendar} value={lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toLocaleDateString() : "-"} />
              <InfoCard label="Alternate Phone" icon={Phone}   value={lead.alternatePhone || "-"} />
              <InfoCard label="Tags"            icon={Tag}     value={lead.tags?.join(", ") || "-"} />
              <InfoCard label="Created At"      icon={Calendar} value={formatDate(lead.createdAt)} />
            </div>

            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>Comments</label>
              <p style={{ margin: 0, fontSize: 14, color: textSoft, lineHeight: 1.6 }}>{lead.comments || "No comments"}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setIsEditing(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: accentMain, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)" }}>
                <Pencil size={16} /> Edit Lead
              </button>
            </div>
          </div>
        )}

        {/* Info tab — edit mode */}
        {activeTab === "info" && isEditing && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <EditableInput label="Name"           value={form.clientName}     onChange={(v: string) => setForm({ ...form, clientName: v })} />
              <EditableInput label="Phone"          value={form.clientPhone}    onChange={(v: string) => setForm({ ...form, clientPhone: v })} />
              <EditableInput label="Address"        value={form.clientAddress}  onChange={(v: string) => setForm({ ...form, clientAddress: v })} />
              <EditableSelect label="Disposition"   value={form.dispositionId}  options={dispositions} onChange={(v: string) => setForm({ ...form, dispositionId: v })} />
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>Next Follow-up Date</label>
                <DateInput value={form.nextFollowupDate} onChange={(val) => setForm({ ...form, nextFollowupDate: val })} style={inputStyle} />
              </div>
              <EditableInput label="Alternate Phone" value={form.alternatePhone} onChange={(v: string) => setForm({ ...form, alternatePhone: v })} />
            </div>
            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => { setIsEditing(false); setForm({ clientName: lead.clientName || "", clientPhone: lead.clientPhone || "", clientAddress: lead.clientAddress || "", dispositionId: lead.disposition?.id || "", nextFollowupDate: lead.nextFollowupDate ? lead.nextFollowupDate.split("T")[0] : "", alternatePhone: lead.alternatePhone || "", tags: lead.tags || [] }); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: cancelBtnBg, border: `1px solid ${cancelBtnBord}`, borderRadius: 10, color: textSecondary, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                <X size={16} /> Cancel
              </button>
              <button disabled={saving} onClick={handleSave}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: saving ? (isDark ? "#2A2A3A" : "#94A3B8") : accentMain, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : (isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)") }}>
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Remarks tab */}
        {activeTab === "remarks" && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>Lead Remarks</span>
              <span style={{ fontSize: 12, color: textMuted, background: countBadgeBg, border: `1px solid ${countBadgeBord}`, borderRadius: 20, padding: "2px 10px" }}>
                {remarks.length} records
              </span>
            </div>
            {remarks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "56px 0" }}>
                <MessageSquare size={28} style={{ color: emptyIconClr, margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No remarks added</p>
              </div>
            ) : (
              remarks.map((r, index) => {
                const av = getAvatarColor(r.user?.name || "User", isDark);
                return (
                  <div key={r.id} style={{ display: "flex", gap: 14, padding: "16px 18px", borderTop: index === 0 ? "none" : `1px solid ${divider}`, alignItems: "flex-start" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: av.bg, color: av.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(r.user?.name || "User")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{r.user?.name || "User"}</span>
                        <span style={{ fontSize: 12, color: textMuted }}>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: textSoft }}>{r.note}</p>
                      {r.attachmentUrl && (
                        <button onClick={async () => {
                          try {
                            const res = await api.get(`/voice/leads/remark/${r.id}/download`, { responseType: "blob" });
                            const blob = new Blob([res.data]);
                            const url = window.URL.createObjectURL(blob);
                            const disposition = res.headers["content-disposition"];
                            let filename = "attachment";
                            if (disposition) { const match = disposition.match(/filename="?(.+)"?/); if (match?.[1]) filename = match[1]; }
                            const a = document.createElement("a"); a.href = url; a.download = filename;
                            document.body.appendChild(a); a.click(); a.remove();
                            window.URL.revokeObjectURL(url);
                          } catch { alert("Failed to download attachment"); }
                        }}
                          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, border: `1px solid ${attachBtnBord}`, background: attachBtnBg, color: textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          <Paperclip size={14} /> Download Attachment
                        </button>
                      )}
                    </div>
                    {r.userId === user?.id && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button title="Edit remark" onClick={() => { setEditingRemark(r); setShowRemarkModal(true); }}
                          style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${cardBorder}`, background: editBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Pencil size={16} color={textSecondary} />
                        </button>
                        <button title="Delete remark" onClick={async () => { if (!confirm("Delete this remark?")) return; await api.delete(`/voice/leads/remark/${r.id}`); setRemarks((prev) => prev.filter((x) => x.id !== r.id)); }}
                          style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${delBtnBord}`, background: delBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Trash2 size={16} color="#DC2626" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Logs tab */}
        {activeTab === "logs" && <LogsDataTable logs={logs} isDark={isDark} />}
      </div>

      {showRemarkModal && (
        <RemarkModal
          leadId={Number(id)} remark={editingRemark}
          onClose={() => setShowRemarkModal(false)}
          dispositions={dispositions}
          isDark={isDark}
          onSaved={(savedRemark) => {
            if (editingRemark) setRemarks((prev) => prev.map((r) => (r.id === savedRemark.id ? savedRemark : r)));
            else setRemarks((prev) => [savedRemark, ...prev]);
          }}
        />
      )}
    </div>
  );
}