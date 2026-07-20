// @ts-nocheck
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import ReactDOM from "react-dom";
import {
  Headphones, HeadphoneOff, PhoneOff, Phone,
  Menu, PanelLeftClose, Clock, Globe, X, Search, Sun, Moon,
  
  RefreshCw
} from "lucide-react";
import { useAuth }    from "../context/AuthContext";
import api            from "../api";
import toast          from "react-hot-toast";
import { useTheme }   from "../context/ThemeContext";
import { useSidebar } from "./sidebar/SidebarContext";
import { useCall }    from "../context/CallContext";
// ─────────────────────────────────────────────────────────────
// HEADER.TSX MEIN YEH ADD KARO
// ─────────────────────────────────────────────────────────────
// 1. Top pe import add karo:
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UpdateButton from "./UpdateButton";
import { ReopenDialerButton } from "../App";
// import { useWallet } from "../context/WalletContext"; // niche banate hain

// 2. Header component ke andar, existing hooks ke saath:
// const wallet = useWallet();

// 3. Admin/no-call layout ke return mein, ClockWidget ke baad add karo:
// {user?.role === "ADMIN" && <WalletChip isDark={isDark} />}
// ─────────────────────────────────────────────────────────────

// WalletChip component — paste karo Header.tsx mein
// (ClockWidget function ke upar)

