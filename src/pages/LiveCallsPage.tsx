// pages/LiveCallsPage.tsx
// @ts-nocheck
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { API_URL } from '../main'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import {
  PhoneOff, Mic, Headphones, ArrowLeft, Radio,
  Activity, ArrowDownLeft, ArrowUpRight, RefreshCw,
  AlertCircle, User, LayoutGrid, List, WifiOff, MessageSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Device } from '@twilio/voice-sdk'

/* ─────────────────────────────────────────────────────────
   localStorage theme
───────────────────────────────────────────────────────── */
function useLocalTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return (localStorage.getItem('theme') as 'dark' | 'light') || 'light' }
    catch { return 'light' }
  })
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const v = localStorage.getItem('theme') as 'dark' | 'light' | null
        if (v === 'dark' || v === 'light') setTheme(v)
      } catch {}
    }, 500)
    return () => clearInterval(iv)
  }, [])
  return theme
}

/* ─────────────────────────────────────────────────────────
   View mode — persisted in localStorage
───────────────────────────────────────────────────────── */
type ViewMode = 'grid' | 'table'
const VIEW_MODE_KEY = 'lc-view-mode'

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY)
      return saved === 'table' ? 'table' : 'grid'
    } catch { return 'grid' }
  })
  const set = useCallback((v: ViewMode) => {
    setMode(v)
    try { localStorage.setItem(VIEW_MODE_KEY, v) } catch {}
  }, [])
  return [mode, set]
}

/* ─────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────── */
function tk(isDark: boolean) {
  return {
    bg:          isDark ? '#0A0A12' : '#F0F1F5',
    surface:     isDark ? '#13131E' : '#FFFFFF',
    surface2:    isDark ? '#1A1A28' : '#F7F7FC',
    border:      isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    border2:     isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    text:        isDark ? '#E8E8F2' : '#0C0C14',
    muted:       isDark ? '#60607A' : '#9898A8',
    accent:      '#5B5BD6',
    accentGlow:  isDark ? 'rgba(91,91,214,0.16)' : 'rgba(91,91,214,0.08)',
    green:       '#16A35A',
    greenBg:     isDark ? 'rgba(22,163,90,0.12)' : 'rgba(22,163,90,0.08)',
    greenText:   isDark ? '#4ADE80' : '#15803D',
    red:         '#E5534B',
    redBg:       isDark ? 'rgba(229,83,75,0.12)' : 'rgba(229,83,75,0.08)',
    redText:     isDark ? '#FCA5A5' : '#B91C1C',
    amber:       '#D97706',
    amberBg:     isDark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)',
    amberText:   isDark ? '#FCD34D' : '#92400E',
    purple:      '#7C3AED',
    purpleBg:    isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
    purpleText:  isDark ? '#C4B5FD' : '#5B21B6',
    cardShadow:  isDark
      ? '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    whisper:     '#D97706',
    whisperBg:   isDark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)',
    whisperText: isDark ? '#FCD34D' : '#92400E',
    tableTh:     isDark ? '#1A1A28' : '#F7F7FC',
    tableStripe: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
  }
}

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function fmtDuration(secs: number) {
  const total = Number.isFinite(secs) ? Math.max(0, Math.floor(secs)) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtPhone(num: string) {
  if (!num) return '—'
  const d = num.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1')
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return num
}

function timeAgo(iso: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  } catch { return '' }
}

const AGENT_COLORS = [
  { bg: 'rgba(91,91,214,0.14)',  text: '#5B5BD6' },
  { bg: 'rgba(124,58,237,0.14)', text: '#7C3AED' },
  { bg: 'rgba(14,165,233,0.14)', text: '#0284C7' },
  { bg: 'rgba(16,185,129,0.14)', text: '#059669' },
  { bg: 'rgba(245,158,11,0.14)', text: '#D97706' },
  { bg: 'rgba(239,68,68,0.14)',  text: '#DC2626' },
  { bg: 'rgba(236,72,153,0.14)', text: '#DB2777' },
]
function agentColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AGENT_COLORS.length
  return AGENT_COLORS[h]
}
function initials(name = '') {
  const w = name.trim().split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase() || 'UN'
}

