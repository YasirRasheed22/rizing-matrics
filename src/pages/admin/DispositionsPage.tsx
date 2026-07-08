// src/pages/admin/DispositionsPage.tsx
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Tag, Edit2, Trash2, X, Check, Save,
  Search, GripVertical, AlertTriangle, ShieldOff,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api'

/* ─── types ─────────────────────────────────────────── */
interface Disposition {
  id: number
  name: string
  color: string
  status: boolean
  sequence: number
}

/* ─── toggle switch ──────────────────────────────────── */
function Toggle({ checked, onChange, disabled = false, accentMain }: {
  checked: boolean; onChange: () => void; disabled?: boolean; accentMain: string
}) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? accentMain : '#D5D5E0',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 18 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
      }} />
    </div>
  )
}

/* ─── delete confirm toast ───────────────────────────── */
function DeleteToast({ t, name, onConfirm, isDark }: any) {
  const bg          = isDark ? 'rgba(23,23,31,0.98)' : '#fff'
  const border      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#F0F0F5' : '#0D0D12'
  const textSub     = isDark ? '#A0A0B0' : '#6B6B7B'
  const cancelBg    = isDark ? 'rgba(30,30,40,0.90)' : '#F6F7F9'
  const cancelBorder= isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'

  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '16px 18px',
      boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.50)' : '0 16px 48px rgba(0,0,0,0.18)',
      border: `1px solid ${border}`,
      maxWidth: 360, fontFamily: 'Inter, sans-serif',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(229,83,75,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <AlertTriangle size={16} color='#E5534B' />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 700, color: textPrimary }}>Delete "{name}"?</p>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSub }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${cancelBorder}`, background: cancelBg, color: textSub, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { toast.dismiss(t.id); onConfirm() }}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#E5534B', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
            Delete
          </motion.button>
        </div>
      </div>
    </div>
  )
}

/* ─── add / edit modal ───────────────────────────────── */
const FORM_INIT = { name: '', color: '#5B5BD6', status: true }

function DispositionModal({ open, isEdit, initial, onClose, onSubmit, saving, isDark }: any) {
  const [form, setForm] = useState(FORM_INIT)

  /* tokens */
  const modalBg      = isDark ? 'rgba(20,20,28,0.98)'        : 'rgba(255,255,255,0.97)'
  const modalBorder  = isDark ? 'rgba(255,255,255,0.08)'     : 'rgba(255,255,255,0.70)'
  const modalShadow  = isDark ? '0 24px 64px rgba(0,0,0,0.60)' : '0 24px 64px rgba(0,0,0,0.18)'
  const headerBorder = isDark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.07)'
  const textPrimary  = isDark ? '#F0F0F5'                    : '#0D0D12'
  const textSecondary= isDark ? '#A0A0B0'                    : '#6B6B7B'
  const textMuted    = isDark ? '#68687A'                    : '#6B6B7B'
  const accentMain   = isDark ? '#7C7CF0'                    : '#5B5BD6'
  const accentBg     = isDark ? 'rgba(124,124,240,0.12)'     : 'rgba(91,91,214,0.12)'
  const inputBg      = isDark ? 'rgba(30,30,40,0.90)'        : '#F6F7F9'
  const inputBorder  = isDark ? 'rgba(255,255,255,0.09)'     : 'rgba(0,0,0,0.10)'
  const inputFocus   = isDark ? 'rgba(124,124,240,0.45)'     : 'rgba(91,91,214,0.40)'
  const cancelBg     = isDark ? 'rgba(30,30,40,0.90)'        : '#F6F7F9'
  const closeBtnBg   = isDark ? 'rgba(255,255,255,0.08)'     : '#F0F0F5'
  const backdropBg   = isDark ? 'rgba(0,0,0,0.65)'           : 'rgba(13,13,18,0.45)'
  const toggleRowBg  = (s: boolean) => isDark
    ? (s ? 'rgba(124,124,240,0.08)' : 'rgba(30,30,40,0.60)')
    : (s ? 'rgba(91,91,214,0.05)'   : '#F6F7F9')
  const toggleRowBorder = (s: boolean) => isDark
    ? (s ? 'rgba(124,124,240,0.22)' : 'rgba(255,255,255,0.07)')
    : (s ? 'rgba(91,91,214,0.18)'   : 'rgba(0,0,0,0.08)')
  const colorInputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const hexBarBorder     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 13px', borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    background: inputBg, fontSize: 13.5,
    color: textPrimary, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 700,
    color: textMuted, marginBottom: 6, letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  useEffect(() => {
    if (open) setForm(initial ?? FORM_INIT)
  }, [open, initial])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    onSubmit(form)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key='backdrop'
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: backdropBg,
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            key='modal'
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: modalBg,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: 20,
              border: `1px solid ${modalBorder}`,
              boxShadow: modalShadow,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: `1px solid ${headerBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={16} color={accentMain} />
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary }}>
                  {isEdit ? 'Edit Disposition' : 'Add Disposition'}
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={onClose}
                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: closeBtnBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={13} color={textSecondary} />
              </motion.button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Disposition Name *</label>
                  <input
                    type='text' value={form.name} required
                    placeholder='e.g. Interested, Callback, DNC…'
                    onChange={(e) => set('name', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = inputFocus)}
                    onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                  />
                </div>

                {/* Color */}
                <div>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ position: 'relative', width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: `2px solid ${colorInputBorder}`, cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', inset: 0, background: form.color }} />
                      <input
                        type='color' value={form.color}
                        onChange={(e) => set('color', e.target.value)}
                        style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                      />
                    </label>
                    <div style={{ flex: 1, height: 44, borderRadius: 10, background: form.color, boxShadow: `0 4px 14px ${form.color}55`, border: `1px solid ${hexBarBorder}` }} />
                    <input
                      type='text' value={form.color}
                      onChange={(e) => set('color', e.target.value)}
                      style={{ ...inputStyle, width: 96, fontFamily: 'monospace', fontSize: 12.5, padding: '10px 10px' }}
                      onFocus={(e) => (e.target.style.borderColor = inputFocus)}
                      onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                    />
                  </div>
                </div>

                {/* Status toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: toggleRowBg(form.status),
                  border: `1px solid ${toggleRowBorder(form.status)}`,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>Active</span>
                  <Toggle checked={form.status} onChange={() => set('status', !form.status)} accentMain={accentMain} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, padding: '14px 22px 20px', borderTop: `1px solid ${headerBorder}` }}>
                <motion.button type='button' whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${inputBorder}`, background: cancelBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </motion.button>
                <motion.button type='submit' whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  disabled={saving}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 10, border: 'none',
                    background: saving ? (isDark ? '#3A3A5C' : '#BBBBC8') : accentMain,
                    color: '#fff', fontWeight: 700, fontSize: 13,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : (isDark ? '0 2px 10px rgba(124,124,240,0.35)' : '0 2px 10px rgba(91,91,214,0.28)'),
                    fontFamily: 'inherit',
                  }}>
                  {isEdit
                    ? <><Save size={13} />{saving ? 'Saving…' : 'Save Changes'}</>
                    : <><Check size={13} />{saving ? 'Creating…' : 'Create'}</>}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── sortable table row ─────────────────────────────── */
const columnHelper = createColumnHelper<Disposition>()

function SortableRow({ row, children, hovered, onEnter, onLeave, isDark }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.original.id })

  const rowBg = isDragging
    ? (isDark ? 'rgba(124,124,240,0.08)' : 'rgba(91,91,214,0.04)')
    : hovered
    ? (isDark ? 'rgba(124,124,240,0.05)' : 'rgba(91,91,214,0.025)')
    : 'transparent'

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        background: rowBg,
        boxShadow: isDragging ? (isDark ? '0 4px 20px rgba(0,0,0,0.40)' : '0 4px 20px rgba(0,0,0,0.10)') : 'none',
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...attributes}
    >
      <td style={{ padding: '11px 16px', fontSize: 13, color: isDark ? '#4A4A5A' : '#C4C4CF', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.045)'}`, verticalAlign: 'middle', width: 44, cursor: 'grab', paddingRight: 0 }} {...listeners}>
        <GripVertical size={16} />
      </td>
      {children}
    </tr>
  )
}