function WalletChip({ isDark }: { isDark: boolean }) {
  const [balance, setBalance] = React.useState<number | null>(null);
  const [isFrozen, setIsFrozen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    let cancelled = false;
    const fetchWallet = async () => {
      try {
        const res = await api.get("/auth/wallet");
        if (!cancelled && res.data?.data) {
          setBalance(res.data.data.balance);
          setIsFrozen(res.data.data.isFrozen);
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchWallet();
    const id = setInterval(fetchWallet, 30_000); // refresh every 30s
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── tokens ──
  const isLow     = balance !== null && balance < 2;
  const chipBg    = isFrozen
    ? (isDark ? "rgba(208,40,26,0.15)" : "rgba(208,40,26,0.08)")
    : isLow
    ? (isDark ? "rgba(211,138,0,0.15)" : "rgba(211,138,0,0.10)")
    : (isDark ? "rgba(23,163,99,0.12)" : "rgba(23,163,99,0.08)");
  const chipBord  = isFrozen
    ? "rgba(208,40,26,0.30)"
    : isLow
    ? "rgba(211,138,0,0.30)"
    : (isDark ? "rgba(23,163,99,0.25)" : "rgba(23,163,99,0.20)");
  const chipColor = isFrozen ? "#D0281A" : isLow ? "#D38A00" : "#17A363";
  const label     = isFrozen ? "FROZEN" : isLow ? "LOW" : null;

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 10,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
      background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
    }}>
      <div style={{ width: 32, height: 14, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", animation: "shimmer 1.2s ease infinite" }} />
    </div>
  );

  return (
    <button
      onClick={() => navigate("/admin/settings/billing")}
      title="Click to manage wallet"
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "5px 10px 5px 8px", borderRadius: 10,
        border: `1px solid ${chipBord}`, background: chipBg,
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.15s", userSelect: "none",
        outline: "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      <Wallet size={13} color={chipColor} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: chipColor, fontVariantNumeric: "tabular-nums" }}>
        ${balance !== null ? Math.abs(balance).toFixed(2) : "—"}
      </span>
      {label && (
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
          background: chipColor, color: "#fff",
          padding: "2px 5px", borderRadius: 4,
        }}>
          {label}
        </span>
      )}
    </button>
  );
}
// ─────────────────────────────────────────────────────────────
// Header ke admin layout return mein add karo:
//
// <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//   <ClockWidget isDark={isDark} />
//   {user?.role === "ADMIN" && <WalletChip isDark={isDark} />}   ← YEH ADD KARO
//   {themeBtn}
//   {HungCallBanner}
// </div>
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────
function getSafeTz() {
  const raw = localStorage.getItem("appTimeZone") || "";
  const tz  = raw.trim().replace(/^["']|["']$/g, "") || "America/Los_Angeles";
  try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return tz; }
  catch { return "America/Los_Angeles"; }
}
function getRegionPrefix(tz) { return tz.split("/")[0]; }

const FALLBACK_ZONES = {
  America: [
    "America/New_York","America/Detroit","America/Indiana/Indianapolis",
    "America/Chicago","America/Winnipeg","America/Denver","America/Boise",
    "America/Phoenix","America/Los_Angeles","America/Anchorage",
    "America/Puerto_Rico","America/Halifax","America/St_Johns",
    "America/Toronto","America/Vancouver","America/Mexico_City",
    "America/Bogota","America/Lima","America/Santiago","America/Sao_Paulo",
    "America/Argentina/Buenos_Aires","America/Caracas","America/La_Paz",
    "America/Montevideo","America/Guyana","America/Panama",
    "America/Costa_Rica","America/Guatemala","America/Managua",
    "America/Tegucigalpa","America/El_Salvador","America/Belize",
    "America/Jamaica","America/Havana","America/Nassau","America/Barbados",
    "America/Port_of_Spain","America/Trinidad","America/Guadeloupe",
    "America/Martinique","America/Santo_Domingo","America/Curacao",
  ],
  Asia: [
    "Asia/Karachi","Asia/Kolkata","Asia/Dhaka","Asia/Colombo",
    "Asia/Kathmandu","Asia/Kabul","Asia/Tehran","Asia/Baghdad",
    "Asia/Kuwait","Asia/Riyadh","Asia/Qatar","Asia/Bahrain",
    "Asia/Dubai","Asia/Muscat","Asia/Tbilisi","Asia/Yerevan",
    "Asia/Baku","Asia/Tashkent","Asia/Almaty","Asia/Bishkek",
    "Asia/Dushanbe","Asia/Ashgabat","Asia/Tokyo","Asia/Seoul",
    "Asia/Shanghai","Asia/Hong_Kong","Asia/Taipei","Asia/Singapore",
    "Asia/Kuala_Lumpur","Asia/Bangkok","Asia/Jakarta","Asia/Makassar",
    "Asia/Jayapura","Asia/Manila","Asia/Ho_Chi_Minh","Asia/Phnom_Penh",
    "Asia/Vientiane","Asia/Rangoon","Asia/Calcutta",
    "Asia/Yekaterinburg","Asia/Omsk","Asia/Novosibirsk","Asia/Krasnoyarsk",
    "Asia/Irkutsk","Asia/Yakutsk","Asia/Vladivostok","Asia/Magadan",
    "Asia/Kamchatka","Asia/Beirut","Asia/Amman","Asia/Damascus",
    "Asia/Jerusalem","Asia/Nicosia",
  ],
  Europe: [
    "Europe/London","Europe/Dublin","Europe/Lisbon","Europe/Madrid",
    "Europe/Paris","Europe/Brussels","Europe/Amsterdam","Europe/Berlin",
    "Europe/Rome","Europe/Vienna","Europe/Zurich","Europe/Prague",
    "Europe/Warsaw","Europe/Budapest","Europe/Bratislava","Europe/Ljubljana",
    "Europe/Zagreb","Europe/Sarajevo","Europe/Belgrade","Europe/Sofia",
    "Europe/Bucharest","Europe/Athens","Europe/Helsinki","Europe/Tallinn",
    "Europe/Riga","Europe/Vilnius","Europe/Minsk","Europe/Kiev",
    "Europe/Moscow","Europe/Samara","Europe/Istanbul",
    "Europe/Stockholm","Europe/Oslo","Europe/Copenhagen","Europe/Reykjavik",
    "Europe/Luxembourg","Europe/Monaco","Europe/Malta","Europe/Chisinau",
    "Europe/Tirane","Europe/Skopje","Europe/Podgorica",
  ],
  Africa: [
    "Africa/Cairo","Africa/Casablanca","Africa/Lagos","Africa/Nairobi",
    "Africa/Johannesburg","Africa/Addis_Ababa","Africa/Dar_es_Salaam",
    "Africa/Kampala","Africa/Kigali","Africa/Lusaka","Africa/Harare",
    "Africa/Maputo","Africa/Windhoek","Africa/Luanda","Africa/Kinshasa",
    "Africa/Dakar","Africa/Abidjan","Africa/Accra","Africa/Khartoum",
    "Africa/Mogadishu","Africa/Tunis","Africa/Algiers","Africa/Tripoli",
    "Africa/Antananarivo","Africa/Mauritius",
  ],
  Pacific: [
    "Pacific/Honolulu","Pacific/Auckland","Pacific/Chatham","Pacific/Fiji",
    "Pacific/Tongatapu","Pacific/Apia","Pacific/Rarotonga",
    "Pacific/Pago_Pago","Pacific/Noumea","Pacific/Port_Moresby",
    "Pacific/Guadalcanal","Pacific/Tarawa","Pacific/Guam",
  ],
  Atlantic: [
    "Atlantic/Azores","Atlantic/Cape_Verde","Atlantic/Canary",
    "Atlantic/Faroe","Atlantic/Madeira","Atlantic/Bermuda",
  ],
  Indian: [
    "Indian/Maldives","Indian/Mauritius","Indian/Reunion",
    "Indian/Christmas","Indian/Cocos","Indian/Mahe",
  ],
  Australia: [
    "Australia/Sydney","Australia/Melbourne","Australia/Brisbane",
    "Australia/Perth","Australia/Adelaide","Australia/Darwin",
    "Australia/Hobart","Australia/Lord_Howe",
  ],
  Antarctica: [
    "Antarctica/McMurdo","Antarctica/Palmer","Antarctica/Rothera",
    "Antarctica/Syowa","Antarctica/Mawson","Antarctica/Davis",
    "Antarctica/Casey","Antarctica/Vostok","Antarctica/South_Pole",
  ],
};

function getZonesForRegion(region) {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      const all      = Intl.supportedValuesOf("timeZone");
      const filtered = all.filter((z) => z.startsWith(region + "/"));
      if (filtered.length > 0) return filtered;
    }
  } catch { /* ignore */ }
  return FALLBACK_ZONES[region] || [];
}

