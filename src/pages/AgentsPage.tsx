// src/pages/AgentsPage.tsx
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import Select from "react-select";
import {
  Plus, User, Mail, Phone, Lock, Edit2, Trash2, X, Check,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Eye, Globe, Shield, Users, Wifi, WifiOff, Clock,
} from "lucide-react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

// ── EMPTY_PRIVILEGES — RolesPage ke saath 100% match ──
const EMPTY_PRIVILEGES = {
  // Call & Media
  makeCall: false, canCallDNC: false, showCallDNC: false,
  transcription: false, transfer: false, recording: false,
  mms: false, endCallPop: false, composeEmail: false, liveCallsAccess: false,
  // Security & Account
  loginIp: false, loginIpAddress: "",
  twoFA: false, emailPrivilege: false, additionalEmail: "",
  targetEnable: false, targetValue: "",
  changePassword: false, editProfile: false,
  // Agent Dashboard
  viewDashboard: false, viewTeamDashboard: false, viewCallLogs: false,
  viewContacts: false, viewCompanyContacts: false,
  canEditContact: false, canDeleteContact: false,
  viewMessages: false, viewEmails: false,
  viewLeads: false, viewSales: false, viewKpis: false,
  canMakeChatGroup: false,
  // Admin Dashboard
  viewAdminDashboard: false, manageAgents: false, manageTeams: false,
  manageNumbers: false, manageLeadsAdmin: false, viewCallLogsAdmin: false,
  viewReports: false, manageRoles: false, manageBilling: false,
};

const EMPTY_SMTP = {
  host: "", port: "", secure: true,
  username: "", password: "", fromName: "", fromEmail: "",
};

const columnHelper = createColumnHelper<any>();

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const map: Record<string, { bg: string; darkBg: string; color: string; icon: any }> = {
    AVAILABLE: { bg: "rgba(23,163,99,0.10)",   darkBg: "rgba(23,163,99,0.15)",   color: "#17A363", icon: Wifi },
    BUSY:      { bg: "rgba(211,138,0,0.12)",   darkBg: "rgba(211,138,0,0.18)",   color: "#D38A00", icon: Clock },
    OFFLINE:   { bg: "rgba(0,0,0,0.06)",       darkBg: "rgba(255,255,255,0.07)", color: "#9E9EAD", icon: WifiOff },
  };
  const s = map[status] ?? map.OFFLINE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: isDark ? s.darkBg : s.bg, color: s.color }}>
      <s.icon size={10} /> {status}
    </span>
  );
}