/* ─────────────────────────────────────────────────────────
   Interfaces
───────────────────────────────────────────────────────── */
interface LiveCall {
  conferenceName: string
  agentName?: string
  agentId?: number
  customerNumber: string
  direction: 'inbound' | 'outbound'
  startedAt: string
  duration: number
  isTransfer?: boolean
}
type ActionMode = 'listen' | 'barge' | 'whisper'

/* ─────────────────────────────────────────────────────────
   Micro-components
───────────────────────────────────────────────────────── */
function PulseDot({ color = '#16A35A', size = 8 }: { color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.35, animation: 'lc-pulse 2s ease-out infinite' }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: color }} />
    </span>
  )
}

function Spinner({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', border: `2px solid ${color}30`, borderTopColor: color, animation: 'lc-spin 0.65s linear infinite', flexShrink: 0 }} />
  )
}

function ActionBtn({ active, loading, onClick, disabled, activeColor, idleBg, idleColor, icon: Icon, activeLabel, idleLabel, activeGlow }: any) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 36, borderRadius: 9, border: 'none',
        background: active ? activeColor : idleBg,
        color: active ? '#fff' : idleColor,
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        transition: 'all 0.15s ease',
        boxShadow: active ? activeGlow : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {loading ? <Spinner color={active ? '#fff' : idleColor} size={12} /> : <Icon size={12} />}
      <span>{active ? activeLabel : idleLabel}</span>
    </motion.button>
  )
}

function DirectionBadge({ direction, t }: { direction: string; t: any }) {
  const isIn = direction === 'inbound'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: isIn ? t.greenBg : t.accentGlow, color: isIn ? t.greenText : t.accent, whiteSpace: 'nowrap' }}>
      {isIn ? <ArrowDownLeft size={9} /> : <ArrowUpRight size={9} />}
      {isIn ? 'Inbound' : 'Outbound'}
    </span>
  )
}