function buildZoneMeta(id) {
  const segments = id.split("/");
  const city     = segments[segments.length - 1].replace(/_/g, " ");
  const name     = segments.slice(1).join(" / ").replace(/_/g, " ");
  let abbr = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: id, timeZoneName: "short",
    }).formatToParts(new Date());
    abbr = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch { abbr = ""; }
  return { id, name, city, abbr };
}

function fmtTz(tz, opts) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(new Date());
}
function getUtcOffset(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return off.replace("GMT", "UTC");
  } catch { return ""; }
}
function getTzAbbr(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "TZ";
  } catch { return "TZ"; }
}

// ─────────────────────────────────────────────
// AnalogClock — dark aware
// ─────────────────────────────────────────────
function AnalogClock({ tz, size = 52, isDark = false }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2, cy = size / 2, r = size / 2 - 2;
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "numeric",
      second: "numeric", hour12: false,
    }).formatToParts(now);

    let h = 0, m = 0, s = 0;
    parts.forEach((p) => {
      if (p.type === "hour")   h = Number(p.value) % 12;
      if (p.type === "minute") m = Number(p.value);
      if (p.type === "second") s = Number(p.value);
    });

    // ── dark/light tokens ──
    const faceFrom   = isDark ? "#1E1E2E" : "#FFFFFF";
    const faceTo     = isDark ? "#16162A" : "#F0F0F8";
    const rimColor   = isDark ? "rgba(124,124,240,0.25)" : "rgba(108,99,255,0.15)";
    const hourColor  = isDark ? "#E0E0F0" : "#1A1A2E";
    const minColor   = isDark ? "#A0A0C0" : "#4A4A6A";
    const secColor   = isDark ? "#7C7CF0" : "#6C63FF";
    const tickMaj    = isDark ? "rgba(124,124,240,0.35)" : "rgba(108,99,255,0.25)";
    const tickMin    = isDark ? "rgba(124,124,240,0.15)" : "rgba(108,99,255,0.10)";

    ctx.clearRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, r);
    grad.addColorStop(0, faceFrom);
    grad.addColorStop(1, faceTo);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = rimColor; ctx.lineWidth = 1.5; ctx.stroke();

    for (let i = 0; i < 60; i++) {
      const angle  = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMaj  = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * (isMaj ? 0.72 : 0.83),
                 cy + Math.sin(angle) * r * (isMaj ? 0.72 : 0.83));
      ctx.lineTo(cx + Math.cos(angle) * r * 0.90,
                 cy + Math.sin(angle) * r * 0.90);
      ctx.strokeStyle = isMaj ? tickMaj : tickMin;
      ctx.lineWidth = isMaj ? 1.5 : 0.8;
      ctx.lineCap = "round"; ctx.stroke();
    }

    const drawHand = (angle, len, width, color, withShadow = false) => {
      ctx.save();
      if (withShadow) {
        ctx.shadowColor = isDark ? "rgba(124,124,240,0.5)" : "rgba(108,99,255,0.3)";
        ctx.shadowBlur = 4;
      }
      ctx.translate(cx, cy); ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.16); ctx.lineTo(0, -r * len);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
      ctx.stroke(); ctx.restore();
    };

    drawHand(((h + m/60 + s/3600) / 12) * Math.PI * 2 - Math.PI/2, 0.52, size/12,  hourColor);
    drawHand(((m + s/60) / 60)           * Math.PI * 2 - Math.PI/2, 0.72, size/20,  minColor);
    drawHand((s / 60)                    * Math.PI * 2 - Math.PI/2, 0.82, size/38,  secColor, true);

    ctx.beginPath(); ctx.arc(cx, cy, size/11, 0, Math.PI*2);
    ctx.fillStyle = secColor; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, size/22, 0, Math.PI*2);
    ctx.fillStyle = isDark ? "#1E1E2E" : "#fff"; ctx.fill();
  }, [tz, size, isDark]);

  useEffect(() => {
    draw();
    const id = setInterval(draw, 1000);
    return () => clearInterval(id);
  }, [draw]);

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{
        display: "block", borderRadius: "50%", flexShrink: 0,
        boxShadow: isDark
          ? "0 2px 8px rgba(124,124,240,0.20)"
          : "0 2px 8px rgba(108,99,255,0.12)",
      }} />
  );
}

