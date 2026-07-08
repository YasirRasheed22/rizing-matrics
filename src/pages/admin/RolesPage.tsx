// src/pages/admin/RolesPage.tsx
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus, UserCheck, Edit2, Trash2, X, Check, Search,
  ChevronLeft, ChevronRight, Globe, Shield, ShieldOff,
} from "lucide-react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";

interface Role {
  id: number; name: string; description?: string; userCount: number;
  makeCall: boolean;teamMessages: boolean; canCallDNC: boolean; showCallDNC: boolean;
  transcription: boolean; transfer: boolean; recording: boolean;
  loginIp: boolean; loginIpAddress?: string; mms: boolean; twoFA: boolean;
  endCallPop: boolean; emailPrivilege: boolean; additionalEmail?: string;
  targetEnable: boolean; targetValue?: string;
  viewDashboard: boolean; viewTeamDashboard: boolean; viewCallLogs: boolean;
  viewContacts: boolean; viewMessages: boolean; viewEmails: boolean;
  viewLeads: boolean; viewSales: boolean; viewKpis: boolean;
  viewAdminDashboard: boolean; manageAgents: boolean; manageTeams: boolean;
  manageNumbers: boolean; manageLeadsAdmin: boolean; viewCallLogsAdmin: boolean;
  viewReports: boolean; manageRoles: boolean; manageBilling: boolean;
  changePassword: boolean; editProfile: boolean; viewCompanyContacts: boolean;
  composeEmail: boolean;
  canMakeChatGroup: boolean;
  canEditContact: boolean;
  canDeleteContact: boolean;
  liveCallsAccess: boolean;
  accessDisposition:boolean;
  accessAutoDialAdmin:boolean;
  teamCallss:boolean;
  manageScripts: boolean;
  viewScript: boolean;
  smsTemplates: boolean;
}

const EMPTY_FORM = {
  name: "", description: "",
  privileges: {
    makeCall: false, teamMessages:false,canCallDNC: false, showCallDNC: false,
    transcription: false, transfer: false, recording: false,
    loginIp: false, loginIpAddress: "", mms: false, twoFA: false,
    endCallPop: false, emailPrivilege: false, additionalEmail: "",
    targetEnable: false, targetValue: "",
    viewDashboard: false, viewTeamDashboard: false, viewCallLogs: false,
    viewContacts: false, viewMessages: false, viewEmails: false,
    viewLeads: false, viewSales: false, viewKpis: false,
    viewAdminDashboard: false, manageAgents: false, manageTeams: false,
    manageNumbers: false, manageLeadsAdmin: false, viewCallLogsAdmin: false,
    viewReports: false, manageRoles: false, manageBilling: false,
    changePassword: false, editProfile: false, viewCompanyContacts: false,
    composeEmail: false,
    canMakeChatGroup: false,
    canEditContact: false,
    canDeleteContact: false,
    liveCallsAccess: false,
    accessDisposition:false,
  accessAutoDialAdmin:false,
  teamCalls:false,
  manageScripts: false,
  viewScript: false,
  smsTemplates: false,
  },
};

