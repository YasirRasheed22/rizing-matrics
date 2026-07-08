
//@ts-nocheck
import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
}

export default function DataTable<T>({
  columns, data, loading = false, searchPlaceholder = "Search...",
}: DataTableProps<T>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cardBg      = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.92)";
  const cardBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow  = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary    = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted      = isDark ? "#A0A0B0" : "#6B6B7B";
  const inputBg        = isDark ? "rgba(255,255,255,0.05)" : "#F6F7F9";
  const inputBorder    = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const theadBg        = isDark ? "rgba(255,255,255,0.04)" : "rgba(246,247,249,0.80)";
  const rowAltBg       = isDark ? "rgba(255,255,255,0.02)" : "rgba(246,247,249,0.40)";
  const rowHoverBg     = isDark ? "rgba(124,124,240,0.07)" : "rgba(91,91,214,0.04)";
  const rowBorder      = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const toolbarBorder  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const theadBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const accentMain     = isDark ? "#7C7CF0" : "#5B5BD6";
  const paginationBtnBg = isDark ? "rgba(255,255,255,0.07)" : "#F6F7F9";
  const paginationBtnBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";

  const [sorting, setSorting]           = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination]     = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data, columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${paginationBtnBorder}`,
    background: paginationBtnBg,
    cursor: "pointer", transition: "all 0.14s",
    color: textMuted,
  };

  return (
    <div style={{
      background: cardBg,
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderRadius: 18,
      border: `1px solid ${cardBorder}`,
      boxShadow: cardShadow,
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: `1px solid ${toolbarBorder}`,
        gap: 12, flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px", maxWidth: 340 }}>
          <Search size={14} style={{
            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
            color: isDark ? "#6A6A80" : "#9E9EAD", pointerEvents: "none",
          }} />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px 8px 30px", borderRadius: 10,
              border: `1px solid ${inputBorder}`,
              background: inputBg,
              fontSize: 12.5, color: textPrimary, outline: "none", fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(91,91,214,0.40)")}
            onBlur={(e) => (e.target.style.borderColor = inputBorder)}
          />
        </div>

        {/* Page size + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            style={{
              padding: "7px 10px", borderRadius: 9,
              border: `1px solid ${inputBorder}`,
              background: inputBg,
              fontSize: 12, color: textPrimary, outline: "none", fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>Show {s}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: isDark ? "#6A6A80" : "#9E9EAD", whiteSpace: "nowrap" }}>
            {data.length} total
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ background: theadBg, borderBottom: `1px solid ${theadBorder}` }}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: "11px 16px", textAlign: "left", cursor: "pointer",
                      fontSize: 10.5, fontWeight: 700, color: "#9E9EAD",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      whiteSpace: "nowrap", userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span style={{ opacity: 0.5 }}>
                          {header.column.getIsSorted() === "asc"
                            ? <ChevronUp size={13} />
                            : header.column.getIsSorted() === "desc"
                            ? <ChevronDown size={13} />
                            : <ChevronsUpDown size={13} />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{
                    width: 36, height: 36, margin: "0 auto",
                    border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
                    borderTopColor: accentMain,
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }} />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "56px 0", color: "#9E9EAD" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No results found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search or filters</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: `1px solid ${rowBorder}`,
                    background: idx % 2 === 0 ? "transparent" : rowAltBg,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = rowHoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : rowAltBg)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{
                      padding: "11px 16px", fontSize: 13, color: textPrimary,
                      verticalAlign: "middle",
                    }}>
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
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderTop: `1px solid ${toolbarBorder}`,
        flexWrap: "wrap", gap: 10,
      }}>
        <span style={{ fontSize: 12, color: isDark ? "#6A6A80" : "#9E9EAD" }}>
          Showing{" "}
          <strong style={{ color: textPrimary }}>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>
          {" – "}
          <strong style={{ color: textPrimary }}>
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length,
            )}
          </strong>
          {" of "}
          <strong style={{ color: textPrimary }}>{data.length}</strong>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { action: () => table.setPageIndex(0), icon: <ChevronsLeft size={14} />, disabled: !table.getCanPreviousPage() },
            { action: () => table.previousPage(), icon: <ChevronLeft size={14} />, disabled: !table.getCanPreviousPage() },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              disabled={btn.disabled}
              style={{ ...btnBase, opacity: btn.disabled ? 0.35 : 1, cursor: btn.disabled ? "not-allowed" : "pointer" }}
            >
              {btn.icon}
            </button>
          ))}

          <span style={{
            padding: "5px 12px", borderRadius: 8,
            background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)",
            color: accentMain,
            fontSize: 12, fontWeight: 700,
          }}>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>

          {[
            { action: () => table.nextPage(), icon: <ChevronRight size={14} />, disabled: !table.getCanNextPage() },
            { action: () => table.setPageIndex(table.getPageCount() - 1), icon: <ChevronsRight size={14} />, disabled: !table.getCanNextPage() },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              disabled={btn.disabled}
              style={{ ...btnBase, opacity: btn.disabled ? 0.35 : 1, cursor: btn.disabled ? "not-allowed" : "pointer" }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