// ─────────────────────────────────────────────
// TzRow — dark aware
// ─────────────────────────────────────────────
function TzRow({ zone, isActive, isDark }) {
  const [digital, setDigital] = useState("");
  const [offset,  setOffset]  = useState("");

  useEffect(() => {
    const tick = () => {
      setDigital(fmtTz(zone.id, { hour: "2-digit", minute: "2-digit", hour12: true }));
      setOffset(getUtcOffset(zone.id));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [zone.id]);

  const isAm    = digital.endsWith("AM");
  const timeNum = digital.replace(/(AM|PM)$/, "").trim();
  const ampm    = isAm ? "AM" : "PM";

  const accentMain  = isDark ? "#7C7CF0" : "#6C63FF";
  const accentBg    = isDark ? "rgba(124,124,240,0.12)" : "rgba(108,99,255,0.06)";
  const accentBord  = isDark ? "rgba(124,124,240,0.20)" : "rgba(108,99,255,0.15)";
  const hoverBg     = isDark ? "rgba(124,124,240,0.07)" : "rgba(108,99,255,0.04)";
  const hoverBord   = isDark ? "rgba(124,124,240,0.15)" : "rgba(108,99,255,0.10)";
  const nameColor   = isDark ? "#E0E0F0" : "#1A1A2E";
  const metaBg      = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const metaColor   = isDark ? "#68687A" : "#9090A8";
  const timeColor   = isDark ? "#E0E0F0" : "#1A1A2E";
  const ampmPm      = isDark ? "#7C7CF0" : "#6C63FF";
  const ampmAm      = isDark ? "#4A4A6A" : "#B8B8CC";
  const offsetClr   = isDark ? "#3A3A4A" : "#C0C0D0";

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 16px", margin: "0 8px 2px", borderRadius: 12,
        background: isActive ? accentBg : "transparent",
        border: `1px solid ${isActive ? accentBord : "transparent"}`,
        transition: "all 0.15s ease", cursor: "default",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background    = hoverBg;
          e.currentTarget.style.borderColor   = hoverBord;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background    = "transparent";
          e.currentTarget.style.borderColor   = "transparent";
        }
      }}
    >
      <AnalogClock tz={zone.id} size={46} isDark={isDark} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: nameColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
          {zone.name}
          {isActive && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", background: accentBg, color: accentMain, padding: "2px 6px", borderRadius: 4 }}>
              YOUR TZ
            </span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: metaColor, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", padding: "1px 5px", background: metaBg, borderRadius: 4, fontWeight: 500, letterSpacing: "0.02em" }}>
            {zone.abbr}
          </span>
          <span>{offset}</span>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em", color: timeColor, display: "flex", alignItems: "baseline", gap: 3 }}>
          {timeNum}
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: isAm ? ampmAm : ampmPm }}>
            {ampm}
          </span>
        </div>
        <div style={{ fontSize: 10, color: offsetClr, marginTop: 1, letterSpacing: "0.01em" }}>
          {offset}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TimezoneOffcanvas — dark aware
