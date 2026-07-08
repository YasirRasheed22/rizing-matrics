// pages/admin/Contacts.tsx
// @ts-nocheck
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { AddContactModal } from "../../components/AddContactModal";
import { EditContactModal } from "../../components/EditContactModal";
import { DeleteContactModal } from "../../components/DeleteContactModal";
import {
  UserPlus, Search, Users, Building2, Phone, Info,
  Pencil, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api";
import ContactDetailPanel from "../../components/ContactDetailPanel";
import { Toaster, toast } from "react-hot-toast";

const PAGE_SIZE_GRID  = 24;
const PAGE_SIZE_TABLE = 20;
const VIEW_KEY = "contacts_view_mode";

const getInitials = (first: string, last: string) =>
  `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "U";

const stringToHue = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
};

// ─── Pagination Component ────────────────────────────────
function Pagination({ page, totalPages, total, limit, onPage, isDark }: {
  page: number; totalPages: number; total: number; limit: number;
  onPage: (p: number) => void; isDark: boolean;
}) {
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)";
  const textMuted  = isDark ? "#68687A" : "#9E9EAD";
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const btnBg      = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const btnBorder  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const disabledColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  if (totalPages <= 1) return null;

  // Build page numbers with ellipsis
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    minWidth: 34, height: 34, borderRadius: 9, border: `1px solid ${active ? accentMain : btnBorder}`,
    background: active ? accentBg : btnBg,
    color: disabled ? disabledColor : active ? accentMain : textPrimary,
    fontSize: 13, fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s", padding: "0 6px",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginTop: 20, flexWrap: "wrap", gap: 10,
    }}>
      <span style={{ fontSize: 12.5, color: textMuted }}>
        Showing <b style={{ color: textPrimary }}>{from}–{to}</b> of <b style={{ color: textPrimary }}>{total}</b> contacts
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Prev */}
        <motion.button
          whileTap={page > 1 ? { scale: 0.93 } : {}}
          disabled={page === 1}
          onClick={() => page > 1 && onPage(page - 1)}
          style={btnStyle(false, page === 1)}
        >
          <ChevronLeft size={15} />
        </motion.button>

        {/* Page numbers */}
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: textMuted, padding: "0 2px" }}>…</span>
          ) : (
            <motion.button
              key={p}
              whileTap={{ scale: 0.93 }}
              onClick={() => onPage(p as number)}
              style={btnStyle(page === p)}
            >
              {p}
            </motion.button>
          )
        )}

        {/* Next */}
        <motion.button
          whileTap={page < totalPages ? { scale: 0.93 } : {}}
          disabled={page === totalPages}
          onClick={() => page < totalPages && onPage(page + 1)}
          style={btnStyle(false, page === totalPages)}
        >
          <ChevronRight size={15} />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Action Button ───────────────────────────────────────
function ActionBtn({ onClick, title, icon: Icon, bg, color, disabled = false }: any) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 9, border: "none",
        background: disabled ? "rgba(128,128,128,0.08)" : bg,
        color: disabled ? "#C8C8D4" : color,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={14} />
    </motion.button>
  );
}

// ─── View Toggle ─────────────────────────────────────────
function ViewToggle({ view, onChange, isDark }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      borderRadius: 10, padding: 3,
    }}>
      {(["grid", "table"] as const).map((v) => {
        const active = view === v;
        const Icon = v === "grid" ? LayoutGrid : List;
        return (
          <motion.button
            key={v}
            onClick={() => onChange(v)}
            whileTap={{ scale: 0.93 }}
            title={v === "grid" ? "Grid view" : "Table view"}
            style={{
              width: 32, height: 32, border: "none", borderRadius: 8,
              background: active ? isDark ? "rgba(124,124,240,0.20)" : "#fff" : "transparent",
              boxShadow: active && !isDark ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
              color: active ? isDark ? "#7C7CF0" : "#5B5BD6" : isDark ? "#68687A" : "#9E9EAD",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.18s",
            }}
          >
            <Icon size={14} />
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────
function TableView({ contacts, user, canEditContact, canDeleteContact, onView, onEdit, onDelete, isDark, pagination, onPage }: any) {
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted     = isDark ? "#68687A" : "#9E9EAD";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)" : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const tableHeaderBg = isDark ? "rgba(124,124,240,0.06)" : "rgba(91,91,214,0.04)";
  const divider       = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const rowHover      = isDark ? "rgba(124,124,240,0.05)" : "rgba(91,91,214,0.03)";
  const accentMain    = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";

  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => {
      let va = "", vb = "";
      if (sortCol === "name") {
        va = `${a.firstName} ${a.lastName || ""}`.toLowerCase();
        vb = `${b.firstName} ${b.lastName || ""}`.toLowerCase();
      } else if (sortCol === "company") {
        va = (a.company || "").toLowerCase();
        vb = (b.company || "").toLowerCase();
      } else if (sortCol === "phone") {
        va = a.phones?.[0]?.numberE164 || "";
        vb = b.phones?.[0]?.numberE164 || "";
      } else if (sortCol === "addedBy") {
        va = (a.addedBy?.id === user?.id ? "You" : a.addedBy?.name || "").toLowerCase();
        vb = (b.addedBy?.id === user?.id ? "You" : b.addedBy?.name || "").toLowerCase();
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [contacts, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 700,
    color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase",
    textAlign: "left", userSelect: "none", cursor: "pointer",
    whiteSpace: "nowrap", background: tableHeaderBg,
    borderBottom: `1px solid ${divider}`,
  };

  const SortIndicator = ({ col }: { col: string }) => (
    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.25, fontSize: 10, color: sortCol === col ? accentMain : "inherit" }}>
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div>
      <div style={{
        background: cardBg, backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderRadius: 18, border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow, overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => toggleSort("name")}>Name <SortIndicator col="name" /></th>
                <th style={thStyle} onClick={() => toggleSort("company")}>Company <SortIndicator col="company" /></th>
                <th style={thStyle} onClick={() => toggleSort("phone")}>Phone <SortIndicator col="phone" /></th>
                <th style={thStyle} onClick={() => toggleSort("addedBy")}>Added By <SortIndicator col="addedBy" /></th>
                <th style={{ ...thStyle, cursor: "default", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sorted.map((contact: any, idx: number) => {
                  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown";
                  const phone    = contact.phones?.[0]?.numberE164 || "—";
                  const initials = getInitials(contact.firstName, contact.lastName);
                  const hue      = stringToHue(fullName + (contact.email || ""));
                  const addedBy  = contact.addedBy?.id === user?.id ? "You" : contact.addedBy?.name || "Unknown";
                  const avatarBg = isDark ? `hsl(${hue}, 40%, 22%)` : `hsl(${hue}, 60%, 92%)`;
                  const avatarCl = isDark ? `hsl(${hue}, 70%, 65%)` : `hsl(${hue}, 60%, 40%)`;

                  return (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.012 }}
                      style={{ borderBottom: `1px solid ${divider}`, transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: avatarBg, color: avatarCl,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800,
                          }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{fullName}</div>
                            {contact.title && <div style={{ fontSize: 11, color: textMuted }}>{contact.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {contact.company ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Building2 size={11} style={{ color: textMuted }} />
                            <span style={{ fontSize: 12.5, color: textSecondary }}>{contact.company}</span>
                          </div>
                        ) : <span style={{ fontSize: 12, color: isDark ? "#3A3A4A" : "#BBBBC8" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Phone size={11} style={{ color: textMuted }} />
                          <span style={{ fontSize: 12.5, color: textSecondary, fontFamily: "monospace" }}>{phone}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontSize: 11.5, fontWeight: 600,
                          color: addedBy === "You" ? accentMain : textSecondary,
                          background: addedBy === "You" ? accentBg : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                          padding: "2px 8px", borderRadius: 99,
                        }}>{addedBy}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                          <ActionBtn onClick={() => onView(contact)} title="View details" icon={Info} bg="rgba(139,92,246,0.12)" color="#8B5CF6" />
                          {canEditContact && <ActionBtn onClick={() => onEdit(contact)} title="Edit" icon={Pencil} bg="rgba(6,182,212,0.12)" color="#06B6D4" />}
                          {canDeleteContact && <ActionBtn onClick={() => onDelete(contact)} title="Delete" icon={Trash2} bg="rgba(239,68,68,0.12)" color="#EF4444" />}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: textMuted, fontSize: 13 }}>
              No contacts match your search.
            </div>
          )}
        </div>

        {/* Table footer count */}
        <div style={{
          padding: "9px 16px", borderTop: `1px solid ${divider}`,
          fontSize: 11.5, color: isDark ? "#3A3A4A" : "#BBBBC8", fontWeight: 500,
        }}>
          {pagination.total} total contact{pagination.total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPage={onPage}
        isDark={isDark}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function Contacts() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const canEditContact   = user?.role === "ADMIN" || user?.additionalRole?.canEditContact === true;
  const canDeleteContact = user?.role === "ADMIN" || user?.additionalRole?.canDeleteContact === true;

  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted     = isDark ? "#68687A" : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)" : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg     = isDark ? "rgba(23,23,31,0.90)" : "rgba(255,255,255,0.90)";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const divider     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const dividerCount = isDark ? "#3A3A4A" : "#BBBBC8";

  const card: React.CSSProperties = {
    background: cardBg, backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
  };

  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    try { const s = localStorage.getItem(VIEW_KEY); return s === "table" ? "table" : "grid"; }
    catch { return "grid"; }
  });

  const [contacts, setContacts]   = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: PAGE_SIZE_GRID, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
  });
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // grid lazy load

  // Grid lazy loading — accumulate contacts
  const [gridContacts, setGridContacts]   = useState<any[]>([]);
  const [gridPage, setGridPage]           = useState(1);
  const [gridHasMore, setGridHasMore]     = useState(false);
  const [gridTotal, setGridTotal]         = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [openModal, setOpenModal]         = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [editContact, setEditContact]     = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteContact, setDeleteContact] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Debounced search ──────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch for TABLE view ──────────────────────────────
  const fetchTableContacts = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get("/voice/all/contacts", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: PAGE_SIZE_TABLE, search: debouncedSearch },
      });
      setContacts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch]);

  // ── Fetch for GRID view (page 1 = reset, page N = append) ──
  const fetchGridContacts = useCallback(async (page: number, reset = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get("/voice/all/contacts", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: PAGE_SIZE_GRID, search: debouncedSearch },
      });
      const newContacts = res.data.data;
      setGridContacts(prev => reset || page === 1 ? newContacts : [...prev, ...newContacts]);
      setGridPage(page);
      setGridHasMore(res.data.pagination.hasNext);
      setGridTotal(res.data.pagination.total);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, debouncedSearch]);

  // ── On view change or search change — reset ───────────
  useEffect(() => {
    if (viewMode === "table") {
      fetchTableContacts(1);
    } else {
      setGridContacts([]);
      setGridPage(1);
      fetchGridContacts(1, true);
    }
  }, [viewMode, debouncedSearch]);

  // ── IntersectionObserver for grid lazy load ───────────
  useEffect(() => {
    if (viewMode !== "grid") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && gridHasMore && !loadingMore) {
          fetchGridContacts(gridPage + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [viewMode, gridHasMore, loadingMore, gridPage, fetchGridContacts]);

  const handleViewChange = (v: "grid" | "table") => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };

  // ── Group grid contacts alphabetically ────────────────
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    gridContacts.forEach(c => {
      const letter = c.firstName?.[0]?.toUpperCase() || "#";
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    });
    return Object.keys(map).sort().map(letter => ({ letter, contacts: map[letter] }));
  }, [gridContacts]);

  // ── Handlers ──────────────────────────────────────────
  const handleAddContact = async (data: any) => {
    try {
      await api.post("/contacts", {
        firstName: data.firstName, lastName: data.lastName,
        nickName: data.nickName, company: data.company, title: data.title,
        email: data.email || null, source: data.source,
        birthdate: data.birthdate || null, website: data.website || null,
        notes: data.notes || null,
        addresses: data.addresses?.map((a: any) => ({
          address: a.address, city: a.city, state: a.state, zip: a.zip, label: a.label,
        })),
        phones: data.phones.map((p: any) => ({ numberE164: p.number, label: p.type, isPrimary: false })),
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (viewMode === "table") fetchTableContacts(1);
      else { setGridContacts([]); fetchGridContacts(1, true); }
      setOpenModal(false);
      toast.success("Contact added!");
    } catch { toast.error("Failed to add contact"); }
  };

  const handleEditContact = async (data: any) => {
    if (!editContact) return;
    try {
      await api.put(`/contacts/${editContact.id}`, {
        firstName: data.firstName, lastName: data.lastName, nickName: data.nickName,
        company: data.company, title: data.title, email: data.email || null,
        source: data.source, birthdate: data.birthdate || null,
        website: data.website || null, notes: data.notes || null,
        addresses: data.addresses?.map((a: any) => ({
          address: a.address, city: a.city, state: a.state, zip: a.zip, label: a.label,
        })),
        phones: data.phones.map((p: any) => ({ numberE164: p.number, label: p.type, isPrimary: false })),
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (viewMode === "table") fetchTableContacts(pagination.page);
      else fetchGridContacts(1, true);
      setEditModalOpen(false);
      setEditContact(null);
      toast.success("Contact updated!");
    } catch { toast.error("Failed to update contact"); }
  };

  const handleDeleteContact = async () => {
    if (!deleteContact) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/contacts/${deleteContact.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (viewMode === "table") fetchTableContacts(pagination.page);
      else fetchGridContacts(1, true);
      setDeleteModalOpen(false);
      setDeleteContact(null);
      toast.success("Contact deleted!");
    } catch { toast.error("Failed to delete contact"); }
    finally { setDeleteLoading(false); }
  };

  const totalCount = viewMode === "table" ? pagination.total : gridTotal;
  const isEmpty = viewMode === "table" ? contacts.length === 0 : gridContacts.length === 0;

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: accentBg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
                All Contacts
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
                {totalCount} contact{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ViewToggle view={viewMode} onChange={handleViewChange} isDark={isDark} />
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setOpenModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 10, border: "none",
                background: accentMain, color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.30)",
              }}
            >
              <UserPlus size={15} /> Add Contact
            </motion.button>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative", marginBottom: 24, maxWidth: 420 }}>
          <Search size={14} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: textMuted, pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 13px 9px 34px", borderRadius: 10,
              border: `1px solid ${inputBorder}`, background: inputBg,
              fontSize: 13, color: textPrimary, outline: "none",
              fontFamily: "inherit", transition: "border 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
            onBlur={e => (e.target.style.borderColor = inputBorder)}
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
              borderTopColor: accentMain, animation: "spin 0.7s linear infinite",
            }} />
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Loading contacts...</p>
          </div>

        ) : isEmpty && !loadingMore ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: accentBg,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <UserPlus size={24} color={accentMain} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: "0 0 6px" }}>No contacts found</p>
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
              {search ? "Try a different search term" : "Add your first contact to get started"}
            </p>
          </div>

        ) : viewMode === "table" ? (
          <TableView
            contacts={contacts}
            user={user}
            canEditContact={canEditContact}
            canDeleteContact={canDeleteContact}
            onView={(c: any) => { setSelectedContact(c); setPanelOpen(true); }}
            onEdit={(c: any) => { setEditContact(c); setEditModalOpen(true); }}
            onDelete={(c: any) => { setDeleteContact(c); setDeleteModalOpen(true); }}
            isDark={isDark}
            pagination={pagination}
            onPage={(p: number) => fetchTableContacts(p)}
          />

        ) : (
          /* ══ GRID — Lazy Load ══ */
          <div>
            {grouped.map(({ letter, contacts: group }) => (
              <div key={letter} style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: accentMain,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    background: accentBg, padding: "2px 10px", borderRadius: 99,
                  }}>
                    {letter}
                  </span>
                  <div style={{ flex: 1, height: 1, background: divider }} />
                  <span style={{ fontSize: 11, color: dividerCount, fontWeight: 600 }}>{group.length}</span>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}>
                  <AnimatePresence>
                    {group.map((contact: any, idx: number) => {
                      const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown";
                      const phone    = contact.phones?.[0]?.numberE164 || "No phone";
                      const initials = getInitials(contact.firstName, contact.lastName);
                      const hue      = stringToHue(fullName + (contact.email || ""));
                      const addedBy  = contact.addedBy?.id === user?.id ? "You" : contact.addedBy?.name || "Unknown";
                      const avatarBg = isDark ? `hsl(${hue}, 40%, 22%)` : `hsl(${hue}, 60%, 92%)`;
                      const avatarCl = isDark ? `hsl(${hue}, 70%, 65%)` : `hsl(${hue}, 60%, 40%)`;

                      return (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                          whileHover={{ y: -2, boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.45)" : "0 8px 28px rgba(0,0,0,0.10)" }}
                          style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            background: avatarBg, color: avatarCl,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800,
                          }}>
                            {initials}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {fullName}
                            </div>
                            {contact.company && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                <Building2 size={10} style={{ color: textMuted }} />
                                <span style={{ fontSize: 11.5, color: textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {contact.company}
                                </span>
                              </div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Phone size={10} style={{ color: textMuted }} />
                              <span style={{ fontSize: 11.5, color: textSecondary, fontFamily: "monospace" }}>{phone}</span>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 10.5, color: dividerCount }}>
                              Added by <span style={{ color: textMuted, fontWeight: 600 }}>{addedBy}</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                            <ActionBtn onClick={() => { setSelectedContact(contact); setPanelOpen(true); }} title="View" icon={Info} bg="rgba(139,92,246,0.12)" color="#8B5CF6" />
                            {canEditContact && <ActionBtn onClick={() => { setEditContact(contact); setEditModalOpen(true); }} title="Edit" icon={Pencil} bg="rgba(6,182,212,0.12)" color="#06B6D4" />}
                            {canDeleteContact && <ActionBtn onClick={() => { setDeleteContact(contact); setDeleteModalOpen(true); }} title="Delete" icon={Trash2} bg="rgba(239,68,68,0.12)" color="#EF4444" />}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {/* ── Lazy load trigger ── */}
            <div ref={loaderRef} style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loadingMore && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `2px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
                  borderTopColor: accentMain, animation: "spin 0.7s linear infinite",
                }} />
              )}
              {!gridHasMore && gridContacts.length > 0 && (
                <span style={{ fontSize: 12, color: textMuted }}>
                  All {gridTotal} contacts loaded
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <ContactDetailPanel contact={selectedContact} open={panelOpen} onClose={() => setPanelOpen(false)} />
      <AddContactModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={handleAddContact} />
      <EditContactModal open={editModalOpen} contact={editContact} onClose={() => { setEditModalOpen(false); setEditContact(null); }} onSubmit={handleEditContact} />
      <DeleteContactModal open={deleteModalOpen} contact={deleteContact} loading={deleteLoading} onClose={() => { setDeleteModalOpen(false); setDeleteContact(null); }} onConfirm={handleDeleteContact} />
    </>
  );
}