/* ─── Toggle ─────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 99, cursor: "pointer",
      background: checked ? "#5B5BD6" : "rgba(0,0,0,0.12)",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 2,
        left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
      }} />
    </div>
  );
}

const columnHelper = createColumnHelper<Role>();

export default function RolesPage() {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Design tokens (same pattern as Contact.tsx) ── */
  const pageBg          = isDark ? "#0F0F14"                        : "#F6F7F9";
  const cardBg          = isDark ? "rgba(23,23,31,0.95)"            : "rgba(255,255,255,0.92)";
  const cardBorder      = isDark ? "rgba(255,255,255,0.07)"         : "rgba(255,255,255,0.60)";
  const cardShadow      = isDark ? "0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.04)"
                                 : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary     = isDark ? "#F0F0F5"                        : "#0D0D12";
  const textSecondary   = isDark ? "#A0A0B0"                        : "#6B6B7B";
  const textMuted       = isDark ? "#68687A"                        : "#9E9EAD";
  const accentMain      = isDark ? "#7C7CF0"                        : "#5B5BD6";
  const accentBg        = isDark ? "rgba(124,124,240,0.12)"         : "rgba(91,91,214,0.10)";
  const accentBgSoft    = isDark ? "rgba(124,124,240,0.08)"         : "rgba(91,91,214,0.08)";
  const inputBg         = isDark ? "rgba(30,30,40,0.90)"            : "#F6F7F9";
  const inputBorder     = isDark ? "rgba(255,255,255,0.09)"         : "rgba(0,0,0,0.10)";
  const inputFocusBorder= isDark ? "rgba(124,124,240,0.45)"         : "rgba(91,91,214,0.40)";
  const tableBgAlt      = isDark ? "rgba(255,255,255,0.02)"         : "rgba(246,247,249,0.40)";
  const tableHoverBg    = isDark ? "rgba(124,124,240,0.06)"         : "rgba(91,91,214,0.04)";
  const theadBg         = isDark ? "rgba(255,255,255,0.03)"         : "rgba(246,247,249,0.80)";
  const dividerColor    = isDark ? "rgba(255,255,255,0.06)"         : "rgba(0,0,0,0.06)";
  const borderColor     = isDark ? "rgba(255,255,255,0.07)"         : "rgba(0,0,0,0.07)";
  const footerBg        = isDark ? "rgba(15,15,20,0.80)"            : "rgba(246,247,249,0.80)";
  const paginBtnBg      = isDark ? "rgba(30,30,40,0.90)"            : "#F6F7F9";
  const paginBtnBorder  = isDark ? "rgba(255,255,255,0.09)"         : "rgba(0,0,0,0.08)";
  const modalBackdrop   = isDark ? "rgba(0,0,0,0.65)"               : "rgba(0,0,0,0.45)";
  const pillCheckedBg   = isDark ? "rgba(124,124,240,0.12)"         : "rgba(91,91,214,0.07)";
  const pillCheckedBorder = isDark ? "rgba(124,124,240,0.30)"       : "rgba(91,91,214,0.25)";
  const pillUncheckedBg = isDark ? "rgba(30,30,40,0.90)"            : "#F6F7F9";
  const pillUncheckedBorder = isDark ? "rgba(255,255,255,0.07)"     : "rgba(0,0,0,0.07)";
  const sectionDividerColor = isDark ? "rgba(255,255,255,0.05)"     : "rgba(0,0,0,0.06)";
  const deleteBtnBg     = isDark ? "rgba(208,40,26,0.15)"           : "rgba(208,40,26,0.10)";
  const editBtnBg       = isDark ? "rgba(124,124,240,0.15)"         : "rgba(91,91,214,0.10)";

  /* ─── CheckPill (uses tokens from closure) ─── */
  function CheckPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
      <motion.label
        whileHover={{ scale: 1.01 }}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
          borderRadius: 10, cursor: "pointer",
          background: checked ? pillCheckedBg : pillUncheckedBg,
          border: `1px solid ${checked ? pillCheckedBorder : pillUncheckedBorder}`,
          transition: "all 0.15s",
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: checked ? accentMain : "transparent",
          border: `2px solid ${checked ? accentMain : (isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.20)")}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }} onClick={onChange}>
          {checked && <Check size={11} color="#fff" />}
        </div>
        <span style={{ fontSize: 12.5, color: textPrimary, fontWeight: checked ? 600 : 400 }}>{label}</span>
      </motion.label>
    );
  }

  /* ─── State ─── */
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal]   = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchRoles = async () => {
    try {
      const res = await api.get("/auth/roles/all");
      setRoles(res.data || []);
    } catch { toast.error("Failed to load roles"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const openAddModal = () => {
    setIsEditMode(false); setEditingRole(null);
    setForm(EMPTY_FORM); setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setIsEditMode(true); setEditingRole(role);
    setForm({
      name: role.name, description: role.description || "",
      privileges: {
        makeCall: role.makeCall ?? false, teamMessages: role?.teamMessages ?? false , canCallDNC: role.canCallDNC ?? false,
        showCallDNC: role.showCallDNC ?? false, transcription: role.transcription ?? false,
        transfer: role.transfer ?? false, recording: role.recording ?? false,
        loginIp: role.loginIp ?? false, loginIpAddress: role.loginIpAddress || "",
        mms: role.mms ?? false, twoFA: role.twoFA ?? false,
        endCallPop: role.endCallPop ?? false, emailPrivilege: role.emailPrivilege ?? false,
        additionalEmail: role.additionalEmail || "", targetEnable: role.targetEnable ?? false,
        targetValue: role.targetValue || "",
        viewDashboard: role.viewDashboard ?? false, viewTeamDashboard: role.viewTeamDashboard ?? false,
        viewCallLogs: role.viewCallLogs ?? false, viewContacts: role.viewContacts ?? false,
        viewMessages: role.viewMessages ?? false, viewEmails: role.viewEmails ?? false,
        viewLeads: role.viewLeads ?? false, viewSales: role.viewSales ?? false,
        viewKpis: role.viewKpis ?? false, viewAdminDashboard: role.viewAdminDashboard ?? false,
        manageAgents: role.manageAgents ?? false, manageTeams: role.manageTeams ?? false,
        manageNumbers: role.manageNumbers ?? false, manageLeadsAdmin: role.manageLeadsAdmin ?? false,
        viewCallLogsAdmin: role.viewCallLogsAdmin ?? false, viewReports: role.viewReports ?? false,
        manageRoles: role.manageRoles ?? false, manageBilling: role.manageBilling ?? false,
        changePassword: role.changePassword ?? false, editProfile: role.editProfile ?? false,
        viewCompanyContacts: role.viewCompanyContacts ?? false,
        composeEmail: role.composeEmail ?? false,
        canMakeChatGroup: role.canMakeChatGroup ?? false,
        canEditContact: role.canEditContact ?? false,
        canDeleteContact: role.canDeleteContact ?? false,
        liveCallsAccess: role?.liveCallsAccess ?? false,
        accessDisposition:role?.accessDisposition ?? false,
         accessAutoDialAdmin:role?.accessAutoDialAdmin ?? false,
        teamCalls:role?.teamCalls ?? false,
        manageScripts: role?.manageScripts ?? false,
        viewScript:    role?.viewScript    ?? false,
        smsTemplates:  role?.smsTemplates  ?? false,
      },
    });
    setShowModal(true);
  };

  const togglePriv = (key: string) =>
    setForm((f) => ({ ...f, privileges: { ...f.privileges, [key]: !f.privileges[key] } }));
  const setPrivField = (key: string, val: string) =>
    setForm((f) => ({ ...f, privileges: { ...f.privileges, [key]: val } }));

  const selectAll = () => setForm((f) => ({
    ...f, privileges: {
      ...f.privileges,
      makeCall: true, canCallDNC: true, showCallDNC: true, transcription: true,
      transfer: true, recording: true, loginIp: true, mms: true, twoFA: true,
      endCallPop: true, emailPrivilege: true, targetEnable: true,
      viewDashboard: true, viewTeamDashboard: true, viewCallLogs: true,
      viewContacts: true, viewMessages: true, viewEmails: true, viewLeads: true,
      viewSales: true, viewKpis: true, viewAdminDashboard: true, manageAgents: true,
      manageTeams: true, manageNumbers: true, manageLeadsAdmin: true,
      viewCallLogsAdmin: true, viewReports: true, manageRoles: true, manageBilling: true,
      changePassword: true, editProfile: true, viewCompanyContacts: true,
      composeEmail: true, canMakeChatGroup: true, canEditContact: true, canDeleteContact: true,liveCallsAccess:true,accessAutoDialAdmin:true,accessDisposition:true,
      teamMessages: true,
      teamCalls: true,
      manageScripts: true,
      viewScript: true,
      smsTemplates: true,
    },
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Role name is required"); return; }
    const { privileges } = form;
    if (privileges.loginIp && !privileges.loginIpAddress?.trim()) { toast.error("IP Address required"); return; }
    if (privileges.emailPrivilege && !privileges.additionalEmail?.trim()) { toast.error("Email required"); return; }
    if (privileges.targetEnable && !privileges.targetValue?.trim()) { toast.error("Target value required"); return; }
    try {
      if (isEditMode && editingRole) {
        await api.put(`/auth/roles/update/${editingRole.id}`, { name: form.name, description: form.description, privileges });
        toast.success("Role updated");
      } else {
        await api.post("/auth/roles/create", { name: form.name, description: form.description, privileges });
        toast.success("Role created");
      }
      setShowModal(false); fetchRoles();
    } catch (err: any) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Delete "${role.name}"?`)) return;
    try {
      await api.delete(`/auth/roles/delete/${role.id}`);
      toast.success("Role deleted");
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch { toast.error("Failed to delete role"); }
  };

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Role Name",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={15} color={accentMain} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary }}>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => <span style={{ fontSize: 13, color: textSecondary }}>{info.getValue() || "—"}</span>,
    }),
    columnHelper.accessor("userCount", {
      header: "Users",
      cell: (info) => (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 99, fontSize: 12,
          fontWeight: 700, background: accentBgSoft, color: accentMain,
        }}>
          <UserCheck size={11} /> {info.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            onClick={() => openEditModal(info.row.original)}
            style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: editBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit2 size={13} color={accentMain} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
            onClick={() => handleDelete(info.row.original)}
            style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: deleteBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={13} color="#D0281A" />
          </motion.button>
        </div>
      ),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isDark]);

  const table = useReactTable({
    data: roles, columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
  });

  if (!currentUser.additionalRole?.manageRoles && currentUser.role !== "ADMIN") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', fontFamily: 'Inter, sans-serif', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(229,83,75,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldOff size={24} color='#E5534B' />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#E5534B', margin: 0 }}>Access Denied</p>
      <p style={{ fontSize: 13, color: '#9E9EAD', margin: 0 }}>You need admin privileges to view this page.</p>
    </div>
    );
  }

  /* ── Shared inline styles built from tokens ── */
  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    background: inputBg, fontSize: 13,
    color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: textMuted, marginBottom: 5, letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const thStyle: React.CSSProperties = {
    padding: "11px 16px", textAlign: "left",
    fontSize: 10.5, fontWeight: 700, color: textMuted,
    textTransform: "uppercase", letterSpacing: "0.07em",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
  };

  const sectionLabel = (title: string) => (
    <div style={{
      fontSize: 10.5, fontWeight: 800, color: textMuted,
      textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
    }}>
      {title}
    </div>
  );

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        minHeight: "100vh",
        background: pageBg,
        transition: "background 0.2s",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
                Roles Management
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
                Manage custom roles and their privileges
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAddModal}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: accentMain, color: "#fff", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
              boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.35)",
            }}
          >
            <Plus size={15} /> Add New Role
          </motion.button>
        </div>

        {/* ── Table card ── */}
        <div style={card}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: `1px solid ${borderColor}`,
            gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px", maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
              <input
                type="text"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search roles..."
                style={{ ...inputStyle, paddingLeft: 30 }}
                onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              />
            </div>
            <span style={{ fontSize: 12, color: textMuted }}>
              {roles.length} role{roles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table body */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
                borderTopColor: accentMain,
                animation: "spin 0.7s linear infinite", margin: "0 auto",
              }} />
            </div>
          ) : roles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Shield size={24} color={accentMain} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: "0 0 6px" }}>No roles found</p>
              <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Add your first role to get started</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} style={{ background: theadBg, borderBottom: `1px solid ${borderColor}` }}>
                        {hg.headers.map((header) => (
                          <th key={header.id} style={thStyle} onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, idx) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        style={{
                          borderBottom: `1px solid ${dividerColor}`,
                          background: idx % 2 === 0 ? "transparent" : tableBgAlt,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = tableHoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : tableBgAlt)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} style={{ padding: "13px 16px", fontSize: 13, color: textPrimary, verticalAlign: "middle" }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderTop: `1px solid ${borderColor}`,
                flexWrap: "wrap", gap: 10,
              }}>
                <span style={{ fontSize: 12, color: textMuted }}>
                  Showing{" "}
                  <strong style={{ color: textPrimary }}>{table.getState().pagination.pageIndex * 10 + 1}</strong>
                  {" – "}
                  <strong style={{ color: textPrimary }}>{Math.min((table.getState().pagination.pageIndex + 1) * 10, roles.length)}</strong>
                  {" of "}
                  <strong style={{ color: textPrimary }}>{roles.length}</strong>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {[
                    { action: () => table.previousPage(), icon: <ChevronLeft size={14} />, disabled: !table.getCanPreviousPage() },
                    { action: () => table.nextPage(),     icon: <ChevronRight size={14} />, disabled: !table.getCanNextPage() },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} disabled={btn.disabled}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${paginBtnBorder}`,
                        background: paginBtnBg, cursor: btn.disabled ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: textSecondary, opacity: btn.disabled ? 0.35 : 1,
                      }}>
                      {btn.icon}
                    </button>
                  ))}
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: accentBg, color: accentMain, fontSize: 12, fontWeight: 700 }}>
                    {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Modal ── */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div
                onClick={() => setShowModal(false)}
                style={{ position: "absolute", inset: 0, background: modalBackdrop, backdropFilter: "blur(4px)" }}
              />

              <motion.div
                initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 340 }}
                style={{
                  ...card,
                  position: "relative", zIndex: 1,
                  width: "94%", maxWidth: 700, maxHeight: "90vh",
                  display: "flex", flexDirection: "column",
                }}
              >
                {/* Modal header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "18px 22px", borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={16} color={accentMain} />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: textPrimary }}>
                      {isEditMode ? "Edit Role" : "Add New Role"}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={14} color={textSecondary} />
                  </button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
                  <form onSubmit={handleSubmit}>

                    {/* Name + description */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
                      <div>
                        <label style={labelStyle}>Role Name *</label>
                        <input type="text" value={form.name} required placeholder="e.g. Senior Agent"
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                          onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Description</label>
                        <input type="text" value={form.description} placeholder="Optional description"
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                          onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                        />
                      </div>
                    </div>

                    {/* Privileges header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>Privileges</span>
                      <button type="button" onClick={selectAll}
                        style={{
                          padding: "5px 14px", borderRadius: 8,
                          border: `1px solid ${isDark ? "rgba(124,124,240,0.30)" : "rgba(91,91,214,0.30)"}`,
                          background: accentBg, color: accentMain,
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}>
                        Select All
                      </button>
                    </div>

                    {/* Call & Media */}
                    {sectionLabel("Call & Media")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 18 }}>
                      {[
                        { key: "makeCall",       label: "Make Calls" },
                        { key: "showCallDNC",    label: "Show DNC" },
                        { key: "canCallDNC",     label: "Dial DNC" },
                        { key: "transcription",  label: "Transcription" },
                        { key: "transfer",       label: "Transfer" },
                        { key: "recording",      label: "Recording" },
                        { key: "mms",            label: "MMS" },
                        { key: "endCallPop",     label: "End Call Pop" },
                        { key: "composeEmail",   label: "Compose Email" },
                        { key: "liveCallsAccess",   label: "Listen Live Calls" },
                        
                      ].map(({ key, label }) => (
                        <CheckPill key={key} label={label} checked={!!form.privileges[key]} onChange={() => togglePriv(key)} />
                      ))}
                    </div>

                    {/* Security */}
                    {sectionLabel("Security & Account")}
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 8,
                      marginBottom: form.privileges.loginIp || form.privileges.emailPrivilege || form.privileges.targetEnable ? 10 : 18,
                    }}>
                      {[
                        { key: "loginIp",        label: "Restrict Login by IP" },
                        { key: "twoFA",          label: "Require 2FA" },
                        { key: "emailPrivilege", label: "Email Access" },
                        { key: "targetEnable",   label: "Enable Target" },
                        { key: "changePassword", label: "Change Password" },
                        { key: "editProfile",    label: "Edit Profile" },
                      ].map(({ key, label }) => (
                        <CheckPill key={key} label={label} checked={!!form.privileges[key]} onChange={() => togglePriv(key)} />
                      ))}
                    </div>

                    {form.privileges.loginIp && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Allowed IP / CIDR *</label>
                        <input type="text" value={form.privileges.loginIpAddress} placeholder="192.168.1.0/24"
                          onChange={(e) => setPrivField("loginIpAddress", e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                          onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                        />
                      </div>
                    )}
                    {form.privileges.emailPrivilege && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Allowed Email *</label>
                        <input type="email" value={form.privileges.additionalEmail} placeholder="agent@company.com"
                          onChange={(e) => setPrivField("additionalEmail", e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                          onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                        />
                      </div>
                    )}
                    {form.privileges.targetEnable && (
                      <div style={{ marginBottom: 18 }}>
                        <label style={labelStyle}>Target Value *</label>
                        <input type="text" value={form.privileges.targetValue} placeholder="e.g. 50 calls/day"
                          onChange={(e) => setPrivField("targetValue", e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = inputFocusBorder)}
                          onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                        />
                      </div>
                    )}

                    {/* Agent Dashboard */}
                    {sectionLabel("Agent Dashboard Access")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 18 }}>
                      {[
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
                        { key: "teamMessages",   label: "Team Messages" },
                        { key: "canMakeChatGroup",     label: "Create Team Chat Group" },
                        { key: "teamCalls",     label: "Enable Team Call" },
                      ].map(({ key, label }) => (
                        <CheckPill key={key} label={label} checked={!!form.privileges[key]} onChange={() => togglePriv(key)} />
                      ))}
                    </div>

                    {/* Admin Dashboard */}
                    {sectionLabel("Admin Dashboard Access")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {[
                        { key: "viewAdminDashboard", label: "Admin Dashboard" },
                        { key: "manageAgents",       label: "Manage Agents" },
                        { key: "manageTeams",        label: "Manage Teams" },
                        { key: "manageNumbers",      label: "Phone Numbers" },
                        { key: "manageLeadsAdmin",   label: "Leads (Admin)" },
                        { key: "viewCallLogsAdmin",  label: "Call Logs (Admin)" },
                        { key: "accessAutoDialAdmin",      label: "Auto Dialer Access" },
                        { key: "viewReports",        label: "Reports" },
                        { key: "manageRoles",        label: "Manage Roles" },
                        { key: "manageBilling",      label: "Billing" },
                        { key: "accessDisposition",      label: "Dispositions" },

                      ].map(({ key, label }) => (
                        <CheckPill key={key} label={label} checked={!!form.privileges[key]} onChange={() => togglePriv(key)} />
                      ))}
                    </div>

                    {/* ─── Call Scripts ─── */}
                    {sectionLabel("Call Scripts")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                      {[
                        { key: "manageScripts", label: "Create / Edit / Delete Scripts" },
                        { key: "viewScript",    label: "View Script During Calls" },
                      ].map(({ key, label }) => (
                        <CheckPill key={key} label={label} checked={!!form.privileges[key]} onChange={() => togglePriv(key)} />
                      ))}
                    </div>

                    {/* ─── SMS Templates ─── */}
                    {sectionLabel("SMS Templates")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                      <CheckPill label="Create & Use SMS Templates" checked={!!form.privileges.smsTemplates} onChange={() => togglePriv("smsTemplates")} />
                    </div>

                  </form>
                </div>

                {/* Modal footer */}
                <div style={{
                  padding: "14px 22px",
                  borderTop: `1px solid ${borderColor}`,
                  background: footerBg,
                  flexShrink: 0, display: "flex", gap: 10,
                }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: `1px solid ${inputBorder}`,
                      background: inputBg, color: textSecondary,
                      fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    style={{
                      flex: 2, padding: "10px 0", borderRadius: 10,
                      border: "none", background: accentMain, color: "#fff",
                      fontWeight: 700, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 8, fontFamily: "inherit",
                      boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.35)",
                    }}>
                    <Check size={14} /> {isEditMode ? "Update Role" : "Create Role"}
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