// @ts-nocheck
// ============================================================================
//  UpdateButton.tsx  —  Nav-bar "Download" button + dropdown
//
//  Agents ko bar-bar manually download/install karne ki zaroorat nahi.
//  Nav bar mein ek Download button -> dropdown -> "Search for latest" ->
//  GitHub se latest build check -> auto download -> auto install (restart).
//
//  USAGE (apne Header / nav bar mein):
//      import UpdateButton from "./UpdateButton";
//      ...
//      <UpdateButton />        // bas itna, nav ke right side mein daal do
//
//  Ye electron-updater (main process) se baat karta hai via:
//      window.electronAPI.checkForAppUpdates()
//      window.electronAPI.installAppUpdate()
//      window.electronAPI.onAppUpdateStatus(cb)
//  (ye teeno preload.ts + main.ts mein add ho chuke hain.)
//
//  Web (bina electron) mein button khud chhup jaata hai.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, CheckCircle2, AlertCircle, RotateCw, Loader2 } from "lucide-react";

type Status = "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";

function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as any) || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) setTheme(e.newValue); };
    window.addEventListener("storage", h);
    const iv = setInterval(() => { try { const v = localStorage.getItem("theme") as any; if (v === "dark" || v === "light") setTheme(v); } catch {} }, 800);
    return () => { window.removeEventListener("storage", h); clearInterval(iv); };
  }, []);
  return theme;
}

export default function UpdateButton() {
  const isDark = useLocalTheme() === "dark";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [version, setVersion] = useState<string>("");
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const autoInstalledRef = useRef(false);

  const hasAPI = typeof window !== "undefined" && !!window.electronAPI?.checkForAppUpdates;

  // status events subscribe
  useEffect(() => {
    if (!hasAPI || !window.electronAPI?.onAppUpdateStatus) return;
    const unsub = window.electronAPI.onAppUpdateStatus((p: any) => {
      setStatus(p.status);
      if (p.version) setVersion(p.version);
      if (typeof p.percent === "number") setPercent(p.percent);
      if (p.message) setMessage(p.message);

      // available/downloading/downloaded pe dropdown khol do taaki agent ko dikhe
      if (["available", "downloading", "downloaded", "error"].includes(p.status)) setOpen(true);

      // ✅ Auto-install: build download hote hi apply + restart
      if (p.status === "downloaded" && !autoInstalledRef.current) {
        autoInstalledRef.current = true;
        setTimeout(() => { window.electronAPI?.installAppUpdate?.(); }, 1200);
      }
    });
    return unsub;
  }, [hasAPI]);

  // bahar click pe band
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!hasAPI) return null; // web mein chhupa do

  const check = async () => {
    autoInstalledRef.current = false;
    setStatus("checking"); setPercent(0); setMessage("");
    try { await window.electronAPI.checkForAppUpdates(); }
    catch (e: any) { setStatus("error"); setMessage(String(e?.message || e)); }
  };

  const installNow = () => window.electronAPI?.installAppUpdate?.();

  const C = {
    text:   isDark ? "#E0E0F0" : "#1A1A2E",
    muted:  isDark ? "#8A8AA0" : "#6B6B7B",
    bg:     isDark ? "#16161F" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    surf:   isDark ? "rgba(255,255,255,0.06)" : "#F6F7F9",
    accent: isDark ? "#7C7CF0" : "#6C63FF",
    accentBg: isDark ? "rgba(124,124,240,0.14)" : "rgba(108,99,255,0.08)",
    green:  "#22C55E", red: "#EF4444", amber: "#F59E0B",
  };

  // chip ke andar ka chhota indicator
  const dot =
    status === "downloading" || status === "available" ? C.amber :
    status === "downloaded" ? C.green :
    status === "error" ? C.red :
    status === "not-available" ? C.green : null;

  const statusLine = () => {
    switch (status) {
      case "checking":      return { icon: <Loader2 size={14} className="ub-spin" />, text: "Checking for updates…", color: C.muted };
      case "available":     return { icon: <Download size={14} />, text: `Update ${version ? "v" + version : ""} found — downloading…`, color: C.amber };
      case "downloading":   return { icon: <Download size={14} />, text: `Downloading… ${percent}%`, color: C.amber };
      case "downloaded":    return { icon: <RotateCw size={14} className="ub-spin" />, text: `Downloaded — restarting to apply…`, color: C.green };
      case "not-available": return { icon: <CheckCircle2 size={14} />, text: "You're on the latest version ✓", color: C.green };
      case "error":         return { icon: <AlertCircle size={14} />, text: message || "Update check failed", color: C.red };
      default:              return { icon: <RefreshCw size={14} />, text: "Check for the latest version", color: C.muted };
    }
  };
  const sl = statusLine();

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Nav-bar button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="App updates"
        style={{
          display: "flex", alignItems: "center", gap: 7,
          height: 36, padding: "0 12px", borderRadius: 10,
          border: `1px solid ${C.border}`, background: open ? C.accentBg : C.surf,
          color: C.text, cursor: "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, position: "relative",
        }}
      >
        <Download size={15} color={open ? C.accent : C.muted} />
        {dot && (
          <span style={{
            position: "absolute", top: 6, right: 8, width: 7, height: 7, borderRadius: "50%",
            background: dot, boxShadow: `0 0 0 2px ${C.bg}`,
          }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 280,
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 10, zIndex: 99999,
          boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.5)" : "0 12px 40px rgba(0,0,0,0.14)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, padding: "2px 4px 8px" }}>
            App Updates
          </div>

          {/* Action: Search for latest */}
          <button
            onClick={check}
            disabled={status === "checking" || status === "downloading"}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 9,
              padding: "10px 10px", borderRadius: 9, border: `1px solid ${C.border}`,
              background: C.surf, color: C.text, cursor: status === "checking" ? "default" : "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, marginBottom: 8,
              opacity: status === "checking" || status === "downloading" ? 0.6 : 1,
            }}
          >
            <RefreshCw size={15} color={C.accent} className={status === "checking" ? "ub-spin" : ""} />
            Search for latest
          </button>

          {/* Status line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", color: sl.color, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ display: "flex", flexShrink: 0 }}>{sl.icon}</span>
            <span style={{ lineHeight: 1.3 }}>{sl.text}</span>
          </div>

          {/* Progress bar */}
          {status === "downloading" && (
            <div style={{ height: 6, borderRadius: 999, background: C.surf, overflow: "hidden", margin: "6px 4px 2px" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: C.accent, transition: "width 0.2s ease" }} />
            </div>
          )}

          {/* Manual restart fallback */}
          {status === "downloaded" && (
            <button
              onClick={installNow}
              style={{
                width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 9, border: "none",
                background: C.green, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              <RotateCw size={14} /> Restart & Install now
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes ub-spin{to{transform:rotate(360deg)}} .ub-spin{animation:ub-spin 1s linear infinite}`}</style>
    </div>
  );
}