// ─────────────────────────────────────────────
function TimezoneOffcanvas({ open, onClose, region, zones, mainTz, isDark }) {
  const [query, setQuery]   = useState("");
  const searchRef           = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 260);
    else setQuery("");
  }, [open]);

  const filteredZones = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return zones;
    return zones.filter((z) =>
      z.name.toLowerCase().includes(q) ||
      z.city.toLowerCase().includes(q) ||
      z.abbr.toLowerCase().includes(q) ||
      z.id.toLowerCase().includes(q)
    );
  }, [zones, query]);

  // ── Dark tokens ──
  const panelBg       = isDark ? "rgba(20,20,28,0.98)"          : "#FAFAFD";
  const panelBorder   = isDark ? "rgba(255,255,255,0.08)"        : "rgba(108,99,255,0.12)";
  const panelShadow   = isDark
    ? "-20px 0 60px rgba(0,0,0,0.60), -4px 0 20px rgba(124,124,240,0.10)"
    : "-20px 0 60px rgba(10,10,40,0.10), -4px 0 20px rgba(108,99,255,0.06)";
  const headerBg      = isDark
    ? "linear-gradient(135deg, rgba(124,124,240,0.08) 0%, rgba(0,0,0,0) 100%)"
    : "linear-gradient(135deg, rgba(108,99,255,0.04) 0%, rgba(255,255,255,0) 100%)";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"        : "rgba(108,99,255,0.08)";
  const titleColor    = isDark ? "#F0F0F5"                        : "#1A1A2E";
  const subtitleColor = isDark ? "#68687A"                        : "#9090A8";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.08)"        : "#F0F0F6";
  const closeBtnBord  = isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.07)";
  const closeBtnClr   = isDark ? "#68687A"                        : "#9090A8";
  const searchBg      = isDark ? "rgba(30,30,42,0.90)"           : "#fff";
  const searchBorder  = isDark ? "rgba(124,124,240,0.20)"        : "rgba(108,99,255,0.15)";
  const searchFocBord = isDark ? "rgba(124,124,240,0.55)"        : "rgba(108,99,255,0.45)";
  const searchFocShdw = isDark ? "0 0 0 3px rgba(124,124,240,0.15)" : "0 0 0 3px rgba(108,99,255,0.10)";
  const searchColor   = isDark ? "#F0F0F5"                        : "#1A1A2E";
  const searchIcon    = isDark ? "#68687A"                        : "#9090A8";
  const clearBtnBg    = isDark ? "rgba(255,255,255,0.12)"        : "rgba(0,0,0,0.08)";
  const sectionLblClr = isDark ? "#3A3A4A"                        : "#C0C0D0";
  const overlayBg     = isDark ? "rgba(0,0,0,0.65)"              : "rgba(10,10,20,0.28)";
  const footerBorder  = isDark ? "rgba(255,255,255,0.06)"        : "rgba(108,99,255,0.07)";
  const footerHint    = isDark ? "#3A3A4A"                        : "#C0C0D0";
  const accentMain    = isDark ? "#7C7CF0"                        : "#6C63FF";
  const emptyIconBg   = isDark ? "rgba(124,124,240,0.10)"        : "rgba(108,99,255,0.06)";
  const emptyTitleClr = isDark ? "#A0A0B0"                        : "#9090A8";
  const emptySubClr   = isDark ? "#3A3A4A"                        : "#C0C0D0";
  const scrollThumb   = isDark ? "rgba(124,124,240,0.25)"        : "rgba(108,99,255,0.15)";
  const scrollThumbHov= isDark ? "rgba(124,124,240,0.45)"        : "rgba(108,99,255,0.30)";

  if (typeof document === "undefined") return null;

  const portal = (
    <>
      <style>{`
        @keyframes oc-fade { from { opacity:0; } to { opacity:1; } }
        .tz-list::-webkit-scrollbar { width: 4px; }
        .tz-list::-webkit-scrollbar-track { background: transparent; }
        .tz-list::-webkit-scrollbar-thumb { background: ${scrollThumb}; border-radius: 99px; }
        .tz-list::-webkit-scrollbar-thumb:hover { background: ${scrollThumbHov}; }
        .tz-search-input::placeholder { color: ${isDark ? "#3A3A4A" : "#B8B8CC"}; }
        .tz-search-input:focus { outline: none; }
      `}</style>

      {open && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: overlayBg,
          backdropFilter: "blur(3px)", zIndex: 99998,
          animation: "oc-fade 0.20s ease forwards",
        }} />
      )}

      <div
        role="dialog" aria-modal="true" aria-label={`${region} time zones`}
        style={{
          position: "fixed", top: 0, right: 0, height: "100%", width: 390,
          background: panelBg,
          backdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
          WebkitBackdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
          borderLeft: `1px solid ${panelBorder}`,
          zIndex: 99999, display: "flex", flexDirection: "column",
          boxShadow: panelShadow,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform", pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${headerBorder}`,
          flexShrink: 0, background: headerBg,
        }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: isDark
                  ? "linear-gradient(135deg, #7C7CF0 0%, #5B5BD6 100%)"
                  : "linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isDark
                  ? "0 4px 12px rgba(124,124,240,0.40)"
                  : "0 4px 12px rgba(108,99,255,0.30)",
              }}>
                <Globe size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: titleColor, letterSpacing: "-0.02em" }}>
                  {region} Time Zones
                </div>
                <div style={{ fontSize: 10.5, color: subtitleColor, marginTop: 1 }}>
                  {filteredZones.length} of {zones.length} zones · live
                </div>
              </div>
            </div>

            <button
              onClick={onClose} aria-label="Close timezone panel"
              style={{
                width: 30, height: 30, borderRadius: 9,
                border: `1px solid ${closeBtnBord}`,
                background: closeBtnBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: closeBtnClr, transition: "all 0.13s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background    = isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)";
                e.currentTarget.style.color         = "#DC2626";
                e.currentTarget.style.borderColor   = "rgba(239,68,68,0.30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background    = closeBtnBg;
                e.currentTarget.style.color         = closeBtnClr;
                e.currentTarget.style.borderColor   = closeBtnBord;
              }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: searchBg, border: `1.5px solid ${searchBorder}`,
              borderRadius: 10, padding: "8px 12px",
              boxShadow: isDark ? "0 1px 4px rgba(124,124,240,0.08)" : "0 1px 4px rgba(108,99,255,0.06)",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = searchFocBord;
              e.currentTarget.style.boxShadow   = searchFocShdw;
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = searchBorder;
              e.currentTarget.style.boxShadow   = isDark ? "0 1px 4px rgba(124,124,240,0.08)" : "0 1px 4px rgba(108,99,255,0.06)";
            }}
          >
            <Search size={14} color={searchIcon} style={{ flexShrink: 0 }} />
            <input
              ref={searchRef} className="tz-search-input"
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or timezone…"
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 13, fontWeight: 500, color: searchColor, fontFamily: "inherit",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: clearBtnBg, border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0, color: searchIcon, transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = clearBtnBg; }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        <div style={{
          padding: "10px 16px 4px",
          fontSize: 9.5, fontWeight: 700, color: sectionLblClr,
          textTransform: "uppercase", letterSpacing: "0.12em", flexShrink: 0,
        }}>
          {query ? `Results for "${query}"` : `All ${region} zones`}
        </div>

        {/* List */}
        <div className="tz-list" style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
          {filteredZones.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, background: emptyIconBg,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
              }}>
                <Search size={20} color={isDark ? "#3A3A4A" : "#C0C0D0"} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: emptyTitleClr }}>No zones found</div>
              <div style={{ fontSize: 11.5, color: emptySubClr, marginTop: 4 }}>
                Try searching by city or abbreviation
              </div>
            </div>
          ) : (
            filteredZones.map((zone) => (
              <TzRow key={zone.id} zone={zone} isActive={zone.id === mainTz} isDark={isDark} />
            ))
          )}
          <div style={{ height: 20 }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 16px",
          borderTop: `1px solid ${footerBorder}`,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "rgba(255,255,255,0.02)" : "transparent",
        }}>
          <span style={{ fontSize: 10.5, color: footerHint }}>Clocks update every second</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: accentMain, opacity: 0.7 }}>
            LIVE ●
          </span>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(portal, document.body);
}