function MonitorBadge({ mode, t }: { mode: ActionMode; t: any }) {
  const cfg = mode === 'barge'
    ? { bg: t.redBg,     color: t.redText,     icon: <Mic size={8} />,          label: 'Barging'   }
    : mode === 'whisper'
    ? { bg: t.whisperBg, color: t.whisperText, icon: <MessageSquare size={8} />, label: 'Whispering' }
    : { bg: t.purpleBg,  color: t.purpleText,  icon: <Headphones size={8} />,   label: 'Listening' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   View Toggle
───────────────────────────────────────────────────────── */
function ViewToggle({ view, onChange, t, isDark }: { view: ViewMode; onChange: (v: ViewMode) => void; t: any; isDark: boolean }) {
  return (
    <div style={{ display: 'flex', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surface, overflow: 'hidden', flexShrink: 0 }}>
      {(['grid', 'table'] as ViewMode[]).map((v) => {
        const active = view === v
        const Icon = v === 'grid' ? LayoutGrid : List
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={v === 'grid' ? 'Card view' : 'Table view'}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              background: active ? (isDark ? 'rgba(91,91,214,0.22)' : 'rgba(91,91,214,0.10)') : 'transparent',
              color: active ? t.accent : t.muted,
              transition: 'all 0.12s',
              borderRight: v === 'grid' ? `1px solid ${t.border}` : 'none',
            }}
          >
            <Icon size={15} />
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Device status indicator
───────────────────────────────────────────────────────── */
type DeviceStatus = 'connecting' | 'ready' | 'error'

function DeviceStatusPill({ status, t }: { status: DeviceStatus; t: any }) {
  if (status === 'ready') return null // ready pe kuch nahi dikhate
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 8,
      background: status === 'error' ? t.redBg : t.amberBg,
      border: `1px solid ${status === 'error' ? t.red + '30' : t.amber + '30'}`,
      fontSize: 11.5, fontWeight: 600,
      color: status === 'error' ? t.redText : t.amberText,
    }}>
      {status === 'error'
        ? <><WifiOff size={12} /> Device offline</>
        : <><Spinner color={t.amberText} size={11} /> Connecting…</>
      }
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   GRID VIEW
───────────────────────────────────────────────────────── */
function GridView({ calls, activeAction, actionLoading, handleAction, t, canBarge }: {
  calls: LiveCall[]; activeAction: any; actionLoading: string | null
  handleAction: (c: LiveCall, m: ActionMode) => void; t: any; canBarge: boolean
}) {
  const card: React.CSSProperties = {
    background: t.surface, borderRadius: 16,
    border: `1px solid ${t.border}`, boxShadow: t.cardShadow,
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
      <AnimatePresence mode="popLayout">
        {calls.map((call) => {
          const isThisActive   = activeAction?.conferenceName === call.conferenceName
          const isLoadingThis  = actionLoading === call.conferenceName
          const listenActive   = isThisActive && activeAction?.mode === 'listen'
          const bargeActive    = isThisActive && activeAction?.mode === 'barge'
          const whisperActive  = isThisActive && activeAction?.mode === 'whisper'
          const aColor         = agentColor(call.agentName || '')
          const outlineColor   = bargeActive ? t.red : whisperActive ? t.whisper : t.purple
          return (
            <motion.div
              key={call.conferenceName} layout
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                ...card, overflow: 'hidden',
                outline: isThisActive ? `2px solid ${outlineColor}` : '2px solid transparent',
                boxShadow: isThisActive
                  ? `${t.cardShadow}, 0 0 0 3px ${bargeActive ? 'rgba(229,83,75,0.10)' : whisperActive ? 'rgba(217,119,6,0.10)' : 'rgba(124,58,237,0.10)'}`
                  : t.cardShadow,
                transition: 'outline-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ height: 2.5, background: call.direction === 'inbound' ? t.green : t.accent, opacity: 0.7 }} />
              <div style={{ padding: '13px 15px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: aColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: aColor.text }}>
                        {initials(call.agentName || '')}
                      </div>
                      <span style={{ position: 'absolute', bottom: -2, right: -2 }}><PulseDot color={t.green} size={7} /></span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{call.agentName || 'Unknown Agent'}</div>
                      <div style={{ fontSize: 10.5, color: t.muted, marginTop: 2 }}>{timeAgo(call.startedAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <DirectionBadge direction={call.direction} t={t} />
                    {call.isTransfer && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: t.amberBg, color: t.amberText }}>
                        <AlertCircle size={8} /> Transferred
                      </span>
                    )}
                    {isThisActive && (
                      <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <MonitorBadge mode={activeAction!.mode} t={t} />
                      </motion.span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 9, background: t.surface2, border: `1px solid ${t.border2}`, marginBottom: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: t.accentGlow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={11} color={t.accent} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text, fontFamily: 'monospace', letterSpacing: '0.02em' }}>{fmtPhone(call.customerNumber)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: t.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: t.greenText, fontFamily: 'monospace', animation: 'lc-breathe 2s ease-in-out infinite' }}>
                      {fmtDuration(call.duration)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <ActionBtn active={listenActive}  loading={isLoadingThis && !bargeActive && !whisperActive} onClick={() => handleAction(call, 'listen')}  disabled={isLoadingThis} activeColor={t.purple}  idleBg={t.purpleBg}  idleColor={t.purpleText}  icon={Headphones}    activeLabel="Stop" idleLabel="Listen"   activeGlow="0 2px 12px rgba(124,58,237,0.28)" />
                  <ActionBtn active={bargeActive}   loading={isLoadingThis && !listenActive && !whisperActive} onClick={() => handleAction(call, 'barge')}   disabled={isLoadingThis} activeColor={t.red}     idleBg={t.redBg}     idleColor={t.redText}     icon={Mic}           activeLabel="Stop" idleLabel="Barge"    activeGlow="0 2px 12px rgba(229,83,75,0.28)" />
                  {canBarge && <ActionBtn active={whisperActive} loading={isLoadingThis && !listenActive && !bargeActive} onClick={() => handleAction(call, 'whisper')} disabled={isLoadingThis} activeColor={t.whisper} idleBg={t.whisperBg} idleColor={t.whisperText} icon={MessageSquare} activeLabel="Stop" idleLabel="Whisper" activeGlow="0 2px 12px rgba(217,119,6,0.28)" />}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TABLE VIEW
───────────────────────────────────────────────────────── */
function TableView({ calls, activeAction, actionLoading, handleAction, t, isDark, canBarge }: {
  calls: LiveCall[]; activeAction: any; actionLoading: string | null
  handleAction: (c: LiveCall, m: ActionMode) => void; t: any; isDark: boolean; canBarge: boolean
}) {
  const thStyle: React.CSSProperties = {
    padding: '9px 14px', textAlign: 'left',
    fontSize: 10.5, fontWeight: 700,
    color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap', background: t.tableTh,
    borderBottom: `1px solid ${t.border}`,
  }
  const tdBase: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: t.text, verticalAlign: 'middle' }
  return (
    <div style={{ background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead>
            <tr>
              {['Agent', 'Customer', 'Direction', 'Duration', 'Started', 'Status', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {calls.map((call, idx) => {
                const isThisActive   = activeAction?.conferenceName === call.conferenceName
                const isLoadingThis  = actionLoading === call.conferenceName
                const listenActive   = isThisActive && activeAction?.mode === 'listen'
                const bargeActive    = isThisActive && activeAction?.mode === 'barge'
                const whisperActive  = isThisActive && activeAction?.mode === 'whisper'
                const aColor         = agentColor(call.agentName || '')
                const isLast         = idx === calls.length - 1
                const rowBorder      = isLast ? 'none' : `1px solid ${t.border2}`
                const td             = { ...tdBase, borderBottom: rowBorder }
                const rowBg = isThisActive
                  ? bargeActive   ? (isDark ? 'rgba(229,83,75,0.06)'  : 'rgba(229,83,75,0.03)')
                  : whisperActive ? (isDark ? 'rgba(217,119,6,0.06)'  : 'rgba(217,119,6,0.03)')
                  :                 (isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.03)')
                  : (idx % 2 === 0 ? 'transparent' : t.tableStripe)
                return (
                  <motion.tr
                    key={call.conferenceName} layout
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.18 }}
                    style={{ background: rowBg, transition: 'background 0.15s' }}
                  >
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: aColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: aColor.text }}>
                            {initials(call.agentName || '')}
                          </div>
                          <span style={{ position: 'absolute', bottom: -1, right: -1 }}><PulseDot color={t.green} size={6} /></span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {call.agentName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600 }}>{fmtPhone(call.customerNumber)}</td>
                    <td style={td}><DirectionBadge direction={call.direction} t={t} /></td>
                    <td style={td}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: t.greenText, animation: 'lc-breathe 2s ease-in-out infinite', display: 'inline-block' }}>
                        {fmtDuration(call.duration)}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: t.muted }}>{timeAgo(call.startedAt)}</td>
                    <td style={td}>
                      {call.isTransfer
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: t.amberBg, color: t.amberText }}><AlertCircle size={9} /> Transfer</span>
                        : isThisActive
                          ? <MonitorBadge mode={activeAction!.mode} t={t} />
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: t.greenBg, color: t.greenText }}>
                              <PulseDot color={t.greenText} size={6} /> Live
                            </span>
                      }
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <ActionBtn active={listenActive}  loading={isLoadingThis && !bargeActive && !whisperActive} onClick={() => handleAction(call, 'listen')}  disabled={isLoadingThis} activeColor={t.purple}  idleBg={t.purpleBg}  idleColor={t.purpleText}  icon={Headphones}    activeLabel="Stop" idleLabel="Listen"  activeGlow="0 2px 10px rgba(124,58,237,0.28)" />
                        <ActionBtn active={bargeActive}   loading={isLoadingThis && !listenActive && !whisperActive} onClick={() => handleAction(call, 'barge')}   disabled={isLoadingThis} activeColor={t.red}     idleBg={t.redBg}     idleColor={t.redText}     icon={Mic}           activeLabel="Stop" idleLabel="Barge"   activeGlow="0 2px 10px rgba(229,83,75,0.28)" />
                        {canBarge && <ActionBtn active={whisperActive} loading={isLoadingThis && !listenActive && !bargeActive} onClick={() => handleAction(call, 'whisper')} disabled={isLoadingThis} activeColor={t.whisper} idleBg={t.whisperBg} idleColor={t.whisperText} icon={MessageSquare} activeLabel="Stop" idleLabel="Whisper" activeGlow="0 2px 10px rgba(217,119,6,0.28)" />}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LiveCallsPage() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const theme       = useLocalTheme()
  const isDark      = theme === 'dark'
  const t           = useMemo(() => tk(isDark), [isDark])
  const [viewMode, setViewMode] = useViewMode()

  const [calls,          setCalls]          = useState<LiveCall[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeAction,   setActiveAction]   = useState<{ conferenceName: string; mode: ActionMode; supervisorCallSid: string } | null>(null)
  const [actionLoading,  setActionLoading]  = useState<string | null>(null)
  const [deviceStatus,   setDeviceStatus]   = useState<DeviceStatus>('connecting')

  const socketRef      = useRef<any>(null)
  const deviceRef      = useRef<Device | null>(null)
  const activeCallRef  = useRef<any>(null)
  // FIX: Store pending mode so we can apply mute AFTER 'accept' event fires
  const pendingModeRef = useRef<ActionMode | null>(null)
  // FIX: token refresh interval
  const tokenRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── normalize call ── */
  const normalizeCall = (call: any): LiveCall => ({
    ...call,
    duration: Number.isFinite(Number(call.duration)) ? Math.max(0, Math.floor(Number(call.duration))) : 0,
  })

  /* ── socket ── */
  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('admin-call-started', ({ call }) => {
      const normalized = normalizeCall(call)
    
      setCalls(prev => {
        // Step 1: Remove duplicate — same conferenceName OR same agentId (old call)
        const filtered = prev.filter(c =>
          c.conferenceName !== normalized.conferenceName &&
          !(normalized.agentId && c.agentId === normalized.agentId)
        )
    
        // Step 2: Check if supervisor was monitoring the removed agent call
        // If yes, disconnect supervisor session (handled below via setActiveAction)
        return [normalized, ...filtered]
      })
    
      // Step 3: If activeAction was on this agent's OLD call, clear it
      setActiveAction(prev => {
        if (!prev) return null
        // New call came in for same agent — old conference is gone
        // We compare against agentId; if match and different conference → clear
        if (
          normalized.agentId &&
          prev.conferenceName !== normalized.conferenceName
        ) {
          // Check via a ref or just be safe — disconnect supervisor audio
          try { activeCallRef.current?.disconnect(); activeCallRef.current = null } catch {}
          pendingModeRef.current = null
          return null
        }
        return prev
      })
    })
    // ✅ FIX #4: Handle new payload with type and reason fields
    socket.on('admin-call-ended', ({ conferenceName, type, reason }: any) => {
      setCalls(prev => prev.filter(c => c.conferenceName !== conferenceName))
      setActiveAction(prev => prev?.conferenceName === conferenceName ? null : prev)
    })
    return () => { socket.disconnect() }
  }, [])

  /* ── duration ticker ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setCalls(prev => prev.map(c => ({ ...c, duration: (Number.isFinite(c.duration) ? c.duration : 0) + 1 })))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  /* ── initial fetch ── */
  useEffect(() => { fetchCalls() }, [])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const res = await api.get('/voice/admin/live-calls')
      const raw: LiveCall[] = (res.data.data || []).map(normalizeCall)
  
      // Sort by startedAt descending (newest first)
      raw.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  
      // Deduplicate: one call per agent — keep the newest (first after sort)
      const seen = new Set<number>()
      const deduped = raw.filter(c => {
        if (c.agentId) {
          if (seen.has(c.agentId)) return false
          seen.add(c.agentId)
        }
        return true
      })
  
      setCalls(deduped)
    } catch { toast.error('Failed to fetch live calls') }
    finally { setLoading(false) }
  }

  /* ─────────────────────────────────────────────────────
     FIX: Twilio Device — robust init with token refresh
     
     Key changes vs original:
     1. `initDevice` is extracted so it can be called again on token expiry
     2. Token is refreshed every 45 minutes (Twilio tokens expire in 1h)
     3. `mute()` is called INSIDE the 'accept' callback — not in a setTimeout
        pendingModeRef stores what mode was requested, and once call is
        fully connected (inside 'accept'), we apply it immediately
     4. Device 'error' and 'tokenWillExpire' events trigger re-registration
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let dev: Device | null = null
    let destroyed = false

    const initDevice = async () => {
      // Cleanup existing device before re-init
      if (dev) {
        try { dev.unregister(); dev.destroy() } catch {}
        dev = null
      }
      if (destroyed) return

      setDeviceStatus('connecting')
      console.log('🔄 Initializing Supervisor Device…')

      try {
        const res = await api.get('/token/sip', { params: { purpose: 'monitor' } })
        const { token } = res.data
        if (destroyed) return

        dev = new Device(token, {
          logLevel: 1,
          codecPreferences: ['opus', 'pcmu'] as any,
          // Allow device to handle multiple calls (needed for supervisor)
          allowIncomingWhileBusy: true,
        })
        deviceRef.current = dev

        /* ── incoming call handler ──
           This fires when backend calls participants.create() and Twilio
           rings our Device identity. We MUST accept() here.
           FIX: Apply mute INSIDE the accept flow, not in a setTimeout.
        ── */
        dev.on('incoming', (call: any) => {
          console.log('📞 Supervisor incoming call — accepting')
          activeCallRef.current = call

          // FIX: Apply the mute state immediately once media is ready
          // 'accept' on the Call object fires after DTLS/ICE negotiation completes
          // That's when audio is actually flowing — safe to mute/unmute here
          call.on('accept', () => {
            console.log('✅ Call accepted, applying mute state')
            const mode = pendingModeRef.current
            if (mode === 'listen') {
              call.mute(true)   // silent monitor
              console.log('🔇 Muted (listen mode)')
            } else if (mode === 'barge') {
              call.mute(false)  // full participation
              console.log('🎤 Unmuted (barge mode)')
            } else if (mode === 'whisper') {
              call.mute(false)  // mic open — Twilio coaching restricts audio to agent only
              console.log('🤫 Unmuted (whisper/coach mode — agent only hears)')
            }
          })

          call.on('disconnect', () => {
            console.log('Call disconnected')
            activeCallRef.current = null
            pendingModeRef.current = null
            setActiveAction(null)
          })

          call.on('error', (err: any) => {
            console.error('Supervisor call error:', err)
            toast.error('Supervisor call error — try again')
            activeCallRef.current = null
            pendingModeRef.current = null
            setActiveAction(null)
          })

          // Accept the incoming call — audio channel opens
          call.accept()
        })

        dev.on('registered', () => {
          console.log('✅ Supervisor Device registered')
          setDeviceStatus('ready')
        })

        dev.on('unregistered', () => {
          console.log('⚠️ Supervisor Device unregistered')
          if (!destroyed) setDeviceStatus('error')
        })

        dev.on('error', (err: any) => {
          console.error('Device error:', err)
          // Re-init on token errors (31205 = token expired / invalid)
          if (err?.code === 31205 || err?.code === 31204 || err?.code === 20104) {
            console.log('🔁 Token error detected — re-initializing device')
            if (!destroyed) initDevice()
          } else {
            if (!destroyed) setDeviceStatus('error')
          }
        })

        // FIX: Twilio SDK fires this ~1 minute before token expires
        // Use it to proactively refresh instead of waiting for an error
        dev.on('tokenWillExpire', () => {
          console.log('⏰ Token about to expire — refreshing')
          if (!destroyed) refreshToken()
        })

        await dev.register()

      } catch (err) {
        console.error('Failed to init Supervisor Device:', err)
        if (!destroyed) setDeviceStatus('error')
      }
    }

    /* ── FIX: Token refresh — update running Device instead of full re-init ── */
    const refreshToken = async () => {
      if (destroyed || !deviceRef.current) return
      try {
        const res = await api.get('/token/sip', { params: { purpose: 'monitor' } })
        const { token } = res.data
        // updateToken() replaces the token without destroying the Device
        // or dropping any active calls — production-safe
        deviceRef.current.updateToken(token)
        console.log('🔑 Token refreshed successfully')
      } catch (err) {
        console.error('Token refresh failed — re-initializing device:', err)
        if (!destroyed) initDevice()
      }
    }

    // Initial device setup
    initDevice()

    // FIX: Proactive token refresh every 45 minutes
    // (Twilio default token TTL = 1 hour, we refresh at 45min to be safe)
    tokenRefreshRef.current = setInterval(refreshToken, 45 * 60 * 1000)

    return () => {
      destroyed = true
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current)
      try {
        activeCallRef.current?.disconnect()
        dev?.unregister()
        dev?.destroy()
      } catch {}
      deviceRef.current = null
      activeCallRef.current = null
      pendingModeRef.current = null
    }
  }, [])

  /* ─────────────────────────────────────────────────────
     Listen / Barge action
     
     FIX: We store the desired mode in pendingModeRef BEFORE
     calling the backend. When Twilio calls Device.on('incoming'),
     the call.on('accept') handler reads pendingModeRef and applies
     the correct mute state at the right moment.
  ───────────────────────────────────────────────────────── */
  const handleAction = useCallback(async (call: LiveCall, mode: ActionMode) => {
    // Same mode + same call = toggle off
    if (activeAction?.conferenceName === call.conferenceName && activeAction?.mode === mode) {
      await handleStopAction()
      return
    }
    // Different call/mode — stop current first
    if (activeAction) await handleStopAction()

    setActionLoading(call.conferenceName)

    // FIX: Set pending mode BEFORE backend call so that if Device.on('incoming')
    // fires very quickly, the mode is already there
    pendingModeRef.current = mode

    // whisper → send "coach" to backend (Twilio coaching mode)
    const backendMode = mode === 'whisper' ? 'coach' : mode

    try {
      const res = await api.post(
        `/voice/admin/calls/${encodeURIComponent(call.conferenceName)}/supervisor/join`,
        { mode: backendMode }
      )
      const { supervisorCallSid } = res.data

      // Apply mute state if call already connected
      if (activeCallRef.current) {
        const callStatus = activeCallRef.current.status?.()
        if (callStatus === 'open') {
          activeCallRef.current.mute(mode === 'listen')
        }
      }

      setActiveAction({ conferenceName: call.conferenceName, mode, supervisorCallSid })
      const toastMsg = mode === 'listen' ? '🎧 Listening to call' : mode === 'whisper' ? '🤫 Whispering to agent only' : '🎤 Barged in'
      toast.success(toastMsg, { duration: 3000 })
    } catch (err: any) {
      pendingModeRef.current = null
      toast.error(err?.response?.data?.message || `Failed to ${mode} call`)
    } finally {
      setActionLoading(null)
    }
  }, [activeAction])

  const handleStopAction = useCallback(async () => {
    pendingModeRef.current = null
    try { activeCallRef.current?.disconnect(); activeCallRef.current = null } catch {}
    if (activeAction?.supervisorCallSid) {
      try {
        await api.post('/voice/admin/calls/supervisor/stop', { supervisorCallSid: activeAction.supervisorCallSid })
      } catch {}
    }
    setActiveAction(null)
    toast('Disconnected', { icon: '👋', duration: 2000 })
  }, [activeAction])

  /* ── computed ── */
  const inboundCount   = calls.filter(c => c.direction === 'inbound').length
  const outboundCount  = calls.filter(c => c.direction === 'outbound').length
  const activeCallInfo = activeAction ? calls.find(c => c.conferenceName === activeAction.conferenceName) : null
  const card: React.CSSProperties = { background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }
  // Whisper allowed only when bargeCalls permission is granted
  const canBarge = user?.role === 'ADMIN' || user?.additionalRole?.bargeCalls === true

  return (
    <>
      <style>{`
        @keyframes lc-pulse   { 0%{transform:scale(1);opacity:.35} 60%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
        @keyframes lc-spin    { to{transform:rotate(360deg)} }
        @keyframes lc-breathe { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* <Toaster
        position="top-right"
        toastOptions={{ style: { fontFamily:"'Inter',sans-serif", borderRadius:10, fontSize:13, background:isDark?'#1A1A28':'#fff', color:t.text, border:`1px solid ${t.border}`, boxShadow:t.cardShadow } }}
      /> */}

      <div style={{ fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", minHeight:'100vh', background:t.bg, padding:'20px 24px 40px', color:t.text, boxSizing:'border-box' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ width:36, height:36, borderRadius:10, background:t.surface, border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:t.muted, flexShrink:0, transition:'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background=t.surface2; e.currentTarget.style.color=t.text }}
              onMouseLeave={e => { e.currentTarget.style.background=t.surface;  e.currentTarget.style.color=t.muted }}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:t.accentGlow, border:`1px solid ${isDark?'rgba(91,91,214,0.25)':'rgba(91,91,214,0.15)'}`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <Radio size={19} color={t.accent} />
                {calls.length > 0 && <span style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:t.green, border:`2px solid ${t.bg}` }} />}
              </div>
              <div>
                <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:t.text, letterSpacing:'-0.03em' }}>Live Calls</h1>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                  {calls.length > 0
                    ? <><PulseDot color={t.green} size={7}/><span style={{ fontSize:11.5, color:t.muted }}>{calls.length} active</span></>
                    : <span style={{ fontSize:11.5, color:t.muted }}>No active calls</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* Device status */}
            <DeviceStatusPill status={deviceStatus} t={t} />

            {/* Monitor pill */}
            <AnimatePresence>
              {activeAction && activeCallInfo && (
                <motion.div
                  key="monitor-pill"
                  initial={{ opacity:0, scale:0.94, x:8 }} animate={{ opacity:1, scale:1, x:0 }} exit={{ opacity:0, scale:0.94, x:8 }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px 6px 8px', borderRadius:10, background:t.surface, border:`1px solid ${activeAction.mode==='barge'?t.red:t.purple}` }}
                >
                  <div style={{ width:28, height:28, borderRadius:8, background:activeAction.mode==='barge'?t.redBg:activeAction.mode==='whisper'?t.whisperBg:t.purpleBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {activeAction.mode==='barge'?<Mic size={13} color={t.redText}/>:activeAction.mode==='whisper'?<MessageSquare size={13} color={t.whisperText}/>:<Headphones size={13} color={t.purpleText}/>}
                  </div>
                  <div style={{ lineHeight:1.3 }}>
                    <div style={{ fontSize:10.5, color:t.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      {activeAction.mode==='barge'?'Barging':activeAction.mode==='whisper'?'Whispering':'Listening'}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:t.text }}>{activeCallInfo.agentName||'Agent'}</div>
                  </div>
                  <button onClick={handleStopAction} style={{ marginLeft:2, width:24, height:24, borderRadius:6, border:'none', background:t.redBg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Disconnect">
                    <PhoneOff size={11} color={t.redText}/>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <ViewToggle view={viewMode} onChange={setViewMode} t={t} isDark={isDark} />

            <button
              onClick={fetchCalls}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:`1px solid ${t.border}`, background:t.surface, color:t.muted, fontSize:12.5, fontWeight:600, cursor:'pointer', transition:'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background=t.surface2; e.currentTarget.style.color=t.text }}
              onMouseLeave={e => { e.currentTarget.style.background=t.surface;  e.currentTarget.style.color=t.muted }}
            >
              <RefreshCw size={13}/> Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(148px, 1fr))', gap:10, marginBottom:20 }}>
          {[
            { label:'Total Active', value:calls.length,  icon:Activity,      color:t.accent,    bg:t.accentGlow },
            { label:'Inbound',      value:inboundCount,  icon:ArrowDownLeft, color:t.greenText, bg:t.greenBg   },
            { label:'Outbound',     value:outboundCount, icon:ArrowUpRight,  color:t.amberText, bg:t.amberBg   },
          ].map(({ label, value, icon:Icon, color, bg }) => (
            <div key={label} style={{ ...card, padding:'12px 15px', display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:33, height:33, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={15} color={color}/>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:t.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:1 }}>{label}</div>
                <div style={{ fontSize:23, fontWeight:800, color:t.text, letterSpacing:'-0.04em', lineHeight:1 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, minHeight:260 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', border:`3px solid ${t.accentGlow}`, borderTopColor:t.accent, animation:'lc-spin 0.7s linear infinite' }} />
            <span style={{ fontSize:13.5, color:t.muted, fontWeight:500 }}>Loading live calls…</span>
          </div>
        ) : calls.length === 0 ? (
          <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, minHeight:280, textAlign:'center', padding:40 }}>
            <div style={{ width:54, height:54, borderRadius:15, background:t.accentGlow, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
              <PhoneOff size={23} color={t.accent}/>
            </div>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:t.text }}>No active calls</p>
            <p style={{ margin:0, fontSize:13, color:t.muted, maxWidth:260, lineHeight:1.6 }}>Live calls will appear here as agents connect.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <GridView calls={calls} activeAction={activeAction} actionLoading={actionLoading} handleAction={handleAction} t={t} canBarge={canBarge} />
        ) : (
          <TableView calls={calls} activeAction={activeAction} actionLoading={actionLoading} handleAction={handleAction} t={t} isDark={isDark} canBarge={canBarge} />
        )}
      </div>
    </>
  )
}