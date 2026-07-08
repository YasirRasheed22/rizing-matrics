// src/components/teams/TeamTable.tsx
// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, flexRender,
  createColumnHelper, type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, Users, ChevronRight as ArrowRight, ArrowUpDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface Team {
  id: number | string; name: string; description: string;
  agents: number; queues: number; supervisor: string;
  supervisorId?: number | string; status?: "active" | "inactive" | "archived"; createdAt?: string;
}

interface TeamTableProps {
  teams: Team[]; onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void; onRefresh?: () => void;
  isDark?: boolean;
}

const columnHelper = createColumnHelper<Team>();

const palette = ["#5B5BD6","#7C3AED","#0EA5E9","#10B981","#F59E0B","#EF4444"];
const avatarColor = (name: string) => palette[(name?.charCodeAt(0) ?? 0) % palette.length];

export default function TeamTable({ teams, onEdit, onDelete, onRefresh, isDark: isDarkProp }: TeamTableProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ── Tokens ──
  const textPrimary   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.10)";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"      : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const toolbarBg     = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFC";
  const thBg          = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFC";
  const thBorder      = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const tdBorder      = isDark ? "rgba(255,255,255,0.045)"  : "rgba(0,0,0,0.045)";
  const rowHover      = isDark ? "rgba(124,124,240,0.06)"   : "rgba(91,91,214,0.03)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";
  const paginBg       = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFC";
  const paginBorder   = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const navBtnBg      = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const navBtnBorder  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";
  const emptyColor    = isDark ? "#3A3A4A"                  : "#9E9EAD";
  const supNullColor  = isDark ? "#3A3A4A"                  : "#C4C4CF";
  const arrowColor    = isDark ? "#3A3A4A"                  : "#C4C4CF";
  const sortIconColor = isDark ? "#3A3A4A"                  : "#C4C4CF";

  const thStyle: React.CSSProperties = {
    padding: "11px 16px", fontSize: 11, fontWeight: 800, color: textMuted,
    textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left",
    background: thBg, borderBottom: `1px solid ${thBorder}`,
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", borderBottom: `1px solid ${tdBorder}`,
    fontSize: 13, color: textPrimary,
  };

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Team",
      cell: (info) => {
        const name = info.getValue() as string;
        const color = avatarColor(name);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: isDark ? `${color}22` : `${color}18`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Users size={17} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: textPrimary }}>{name}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: textMuted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {info.row.original.description || "No description"}
              </p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("agents", {
      header: "Agents",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 26, height: 22, borderRadius: 6,
            background: accentBg, color: accentMain,
            fontWeight: 700, fontSize: 12.5, padding: "0 8px",
          }}>
            {info.getValue()}
          </span>
          <span style={{ fontSize: 12, color: textMuted }}>agents</span>
        </div>
      ),
    }),
    columnHelper.accessor("supervisor", {
      header: "Supervisor",
      cell: (info) => {
        const sup = info.getValue() || "—";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {sup !== "—" && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: accentBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: accentMain,
              }}>
                {sup.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 13, color: sup === "—" ? supNullColor : textPrimary, fontWeight: sup === "—" ? 400 : 500 }}>
              {sup}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions", header: "",
      cell: () => (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 4 }}>
          <ArrowRight size={16} color={arrowColor} />
        </div>
      ),
    }),
  ], [isDark, textPrimary, textMuted, accentMain, accentBg]);

  const table = useReactTable({
    data: teams, columns,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting,
    initialState: { pagination: { pageSize: 10 } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize  = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const from = pageIndex * pageSize + 1;
  const to   = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div style={{ background: cardBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, overflow: "hidden" }}>

      {/* Toolbar */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${thBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: toolbarBg }}>
        <div style={{ position: "relative", flex: "0 0 280px" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
          <input type="text" value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search teams…"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 32px", borderRadius: 9, border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13, color: textPrimary, outline: "none", fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
            onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
          />
        </div>
        <span style={{ fontSize: 12.5, color: textMuted, fontWeight: 600 }}>
          {totalRows} team{totalRows !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} style={thStyle} onClick={header.column.getToggleSortingHandler()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowUpDown size={11} color={sortIconColor} />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ ...tdStyle, textAlign: "center", padding: "48px 16px", color: emptyColor, fontSize: 13 }}>
                  No teams match your search
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}
                  style={{ cursor: "pointer", background: hoveredRow === row.id ? rowHover : "transparent", transition: "background 0.12s" }}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => navigate(`/admin/teams/view/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={tdStyle}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalRows > pageSize && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: `1px solid ${paginBorder}`, background: paginBg }}>
          <span style={{ fontSize: 12.5, color: textMuted }}>Showing {from}–{to} of {totalRows}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${navBtnBorder}`, background: navBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed", opacity: table.getCanPreviousPage() ? 1 : 0.38 }}>
              <ChevronLeft size={14} color={textSecondary} />
            </motion.button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: textPrimary, minWidth: 28, textAlign: "center" }}>
              {pageIndex + 1}
            </span>
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${navBtnBorder}`, background: navBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: table.getCanNextPage() ? "pointer" : "not-allowed", opacity: table.getCanNextPage() ? 1 : 0.38 }}>
              <ChevronRight size={14} color={textSecondary} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}