// ─────────────────────────────────────────────
// ClockWidget — dark aware
// ─────────────────────────────────────────────
function ClockWidget({ isDark }) {
  const mainTz = getSafeTz();
  const region = getRegionPrefix(mainTz);

  const zones = useMemo(() => {
    const rawIds = getZonesForRegion(region);
    return rawIds
      .filter((id) => { try { Intl.DateTimeFormat(undefined, { timeZone: id }); return true; } catch { return false; } })
      .map(buildZoneMeta)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [region]);

  const [time,   setTime]   = useState("");
  const [date,   setDate]   = useState("");
  const [abbr,   setAbbr]   = useState("");
  const [ocOpen, setOcOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTime(fmtTz(mainTz, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
      setDate(fmtTz(mainTz, { weekday: "short", month: "short", day: "numeric" }));
      setAbbr(getTzAbbr(mainTz));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mainTz]);

  // ── Dark tokens ──
  const chipBg      = isDark ? "rgba(30,30,42,0.90)"          : "#F8F8FC";
  const chipBord    = isDark ? "rgba(124,124,240,0.18)"        : "rgba(108,99,255,0.12)";
  const chipShadow  = isDark ? "0 1px 3px rgba(124,124,240,0.10)" : "0 1px 3px rgba(108,99,255,0.06)";
  const chipHovBg   = isDark ? "rgba(40,40,56,0.95)"          : "#F0F0FA";
  const chipHovBord = isDark ? "rgba(124,124,240,0.35)"        : "rgba(108,99,255,0.25)";
  const chipHovShd  = isDark ? "0 2px 8px rgba(124,124,240,0.18)" : "0 2px 8px rgba(108,99,255,0.12)";
  const timeColor   = isDark ? "#F0F0F5"                        : "#1A1A2E";
  const dateColor   = isDark ? "#68687A"                        : "#B0B0C8";
  const abbrBg      = isDark
    ? "linear-gradient(135deg, rgba(124,124,240,0.20) 0%, rgba(91,91,214,0.25) 100%)"
    : "linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(139,128,255,0.15) 100%)";
  const abbrColor   = isDark ? "#A5B4FC"                        : "#5B5BD6";
  const globeBg     = isDark ? "transparent"                    : "transparent";
  const globeBord   = isDark ? "rgba(124,124,240,0.18)"        : "rgba(108,99,255,0.12)";
  const globeColor  = isDark ? "#7C7CF0"                        : "#6C63FF";
  const globeHovBg  = isDark ? "rgba(124,124,240,0.12)"        : "rgba(108,99,255,0.08)";
  const globeHovBord= isDark ? "rgba(124,124,240,0.35)"        : "rgba(108,99,255,0.30)";
  const globeHovShd = isDark ? "0 2px 8px rgba(124,124,240,0.20)" : "0 2px 8px rgba(108,99,255,0.15)";
  const globeShadow = isDark ? "0 1px 3px rgba(124,124,240,0.10)" : "0 1px 3px rgba(108,99,255,0.06)";
  const clockIcon   = isDark ? "#68687A" : "#9090A8";

  return (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {/* Digital chip */}
        <div
          role="button" tabIndex={0}
          // onClick={() => setOcOpen(true)}
          // onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOcOpen(true); }}
          title={`Your timezone: ${mainTz}. Click to see all ${region} zones`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 10px 5px 8px", borderRadius: 10,
            border: `1px solid ${chipBord}`, background: chipBg,
            cursor: "pointer", fontFamily: "'Inter', -apple-system, sans-serif",
            transition: "all 0.14s", userSelect: "none", boxShadow: chipShadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background   = chipHovBg;
            e.currentTarget.style.borderColor  = chipHovBord;
            e.currentTarget.style.boxShadow    = chipHovShd;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background   = chipBg;
            e.currentTarget.style.borderColor  = chipBord;
            e.currentTarget.style.boxShadow    = chipShadow;
          }}
        >
          <Clock size={13} color={clockIcon} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", color: timeColor }}>
            {time}
          </span>
          <span style={{ fontSize: 10, color: dateColor }}>{date}</span>
          <span style={{ fontSize: 9, fontWeight: 700, background: abbrBg, color: abbrColor, padding: "2px 6px", borderRadius: 5, letterSpacing: "0.04em" }}>
            {abbr}
          </span>
        </div>

        {/* Globe button */}
        {/* <button
          onClick={() => setOcOpen(true)}
          title={`View all ${region} time zones`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "5px 9px", borderRadius: 8,
            border: `1px solid ${globeBord}`,
            background: globeBg, cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: globeColor,
            fontFamily: "inherit", transition: "all 0.12s", boxShadow: globeShadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background   = globeHovBg;
            e.currentTarget.style.borderColor  = globeHovBord;
            e.currentTarget.style.boxShadow    = globeHovShd;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background   = globeBg;
            e.currentTarget.style.borderColor  = globeBord;
            e.currentTarget.style.boxShadow    = globeShadow;
          }}
        >
          <Globe size={11} />
          {region} zones
        </button> */}
      </div>

      <TimezoneOffcanvas
        open={ocOpen} onClose={() => setOcOpen(false)}
        region={region} zones={zones} mainTz={mainTz} isDark={isDark}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Header — main export
// ─────────────────────────────────────────────

export default function Header() {
  const { user, refetchUser }        = useAuth();
  const { collapsed, toggle, width } = useSidebar();
  const { theme, toggleTheme }       = useTheme();
  const isDark                       = theme === "dark";
  const [isPausing,    setIsPausing]    = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const callCtx          = useCall?.();
  const activeCallStatus = callCtx?.status;
  const hangup           = callCtx?.hangup;
  const electronAPI      = typeof window !== "undefined" ? window?.electronAPI : null;

  const isCallActive = activeCallStatus === "ON_CALL" || activeCallStatus === "DIALING" || activeCallStatus === "INCOMING";
  const canMakeCall  = user?.role === "AGENT" ? user?.additionalRole?.makeCall === true : true;
  const isAvailable  = user?.status === "AVAILABLE";
  const isPaused     = user?.status === "PAUSED";
  const isOffline    = !isAvailable && !isPaused;
 
  const togglePauseResume = async () => {
    if (isPausing || isOffline || !canMakeCall) return;
    setIsPausing(true);
    try {
      const newStatus = isPaused ? "AVAILABLE" : "PAUSED";
      await api.put(`/auth/status/${user?.id}`, { status: newStatus });
      toast.success(isPaused ? "Back online — ready for calls!" : "Paused — no incoming calls");
      refetchUser?.();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Status update failed");
    } finally { setIsPausing(false); }
  };

  const handleEndActiveCall = async () => {
    if (isEndingCall) return;
    setIsEndingCall(true);
    try {
      if (hangup) await hangup();
      electronAPI?.closeCallWindow?.();
      toast.success("Call ended");
    } catch { toast.error("Could not end call. Please try again."); }
    finally { setIsEndingCall(false); }
  };

  const handleReopenCallWindow = () => electronAPI?.openCallWindow?.();

  // ── Design tokens ──
  const headerBg    = isDark ? "rgba(23,23,31,0.94)"      : "rgba(255,255,255,0.88)";
  const headerBord  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.06)";
  const btnBg       = isDark ? "#1E1E28"                   : "#F6F7F9";
  const btnBord     = isDark ? "rgba(255,255,255,0.08)"   : "rgba(0,0,0,0.07)";
  const toggleColor = isDark ? "#A0A0B0"                   : "#6B6B7B";
  const themeColor  = isDark ? "#FBBF24"                   : "#6B6B7B";
  const textPrimary = isDark ? "#F0F0F5"                   : "#0D0D12";
  const textMuted   = isDark ? "#68687A"                   : "#9E9EAD";

  function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
    const [visible, setVisible] = React.useState(false);
    const tipBg = isDark ? "rgba(22,22,34,0.97)" : "#18182A";
    return (
      <div
        style={{ position: "relative", display: "inline-flex" }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
        {visible && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: tipBg,
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 10px",
            borderRadius: 7,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 99999,
            letterSpacing: "0.01em",
            boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
          }}>
            {text}
            <div style={{
              position: "absolute",
              bottom: "100%", left: "50%",
              transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: `5px solid ${tipBg}`,
            }} />
          </div>
        )}
      </div>
    );
  }
  // ── Shared buttons ──
  const toggleBtn = (
    <Tooltip text={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
      <button onClick={toggle} aria-label="Toggle Sidebar"
        style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${btnBord}`, background: btnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: toggleColor, transition: "background 140ms ease" }}>
        {collapsed ? <Menu style={{ width: 17, height: 17 }} /> : <PanelLeftClose style={{ width: 17, height: 17 }} />}
      </button>
    </Tooltip>
  );

// themeBtn definition mein title attribute hata do (optional), aur wrap karo:
const themeBtn = (
  <Tooltip text={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
    <button onClick={toggleTheme} aria-label="Toggle Theme"
      style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${btnBord}`, background: btnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: themeColor, transition: "all 140ms ease" }}>
      {isDark ? <Sun style={{ width: 17, height: 17 }} /> : <Moon style={{ width: 17, height: 17 }} />}
    </button>
  </Tooltip>
);