/* ─── main page ──────────────────────────────────────── */
export default function DispositionsPage() {
  const { user: currentUser } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  /* ── Design tokens ── */
  const cardBg        = isDark ? 'rgba(23,23,31,0.95)'            : 'rgba(255,255,255,0.92)'
  const cardBorder    = isDark ? 'rgba(255,255,255,0.07)'         : 'rgba(255,255,255,0.60)'
  const cardShadow    = isDark ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.04)'
                               : '0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)'
  const textPrimary   = isDark ? '#F0F0F5'                        : '#0D0D12'
  const textSecondary = isDark ? '#A0A0B0'                        : '#6B6B7B'
  const textMuted     = isDark ? '#68687A'                        : '#9E9EAD'
  const accentMain    = isDark ? '#7C7CF0'                        : '#5B5BD6'
  const accentBg      = isDark ? 'rgba(124,124,240,0.12)'         : 'rgba(91,91,214,0.12)'
  const accentBgSoft  = isDark ? 'rgba(124,124,240,0.08)'         : 'rgba(91,91,214,0.08)'
  const accentBgPill  = isDark ? 'rgba(124,124,240,0.12)'         : 'rgba(91,91,214,0.10)'
  const inputBg       = isDark ? 'rgba(20,20,28,0.90)'            : '#fff'
  const inputBorder   = isDark ? 'rgba(255,255,255,0.09)'         : 'rgba(0,0,0,0.09)'
  const inputFocus    = isDark ? 'rgba(124,124,240,0.45)'         : 'rgba(91,91,214,0.40)'
  const theadBg       = isDark ? 'rgba(15,15,20,0.80)'            : '#FAFAFC'
  const theadBorder   = isDark ? 'rgba(255,255,255,0.05)'         : 'rgba(0,0,0,0.06)'
  const tdBorder      = isDark ? 'rgba(255,255,255,0.04)'         : 'rgba(0,0,0,0.045)'
  const toolbarBorder = isDark ? 'rgba(255,255,255,0.05)'         : 'rgba(0,0,0,0.06)'
  const hintBg        = isDark ? 'rgba(15,15,20,0.80)'            : '#FAFAFC'
  const hintBorder    = isDark ? 'rgba(255,255,255,0.05)'         : 'rgba(0,0,0,0.05)'
  const gripColor     = isDark ? '#3A3A5A'                        : '#C4C4CF'
  const monoColor     = isDark ? '#68687A'                        : '#6B6B7B'
  const activeColor   = isDark ? '#34D399'                        : '#059669'
  const swatchBorder  = isDark ? 'rgba(255,255,255,0.08)'         : 'rgba(0,0,0,0.08)'
  const editBtnBg     = isDark ? 'rgba(124,124,240,0.12)'         : 'rgba(91,91,214,0.08)'
  const deleteBtnBg   = isDark ? 'rgba(229,83,75,0.15)'          : 'rgba(229,83,75,0.08)'

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', fontSize: 10.5, fontWeight: 800,
    color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', background: theadBg,
    borderBottom: `1px solid ${theadBorder}`, whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '11px 16px', fontSize: 13,
    color: textPrimary, borderBottom: `1px solid ${tdBorder}`,
    verticalAlign: 'middle',
  }

  const [dispositions, setDispositions]     = useState<Disposition[]>([])
  const [loading, setLoading]               = useState(true)
  const [globalFilter, setGlobalFilter]     = useState('')
  const [sorting, setSorting]               = useState<SortingState>([])
  const [hoveredRow, setHoveredRow]         = useState<number | null>(null)

  const [showModal, setShowModal]           = useState(false)
  const [isEditMode, setIsEditMode]         = useState(false)
  const [editingDisposition, setEditingDisposition] = useState<Disposition | null>(null)
  const [saving, setSaving]                 = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const fetchDispositions = async () => {
    try {
      const res = await api.get('/voice/dispositions/all')
      setDispositions(res.data || [])
    } catch {
      toast.error('Failed to load dispositions')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchDispositions() }, [])

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = dispositions.findIndex((d) => d.id === active.id)
    const newIdx = dispositions.findIndex((d) => d.id === over.id)
    const newOrder = arrayMove(dispositions, oldIdx, newIdx)
    setDispositions(newOrder)
    try {
      await api.post('/voice/dispositions/reorder', { orderedIds: newOrder.map((d) => d.id) })
      toast.success('Order saved')
    } catch {
      toast.error('Failed to save order')
      fetchDispositions()
    }
  }

  const openAddModal = () => { setIsEditMode(false); setEditingDisposition(null); setShowModal(true) }
  const openEditModal = (d: Disposition) => { setIsEditMode(true); setEditingDisposition(d); setShowModal(true) }

  const handleSubmit = async (form: any) => {
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), color: form.color, status: form.status, sequence: 1 }
      if (isEditMode && editingDisposition) {
        await api.put(`/voice/dispositions/update/${editingDisposition.id}`, payload)
        toast.success('Disposition updated')
      } else {
        await api.post('/voice/dispositions/create', payload)
        toast.success('Disposition created')
      }
      setShowModal(false)
      fetchDispositions()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (d: Disposition) => {
    toast.custom((t) => (
      <DeleteToast t={t} name={d.name} isDark={isDark} onConfirm={async () => {
        const tid = toast.loading('Deleting…')
        try {
          await api.delete(`/voice/dispositions/delete/${d.id}`)
          setDispositions((prev) => prev.filter((x) => x.id !== d.id))
          toast.success('Deleted', { id: tid })
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete', { id: tid })
        }
      }} />
    ), { duration: Infinity, position: 'top-center' })
  }

  const handleToggleStatus = async (d: Disposition) => {
    const newStatus = !d.status
    setDispositions((prev) => prev.map((x) => x.id === d.id ? { ...x, status: newStatus } : x))
    try {
      await api.put(`/voice/dispositions/update/${d.id}`, { status: newStatus })
    } catch {
      toast.error('Failed to update status')
      setDispositions((prev) => prev.map((x) => x.id === d.id ? { ...x, status: d.status } : x))
    }
  }

  const columns = useMemo(() => [
    columnHelper.display({ id: 'drag', header: '', cell: () => null }),

    columnHelper.accessor('name', {
      header: 'Disposition Name',
      cell: (info) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: info.row.original.color, flexShrink: 0, boxShadow: `0 0 0 3px ${info.row.original.color}28` }} />
          <span style={{ fontWeight: 600, fontSize: 13.5, color: textPrimary }}>{info.getValue()}</span>
        </div>
      ),
    }),

    columnHelper.accessor('color', {
      header: 'Color',
      cell: (info) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: info.getValue(), border: `1px solid ${swatchBorder}`, boxShadow: `0 2px 6px ${info.getValue()}44`, flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: monoColor }}>{info.getValue()}</span>
        </div>
      ),
    }),

    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={info.getValue()} onChange={() => handleToggleStatus(info.row.original)} accentMain={accentMain} />
          <span style={{ fontSize: 12, fontWeight: 700, color: info.getValue() ? activeColor : textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {info.getValue() ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    }),

    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => openEditModal(info.row.original)}
            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: editBtnBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Edit2 size={13} color={accentMain} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => handleDelete(info.row.original)}
            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: deleteBtnBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Trash2 size={13} color='#E5534B' />
          </motion.button>
        </div>
      ),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isDark, dispositions])

  const table = useReactTable({
    data: dispositions, columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
  })

  if (!currentUser?.additionalRole?.accessDisposition && currentUser.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', fontFamily: 'Inter, sans-serif', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(229,83,75,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldOff size={24} color='#E5534B' />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#E5534B', margin: 0 }}>Access Denied</p>
        <p style={{ fontSize: 13, color: '#9E9EAD', margin: 0 }}>You need admin privileges to view this page.</p>
      </div>
    )
  }

  return (
    <>
      {/* <Toaster position='top-right' /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", transition: 'background 0.2s' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: '-0.4px' }}>Dispositions</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>Manage and reorder call dispositions</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAddModal}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: accentMain, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: isDark ? '0 2px 12px rgba(124,124,240,0.35)' : '0 2px 12px rgba(91,91,214,0.28)',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={15} /> Add Disposition
          </motion.button>
        </div>

        {/* ── Table card ── */}
        <div style={{ ...card, overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: `1px solid ${toolbarBorder}`,
            background: theadBg, gap: 12,
          }}>
            <div style={{ position: 'relative', flex: '0 0 260px' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: textMuted, pointerEvents: 'none' }} />
              <input
                type='text' value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder='Search dispositions…'
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px 8px 32px', borderRadius: 9,
                  border: `1px solid ${inputBorder}`,
                  background: inputBg, fontSize: 13,
                  color: textPrimary, outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={(e) => (e.target.style.borderColor = inputFocus)}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '3px 10px', borderRadius: 6, background: accentBgPill, color: accentMain, fontWeight: 700, fontSize: 12 }}>
                {dispositions.length}
              </span>
              <span style={{ fontSize: 12.5, color: textMuted, fontWeight: 600 }}>
                disposition{dispositions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `3px solid ${isDark ? 'rgba(124,124,240,0.15)' : 'rgba(91,91,214,0.15)'}`,
                borderTopColor: accentMain,
                animation: 'spin 0.7s linear infinite',
              }} />
            </div>

          ) : dispositions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: accentBgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Tag size={22} color={accentMain} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: textPrimary }}>No dispositions yet</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: textMuted }}>Add your first disposition to get started</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={openAddModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: accentMain, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={14} /> Add Disposition
              </motion.button>
            </div>

          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext items={dispositions.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: 44 }} />
                        <th style={thStyle}>Disposition Name</th>
                        <th style={thStyle}>Color</th>
                        <th style={thStyle}>Status</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <SortableRow
                          key={row.id} row={row}
                          isDark={isDark}
                          hovered={hoveredRow === row.original.id}
                          onEnter={() => setHoveredRow(row.original.id)}
                          onLeave={() => setHoveredRow(null)}
                        >
                          {row.getVisibleCells()
                            .filter((cell) => cell.column.id !== 'drag')
                            .map((cell) => (
                              <td key={cell.id} style={{ ...tdStyle, ...(cell.column.id === 'actions' ? { textAlign: 'right' } : {}) }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                        </SortableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Drag hint */}
          {!loading && dispositions.length > 1 && (
            <div style={{ padding: '10px 18px', borderTop: `1px solid ${hintBorder}`, background: hintBg, display: 'flex', alignItems: 'center', gap: 6 }}>
              <GripVertical size={12} color={gripColor} />
              <span style={{ fontSize: 11.5, color: gripColor, fontWeight: 600 }}>Drag rows to reorder</span>
            </div>
          )}
        </div>

        {/* ── Modal ── */}
        <DispositionModal
          open={showModal}
          isEdit={isEditMode}
          isDark={isDark}
          initial={editingDisposition ? { name: editingDisposition.name, color: editingDisposition.color, status: editingDisposition.status } : undefined}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </>
  )
}