function AgentAvatar({ name, isDark }: { name: string; isDark: boolean }) {
  const initials = (name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: isDark ? `hsl(${hue},40%,22%)` : `hsl(${hue},55%,90%)`, color: isDark ? `hsl(${hue},65%,65%)` : `hsl(${hue},55%,38%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
      {initials}
    </div>
  );
}

// ── PrivPill — read-only display of a privilege ──
function PrivPill({ label, checked, isDark }: { label: string; checked: boolean; isDark: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, fontSize: 12.5, background: checked ? (isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.07)") : (isDark ? "rgba(255,255,255,0.04)" : "#F6F7F9"), border: `1px solid ${checked ? (isDark ? "rgba(124,124,240,0.28)" : "rgba(91,91,214,0.22)") : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")}` }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: checked ? (isDark ? "#7C7CF0" : "#5B5BD6") : "transparent", border: `2px solid ${checked ? (isDark ? "#7C7CF0" : "#5B5BD6") : (isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.18)")}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {checked && <Check size={10} color="#fff" />}
      </div>
      <span style={{ color: isDark ? "#C0C0D0" : "#0D0D12", fontWeight: checked ? 600 : 400 }}>{label}</span>
    </div>
  );
}

export default function AgentsPage() {
  const navigate      = useNavigate();
  const { user: currentUser } = useAuth();
  const { theme }     = useTheme();
  const isDark        = theme === "dark";

  // ── Design tokens ──
  const textPrimary    = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary  = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted      = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain     = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg       = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const cardBg         = isDark ? "rgba(23,23,31,0.92)"      : "rgba(255,255,255,0.92)";
  const cardBorder     = isDark ? "rgba(255,255,255,0.07)"   : "rgba(255,255,255,0.60)";
  const cardShadow     = isDark ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)" : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg        = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder    = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const toolbarBg      = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.80)";
  const divider        = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const thBg           = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.80)";
  const thBorder       = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const tdBorder       = isDark ? "rgba(255,255,255,0.05)"   : "rgba(0,0,0,0.05)";
  const rowOdd         = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.40)";
  const rowHover       = isDark ? "rgba(124,124,240,0.06)"   : "rgba(91,91,214,0.04)";
  const paginBtnBg     = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const paginBtnBorder = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.08)";
  const paginActiveBg  = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.10)";
  const modalOverlay   = isDark ? "rgba(0,0,0,0.70)"         : "rgba(0,0,0,0.45)";
  const modalFooterBg  = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.80)";
  const cancelBtnBg    = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const cancelBtnBord  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const sectionLabelClr= isDark ? "#68687A"                  : "#9E9EAD";
  const subLabelClr    = isDark ? "#3A3A4A"                  : "#BBBBC8";
  const closeBtnBg     = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.06)";
  const emptyIconBg    = isDark ? "rgba(124,124,240,0.10)"   : "rgba(91,91,214,0.08)";
  const checkboxAccent = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const smtpLabelBg    = isDark ? "rgba(255,255,255,0.04)"   : "#F6F7F9";
  const smtpLabelBord  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const sectionDivider = isDark ? "rgba(255,255,255,0.05)"   : "rgba(0,0,0,0.05)";

  const card: React.CSSProperties = {
    background: cardBg, backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13,
    color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 800,
    color: textMuted, marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase",
  };

  const thStyle: React.CSSProperties = {
    padding: "11px 16px", textAlign: "left", fontSize: 10.5,
    fontWeight: 700, color: textMuted, textTransform: "uppercase",
    letterSpacing: "0.07em", whiteSpace: "nowrap",
    background: thBg, borderBottom: `1px solid ${thBorder}`,
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 10,
      background: inputBg, minHeight: 40,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)" }, fontSize: 13,
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 999999 }),
    menu: (p: any) => ({
      ...p, zIndex: 999999, borderRadius: 12, overflow: "hidden",
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.09)" : "none",
      boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.60)" : "0 16px 40px rgba(0,0,0,0.14)",
    }),
    option: (p: any, s: any) => ({
      ...p, background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)") : "transparent",
      color: s.isSelected ? "white" : textPrimary, fontSize: 13, padding: "9px 14px",
    }),
    singleValue:        (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder:        (p: any) => ({ ...p, color: isDark ? "#3A3A4A" : "#BBBBC8", fontSize: 13 }),
    indicatorSeparator: ()       => ({ display: "none" }),
    dropdownIndicator:  (p: any) => ({ ...p, color: textMuted }),
    input:              (p: any) => ({ ...p, color: textPrimary }),
  };

  // ── State ──
  const [agents, setAgents]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles]     = useState<any[]>([]);
  const [teams, setTeams]     = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting]           = useState<SortingState>([]);
  const [showModal, setShowModal]   = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "", phoneNumber: "",
    roleId: null, teamId: null,
    privileges: { ...EMPTY_PRIVILEGES },
    smtp: { ...EMPTY_SMTP },
  });

  const fetchAgents = async () => {
    try { const r = await api.get("/auth/all"); setAgents(r.data || []); }
    catch { toast.error("Failed to load agents"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAgents();
    api.get("/auth/roles/all").then((r) => setRoles(r.data || [])).catch(() => {});
    api.get("/voice/team").then((r)  => setTeams(r.data?.data || [])).catch(() => {});
  }, []);

  // ── Map a role object → full privileges (all keys) ──
  const mapRoleToPrivileges = (r: any) => ({
    makeCall:           r.makeCall           ?? false,
    canCallDNC:         r.canCallDNC         ?? false,
    showCallDNC:        r.showCallDNC        ?? false,
    transcription:      r.transcription      ?? false,
    transfer:           r.transfer           ?? false,
    recording:          r.recording          ?? false,
    mms:                r.mms                ?? false,
    endCallPop:         r.endCallPop         ?? false,
    composeEmail:       r.composeEmail       ?? false,
    liveCallsAccess:    r.liveCallsAccess    ?? false,
    loginIp:            r.loginIp            ?? false,
    loginIpAddress:     r.loginIpAddress     || "",
    twoFA:              r.twoFA              ?? false,
    emailPrivilege:     r.emailPrivilege     ?? false,
    additionalEmail:    r.additionalEmail    || "",
    targetEnable:       r.targetEnable       ?? false,
    targetValue:        r.targetValue        || "",
    changePassword:     r.changePassword     ?? false,
    editProfile:        r.editProfile        ?? false,
    viewDashboard:      r.viewDashboard      ?? false,
    viewTeamDashboard:  r.viewTeamDashboard  ?? false,
    viewCallLogs:       r.viewCallLogs       ?? false,
    viewContacts:       r.viewContacts       ?? false,
    viewCompanyContacts:r.viewCompanyContacts?? false,
    canEditContact:     r.canEditContact     ?? false,
    canDeleteContact:   r.canDeleteContact   ?? false,
    viewMessages:       r.viewMessages       ?? false,
    viewEmails:         r.viewEmails         ?? false,
    viewLeads:          r.viewLeads          ?? false,
    viewSales:          r.viewSales          ?? false,
    viewKpis:           r.viewKpis           ?? false,
    canMakeChatGroup:   r.canMakeChatGroup   ?? false,
    viewAdminDashboard: r.viewAdminDashboard ?? false,
    manageAgents:       r.manageAgents       ?? false,
    manageTeams:        r.manageTeams        ?? false,
    manageNumbers:      r.manageNumbers      ?? false,
    manageLeadsAdmin:   r.manageLeadsAdmin   ?? false,
    viewCallLogsAdmin:  r.viewCallLogsAdmin  ?? false,
    viewReports:        r.viewReports        ?? false,
    manageRoles:        r.manageRoles        ?? false,
    manageBilling:      r.manageBilling      ?? false,
  });

  const openAdd = () => {
    setIsEditMode(false); setEditingAgent(null);
    setForm({ name: "", email: "", password: "", phoneNumber: "", roleId: null, teamId: null, privileges: { ...EMPTY_PRIVILEGES }, smtp: { ...EMPTY_SMTP } });
    setShowModal(true);
  };

  const openEdit = (agent: any) => {
    setIsEditMode(true); setEditingAgent(agent);
    const p = agent.agentPrivilege || {};
    setForm({
      name: agent.name, email: agent.email, password: "",
      roleId: agent.roleId ?? null, teamId: agent.teamId ?? null,
      phoneNumber: agent.phoneNumber || "",
      privileges: mapRoleToPrivileges(p),
      smtp: agent.agentSmtp || { ...EMPTY_SMTP },
    });
    setShowModal(true);
  };

  const handleRoleChange = (roleId: number | null) => {
    if (!roleId) { setForm((f) => ({ ...f, roleId: null, privileges: { ...EMPTY_PRIVILEGES } })); return; }
    const r = roles.find((x) => x.id === roleId);
    if (!r) return;
    setForm((f) => ({ ...f, roleId, privileges: mapRoleToPrivileges(r) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name || !form.email || (!isEditMode && !form.password)) { toast.error("Please fill all required fields"); return; }
    if (form.privileges.loginIp && !form.privileges.loginIpAddress?.trim()) { toast.error("Login IP Address required"); return; }
    if (form.privileges.emailPrivilege) {
      const s = form.smtp;
      if (!s.host || !s.port || !s.username || !s.password || !s.fromName || !s.fromEmail) { toast.error("Fill all SMTP fields"); return; }
    }
    try {
      const payload = {
        name: form.name, email: form.email, additionalRoleId: form.roleId,
        teamId: form.teamId, phoneNumber: form.phoneNumber,
        ...(form.password && { password: form.password }),
        privileges: form.privileges,
        smtp: form.privileges.emailPrivilege ? form.smtp : undefined,
      };
      if (isEditMode && editingAgent) {
        await api.put(`/auth/update/${editingAgent.id}`, payload);
        toast.success("Agent updated");
      } else {
        await api.post("/auth/register", payload);
        toast.success("Agent created");
      }
      setShowModal(false); fetchAgents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (agent: any) => {
    if (!window.confirm(`Delete ${agent.name}?`)) return;
    try {
      await api.delete(`/auth/delete/${agent.id}`);
      toast.success("Agent deleted");
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } catch { toast.error("Failed to delete agent"); }
  };

  // ── Privilege groups — exact same as RolesPage ──
  const privGroups = [
    {
      title: "Call & Media",
      items: [
        { key: "makeCall",        label: "Make Calls" },
        { key: "showCallDNC",     label: "Show DNC" },
        { key: "canCallDNC",      label: "Dial DNC" },
        { key: "transcription",   label: "Transcription" },
        { key: "transfer",        label: "Transfer" },
        { key: "recording",       label: "Recording" },
        { key: "mms",             label: "MMS" },
        { key: "endCallPop",      label: "End Call Pop" },
        { key: "composeEmail",    label: "Compose Email" },
        { key: "liveCallsAccess", label: "Listen Live Calls" },
      ],
    },
    {
      title: "Security & Account",
      items: [
        { key: "loginIp",        label: "Restrict Login by IP" },
        { key: "twoFA",          label: "Require 2FA" },
        { key: "emailPrivilege", label: "Email Access" },
        { key: "targetEnable",   label: "Enable Target" },
        { key: "changePassword", label: "Change Password" },
        { key: "editProfile",    label: "Edit Profile" },
      ],
    },
    {
      title: "Agent Dashboard Access",
      items: [
        { key: "viewDashboard",       label: "View Dialer" },
        // { key: "viewTeamDashboard",   label: "Team Dashboard" },
        { key: "viewCallLogs",         label: "Call Logs" },
        { key: "viewContacts",         label: "Contacts" },
        { key: "viewCompanyContacts",  label: "Company Contacts" },
        { key: "canEditContact",       label: "Edit Contacts" },
        { key: "canDeleteContact",     label: "Delete Contacts" },
        { key: "viewMessages",         label: "Messages" },
        { key: "viewEmails",           label: "Emails" },
        { key: "viewLeads",            label: "Leads" },
        { key: "viewSales",            label: "Sales" },
        { key: "viewKpis",             label: "KPIs" },
        { key: "canMakeChatGroup",     label: "Create Team Chat Group" },
        { key: "teamCalls",     label: "Enable Team Calls" },
      ],
    },
    {
      title: "Admin Dashboard Access",
      items: [
        { key: "viewAdminDashboard", label: "Admin Dashboard" },
        { key: "manageAgents",       label: "Manage Agents" },
        { key: "manageTeams",        label: "Manage Teams" },
        { key: "manageNumbers",      label: "Phone Numbers" },
        { key: "manageLeadsAdmin",   label: "Leads (Admin)" },
        { key: "viewCallLogsAdmin",  label: "Call Logs (Admin)" },
        { key: "viewReports",        label: "Reports" },
        { key: "manageRoles",        label: "Manage Roles" },
        { key: "manageBilling",      label: "Billing" },
      ],
    },
  ];

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Agent",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AgentAvatar name={info.getValue()} isDark={isDark} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary }}>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Mail size={12} style={{ color: textMuted }} />
          <span style={{ fontSize: 13, color: textSecondary }}>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("phoneNumber", {
      header: "Phone",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Phone size={12} style={{ color: textMuted }} />
          <span style={{ fontSize: 13, color: textSecondary, fontFamily: "monospace" }}>{info.getValue() || "—"}</span>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue() || "OFFLINE"} isDark={isDark} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/admin/agents/view/${info.row.original.id}`)}
            style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(23,163,99,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={13} color="#17A363" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            onClick={() => openEdit(info.row.original)}
            style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit2 size={13} color={accentMain} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            onClick={() => handleDelete(info.row.original)}
            style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(208,40,26,0.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={13} color="#D0281A" />
          </motion.button>
        </div>
      ),
    }),
  ], [isDark, textPrimary, textSecondary, textMuted, accentMain]);

  const table = useReactTable({
    data: agents, columns,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting,
  });

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>Agents</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>Manage your call centre team members</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)" }}>
            <Plus size={15} /> Add Agent
          </motion.button>
        </div>

        {/* ── Table card ── */}
        <div style={card}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${divider}`, gap: 12, flexWrap: "wrap", background: toolbarBg }}>
            <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
              <input type="text" value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search agents..."
                style={{ ...inputStyle, paddingLeft: 30 }}
                onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              />
            </div>
            <span style={{ fontSize: 12, color: textMuted }}>{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: emptyIconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Users size={24} color={accentMain} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: "0 0 6px" }}>No agents yet</p>
              <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Add your first agent to get started</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => (
                          <th key={h.id} style={thStyle} onClick={h.column.getToggleSortingHandler()}>
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, idx) => (
                      <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        style={{ borderBottom: `1px solid ${tdBorder}`, background: idx % 2 === 0 ? "transparent" : rowOdd, transition: "background 0.12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : rowOdd)}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `1px solid ${divider}`, flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 12, color: textMuted }}>
                  Showing{" "}
                  <strong style={{ color: textPrimary }}>{table.getState().pagination.pageIndex * 10 + 1}</strong>
                  {" – "}
                  <strong style={{ color: textPrimary }}>{Math.min((table.getState().pagination.pageIndex + 1) * 10, agents.length)}</strong>
                  {" of "}<strong style={{ color: textPrimary }}>{agents.length}</strong>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {[
                    { action: () => table.setPageIndex(0), icon: <ChevronsLeft size={13} />, disabled: !table.getCanPreviousPage() },
                    { action: () => table.previousPage(),  icon: <ChevronLeft  size={13} />, disabled: !table.getCanPreviousPage() },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${paginBtnBorder}`, background: paginBtnBg, cursor: btn.disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary, opacity: btn.disabled ? 0.35 : 1 }}>
                      {btn.icon}
                    </button>
                  ))}
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: paginActiveBg, color: accentMain, fontSize: 12, fontWeight: 700 }}>
                    {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                  </span>
                  {[
                    { action: () => table.nextPage(),                              icon: <ChevronRight  size={13} />, disabled: !table.getCanNextPage() },
                    { action: () => table.setPageIndex(table.getPageCount() - 1), icon: <ChevronsRight size={13} />, disabled: !table.getCanNextPage() },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${paginBtnBorder}`, background: paginBtnBg, cursor: btn.disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary, opacity: btn.disabled ? 0.35 : 1 }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Modal ── */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={() => setShowModal(false)} style={{ position: "absolute", inset: 0, background: modalOverlay, backdropFilter: "blur(4px)" }} />

              <motion.div
                initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 340 }}
                style={{ ...card, position: "relative", zIndex: 1, width: "94%", maxWidth: 720, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

                {/* Modal Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${divider}`, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={16} color={accentMain} />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: textPrimary }}>
                      {isEditMode ? "Edit Agent" : "Add New Agent"}
                    </span>
                  </div>
                  <button onClick={() => setShowModal(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: closeBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} color={textSecondary} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
                  <form onSubmit={handleSubmit}>

                    {/* Basic fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                      {[
                        { label: "Full Name *",                              key: "name",        type: "text",     placeholder: "John Smith" },
                        { label: "Email *",                                  key: "email",       type: "email",    placeholder: "john@company.com" },
                        { label: isEditMode ? "New Password" : "Password *", key: "password",   type: "password", placeholder: "••••••••" },
                        { label: "Phone Number",                             key: "phoneNumber", type: "tel",      placeholder: "+1 555 000 0000" },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label style={labelStyle}>{label}</label>
                          <input type={type} value={form[key]}
                            required={key === "name" || key === "email" || (key === "password" && !isEditMode)}
                            placeholder={placeholder}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                            onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                          />
                        </div>
                      ))}
                      <div>
                        <label style={labelStyle}>Assign Role</label>
                        <Select
                          options={roles.map((r) => ({ value: r.id, label: r.name }))}
                          value={form.roleId ? { value: form.roleId, label: roles.find((r) => r.id === form.roleId)?.name || "" } : null}
                          onChange={(opt) => handleRoleChange(opt?.value ?? null)}
                          styles={selectStyles} isClearable isSearchable
                          placeholder="Select role…" menuPortalTarget={document.body} menuPosition="fixed"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Assign Team</label>
                        <Select
                          options={teams.map((t) => ({ value: t.id, label: t.name }))}
                          value={form.teamId ? { value: form.teamId, label: teams.find((t) => t.id === form.teamId)?.name || "" } : null}
                          onChange={(opt) => setForm((f) => ({ ...f, teamId: opt?.value ?? null }))}
                          styles={selectStyles} isClearable isSearchable
                          placeholder="Select team (optional)…" menuPortalTarget={document.body} menuPosition="fixed"
                        />
                      </div>
                    </div>

                    {/* Privileges — shown when role is selected */}
                    {form.roleId && (
                      <div>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: isDark ? "rgba(124,124,240,0.07)" : "rgba(91,91,214,0.05)", border: `1px solid ${isDark ? "rgba(124,124,240,0.14)" : "rgba(91,91,214,0.12)"}` }}>
                          <Shield size={14} color={accentMain} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: accentMain, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            Role Privileges
                          </span>
                          <span style={{ fontSize: 11.5, color: textMuted, marginLeft: "auto" }}>
                            {Object.values(form.privileges).filter(v => v === true).length} enabled
                          </span>
                        </div>

                        {/* Groups */}
                        {privGroups.map((group, gIdx) => (
                          <div key={group.title} style={{ marginBottom: gIdx < privGroups.length - 1 ? 20 : 0 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: subLabelClr, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 }}>
                              {group.title}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 7 }}>
                              {group.items.map(({ key, label }) => (
                                <PrivPill key={key} label={label} checked={!!form.privileges[key]} isDark={isDark} />
                              ))}
                            </div>
                            {gIdx < privGroups.length - 1 && (
                              <div style={{ height: 1, background: sectionDivider, marginTop: 16 }} />
                            )}
                          </div>
                        ))}

                        {/* Conditional IP field */}
                        {form.privileges.loginIp && (
                          <div style={{ marginTop: 14 }}>
                            <label style={labelStyle}>Allowed IP / CIDR *</label>
                            <input type="text" value={form.privileges.loginIpAddress || ""} placeholder="192.168.1.0/24"
                              onChange={(e) => setForm((f) => ({ ...f, privileges: { ...f.privileges, loginIpAddress: e.target.value } }))}
                              style={inputStyle}
                              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* SMTP — shown when emailPrivilege is true */}
                    {form.privileges.emailPrivilege && (
                      <div style={{ marginTop: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <Mail size={13} color={accentMain} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: sectionLabelClr, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            SMTP Configuration
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          {[
                            { key: "host",      label: "SMTP Host",  placeholder: "smtp.gmail.com",   type: "text" },
                            { key: "port",      label: "SMTP Port",  placeholder: "465",              type: "number" },
                            { key: "username",  label: "Username",   placeholder: "user@gmail.com",   type: "text" },
                            { key: "password",  label: "Password",   placeholder: "••••••••",         type: "password" },
                            { key: "fromName",  label: "From Name",  placeholder: "Acme Support",     type: "text" },
                            { key: "fromEmail", label: "From Email", placeholder: "support@acme.com", type: "email" },
                          ].map(({ key, label, placeholder, type }) => (
                            <div key={key}>
                              <label style={labelStyle}>{label} *</label>
                              <input type={type} value={form.smtp[key] || ""} placeholder={placeholder}
                                required={form.privileges.emailPrivilege}
                                onChange={(e) => setForm((f) => ({ ...f, smtp: { ...f.smtp, [key]: e.target.value } }))}
                                style={inputStyle}
                                onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                              />
                            </div>
                          ))}
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: smtpLabelBg, border: `1px solid ${smtpLabelBord}` }}>
                              <input type="checkbox" checked={form.smtp.secure}
                                onChange={() => setForm((f) => ({ ...f, smtp: { ...f.smtp, secure: !f.smtp.secure } }))}
                                style={{ width: 16, height: 16, accentColor: checkboxAccent }}
                              />
                              <span style={{ fontSize: 13, color: textPrimary }}>Use Secure Connection (SSL/TLS — port 465)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: "14px 22px", borderTop: `1px solid ${divider}`, background: modalFooterBg, flexShrink: 0, display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${cancelBtnBord}`, background: cancelBtnBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmit}
                    style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)" }}>
                    <Check size={14} /> {isEditMode ? "Update Agent" : "Create Agent"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}