const refreshBtn = (
  <Tooltip text="Reload application">
    <button onClick={() => window.location.reload()} aria-label="Refresh App"
      style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${btnBord}`, background: btnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: toggleColor, transition: "all 140ms ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "#60A5FA" : "#2563EB"; e.currentTarget.style.borderColor = isDark ? "rgba(96,165,250,0.35)" : "rgba(37,99,235,0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = toggleColor; e.currentTarget.style.borderColor = btnBord; }}>
      <RefreshCw style={{ width: 17, height: 17 }} />
    </button>
  </Tooltip>
);

  const headerStyle: React.CSSProperties = {
    marginLeft: collapsed ? width - 80 : width - 270,
    position: "relative", height: 64,
    borderBottom: `1px solid ${headerBord}`,
    background: headerBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 16px", fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const HungCallBanner = isCallActive ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.07)",
      border: "1px solid rgba(239,68,68,0.20)", borderRadius: 10, padding: "6px 12px",
      animation: "callPulse 2s ease-in-out infinite",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", flexShrink: 0, animation: "dotBlink 1.4s ease-in-out infinite" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#FCA5A5" : "#B91C1C", letterSpacing: "-0.01em" }}>
        {activeCallStatus === "INCOMING" ? "Incoming call" : activeCallStatus === "DIALING" ? "Connecting…" : "Call in progress"}
      </span>
      <button onClick={handleReopenCallWindow} title="Open call window"
        style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 600, color: isDark ? "#FCA5A5" : "#DC2626", cursor: "pointer", fontFamily: "inherit", transition: "all 0.14s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <Phone size={11} /> Open
      </button>
      <button onClick={handleEndActiveCall} disabled={isEndingCall} title="End active call"
        style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#fff", cursor: isEndingCall ? "wait" : "pointer", fontFamily: "inherit", opacity: isEndingCall ? 0.7 : 1, transition: "all 0.14s", boxShadow: "0 2px 8px rgba(239,68,68,0.30)" }}
        onMouseEnter={(e) => { if (!isEndingCall) e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={(e) => { if (!isEndingCall) e.currentTarget.style.opacity = "1"; }}>
        {isEndingCall
          ? <span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          : <PhoneOff size={11} />}
        {isEndingCall ? "Ending…" : "End Call"}
      </button>
    </div>
  ) : null;

  // Admin / no-call layout
  if (!canMakeCall || user?.role === "ADMIN") {
    return (
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{toggleBtn}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ClockWidget isDark={isDark} />
          {/* Wallet removed for now (future use) — chip hidden
          {user?.role === "ADMIN" && <WalletChip isDark={isDark} /> } */} 
      
          {themeBtn}
          <Tooltip text="Check for App Updates"><span><UpdateButton /></span></Tooltip>
          {refreshBtn}
          {HungCallBanner}
          

          
        </div>
        <style>{KEYFRAMES}</style>
      </header>
    );
  }

  // Agent layout
  const statusColor = isAvailable ? "#17A363" : isPaused ? "#D38A00" : "#9E9EAD";
  const statusBg    = isAvailable ? "rgba(23,163,99,0.15)" : isPaused ? "rgba(211,138,0,0.15)" : "rgba(0,0,0,0.06)";

  return (
    <header style={headerStyle}>
      {/* LEFT */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {toggleBtn}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: statusColor, boxShadow: `0 0 0 3px ${statusBg}`, display: "inline-block", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, lineHeight: 1.2 }}>
              {isAvailable ? "Ready for Calls" : isPaused ? "Paused" : "Offline"}
            </div>
            <div style={{ fontSize: 11, color: textMuted }}>
              {isAvailable ? "You're live — customers can reach you" : isPaused ? "No incoming calls while paused" : "Log in to receive calls"}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ClockWidget isDark={isDark} />
        {themeBtn}
        <Tooltip text="Check for App Updates"><span><UpdateButton /></span></Tooltip>
        {refreshBtn}
        {HungCallBanner}
        <Tooltip text="Check & Reconnect Previous Call"><span><ReopenDialerButton isDark={isDark} /></span></Tooltip>
        {!isCallActive && (isAvailable || isPaused) && (
          <button onClick={togglePauseResume} disabled={isPausing}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 10, cursor: isPausing ? "wait" : "pointer",
              fontFamily: "inherit", opacity: isPausing ? 0.7 : 1, transition: "all 0.15s",
              border: isPaused ? "none" : `1px solid ${isDark ? "rgba(211,138,0,0.30)" : "rgba(211,138,0,0.20)"}`,
              background: isPaused
                ? "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)"
                : (isDark ? "rgba(211,138,0,0.12)" : "rgba(211,138,0,0.10)"),
              color: isPaused ? "#fff" : (isDark ? "#FCD34D" : "#92400E"),
              fontSize: 12, fontWeight: 600,
              boxShadow: isPaused ? "0 4px 14px rgba(91,91,214,0.30)" : "none",
            }}
            onMouseEnter={(e) => { if (!isPausing) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { if (!isPausing) e.currentTarget.style.opacity = "1"; }}>
            {isPausing ? (
              <>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Updating...
              </>
            ) : isPaused ? (
              <><Headphones style={{ width: 15, height: 15 }} /> Resume Calls</>
            ) : (
              <><HeadphoneOff style={{ width: 15, height: 15 }} /> Pause Calls</>
            )}
          </button>
        )}
      </div>

      <style>{KEYFRAMES}</style>
    </header>
  );
}

const KEYFRAMES = `
  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes dotBlink  { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes callPulse {
    0%,100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.12); }
    50%     { box-shadow: 0 0 0 4px rgba(239,68,68,0.04); }
  }
`;