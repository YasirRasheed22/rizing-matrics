// src/components/teams/InlineAudioPlayer.tsx
//@ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play, Pause, Download, Volume2, VolumeX,
  RotateCcw, Loader2, AlertCircle,
} from "lucide-react";

interface Props {
  src: string;
  user?: any;
}

// ── format mm:ss ──────────────────────────────────────────────────────────────
function fmt(sec: number): string {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InlineAudioPlayer({ src, user }: Props) {
  const audioRef    = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Stable refs — avoid stale closures in event handlers
  const draggingRef   = useRef(false);
  const wasPlayingRef = useRef(false);
  const durationRef   = useRef(0); // mirror of duration state for event handlers

  const [playing,   setPlaying]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [volume,    setVolume]    = useState(0.8);
  const [muted,     setMuted]     = useState(false);
  const [dragging,  setDragging]  = useState(false);

  const canDownload =
    user?.role === "ADMIN" || user?.additionalRole?.recording === true;

  // Keep durationRef in sync with state
  const updateDuration = useCallback((d: number) => {
    durationRef.current = d;
    setDuration(d);
  }, []);

  // ── On mount / src change: HEAD request to get Content-Length for duration ─
  // Twilio streams sometimes return Infinity for duration on the audio element.
  // A HEAD call returns the exact file size, from which we derive duration
  // using the known MP3 bitrate (128kbps is Twilio's default for recordings).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state
    setPlaying(false);
    setLoading(true);
    setError("");
    setCurrent(0);
    updateDuration(0);
    draggingRef.current   = false;
    wasPlayingRef.current = false;
    audio.load();

    // HEAD request to resolve Content-Length → approximate duration
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(src, { method: "HEAD" });
        if (cancelled) return;

        const contentLength = res.headers.get("content-length");
        if (contentLength) {
          const bytes    = parseInt(contentLength, 10);
          // MP3 duration = (fileBytes * 8) / bitrate
          // Twilio records at 128kbps by default
          const BITRATE  = 128_000; // bits per second
          const estimated = (bytes * 8) / BITRATE;
          if (isFinite(estimated) && estimated > 0) {
            updateDuration(estimated);
          }
        }
      } catch {
        // HEAD failed — fall through, audio element will set duration when it loads
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  // ── Audio event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay    = () => setLoading(false);
    const onLoadedMeta = () => {
      setLoading(false);
      if (isFinite(audio.duration) && audio.duration > 0) {
        updateDuration(audio.duration); // exact value from audio element — overrides estimate
      }
    };
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        updateDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => {
      if (!draggingRef.current) setCurrent(audio.currentTime);
      // Pick up real duration as soon as it becomes finite (fallback)
      if (isFinite(audio.duration) && audio.duration > 0) {
        updateDuration(audio.duration);
      }
    };
    const onEnded  = () => { setPlaying(false); setCurrent(0); audio.currentTime = 0; };
    const onPlay   = () => setPlaying(true);
    const onPause  = () => setPlaying(false);
    const onError  = (e: Event) => {
      const err = (e.target as HTMLAudioElement).error;
      const msgs: Record<number, string> = {
        1: "Playback aborted.",
        2: "Network error — check your connection.",
        3: "Decoding failed — file may be corrupted.",
        4: "Audio format not supported.",
      };
      setError(msgs[err?.code ?? 0] || "Failed to load audio.");
      setLoading(false);
      setPlaying(false);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    audio.addEventListener("canplay",        onCanPlay);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("error",          onError);
    audio.addEventListener("waiting",        onWaiting);
    audio.addEventListener("playing",        onPlaying);

    return () => {
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("error",          onError);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("playing",        onPlaying);
    };
  }, [updateDuration]);

  // ── Play / Pause ──────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    try {
      if (playing) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error("Play error:", err);
      setError("Playback failed. Try again.");
    }
  }, [playing, error]);

  // ── Restart ───────────────────────────────────────────────────────────────
  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrent(0);
    audio.play().catch(() => {});
  };

  // ── Scrub helper — used by both click and drag ────────────────────────────
  // Uses durationRef so it always reads the latest value without needing
  // it in the dependency array (avoids re-creating window listeners on every
  // duration tick during live streams)
  const scrubTo = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const bar   = progressRef.current;
    const dur   = durationRef.current;
    if (!audio || !bar || !isFinite(dur) || dur === 0) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t    = pct * dur;
    audio.currentTime = t;
    setCurrent(t);
  }, []); // stable — reads from refs, not state

  // ── Drag seek on progress bar ─────────────────────────────────────────────
  const onBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (durationRef.current === 0) return;

    draggingRef.current   = true;
    wasPlayingRef.current = !(audioRef.current?.paused ?? true);
    setDragging(true);

    // Pause while scrubbing
    audioRef.current?.pause();
    scrubTo(e.clientX);

    const onMove = (ev: MouseEvent) => scrubTo(ev.clientX);

    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);

      // Resume if it was playing before drag started
      if (wasPlayingRef.current) {
        audioRef.current?.play().catch(() => {});
      }

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };

    // Attach to window — drag still works if mouse leaves the bar
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [scrubTo]);

  // ── Volume ────────────────────────────────────────────────────────────────
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
  };

  // ── Progress percentage ───────────────────────────────────────────────────
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  // Show estimated label while audio hasn't confirmed duration yet
  const durationLabel = duration > 0 ? fmt(duration) : "--:--";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(91,91,214,0.15)",
        background: "linear-gradient(135deg, #F8F8FF 0%, #FAFAFF 100%)",
        padding: "16px 18px",
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxShadow: "0 2px 16px rgba(91,91,214,0.08)",
      }}
    >
      {/* Native audio element — hidden, proxied through backend */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        style={{ display: "none" }}
      />

      {/* ── Error state ── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(220,38,38,0.07)",
          border: "1px solid rgba(220,38,38,0.18)",
          marginBottom: 12,
        }}>
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 500 }}>{error}</span>
          <button
            onClick={() => { setError(""); setLoading(true); audioRef.current?.load(); }}
            style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 700,
              color: "#DC2626", background: "none", border: "none",
              cursor: "pointer", textDecoration: "underline",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!!error || loading}
          style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
            border: "none", cursor: error ? "not-allowed" : "pointer",
            background: error ? "#E5E7EB" : "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: error ? "none" : "0 4px 12px rgba(91,91,214,0.35)",
            transition: "all 0.15s",
            opacity: error ? 0.5 : 1,
          }}
        >
          {loading
            ? <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
            : playing
              ? <Pause size={16} />
              : <Play  size={16} style={{ marginLeft: 2 }} />}
        </button>

        {/* Progress + time */}
        <div style={{ flex: 1 }}>
          {/* Time row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#5B5BD6", fontFamily: "monospace" }}>
              {fmt(current)}
            </span>
            <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace" }}>
              {durationLabel}
            </span>
          </div>

          {/* Progress bar */}
          <div
            ref={progressRef}
            onMouseDown={onBarMouseDown}
            style={{
              height: 6, borderRadius: 3,
              background: "rgba(91,91,214,0.12)",
              cursor: duration > 0 ? (dragging ? "grabbing" : "grab") : "default",
              position: "relative", overflow: "hidden",
              userSelect: "none",
            }}
          >
            {/* Filled portion */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${pct}%`,
              borderRadius: 3,
              background: "linear-gradient(90deg, #5B5BD6, #7C3AED)",
              transition: dragging ? "none" : "width 0.1s linear",
            }} />
            {/* Thumb dot */}
            {duration > 0 && (
              <div style={{
                position: "absolute", top: "50%",
                left: `${pct}%`,
                transform: "translate(-50%, -50%)",
                width:  dragging ? 14 : 12,
                height: dragging ? 14 : 12,
                borderRadius: "50%",
                background: "#5B5BD6",
                border: "2px solid #fff",
                boxShadow: "0 1px 4px rgba(91,91,214,0.4)",
                pointerEvents: "none",
                transition: dragging ? "none" : "width 0.1s, height 0.1s",
              }} />
            )}
          </div>
        </div>

        {/* Restart */}
        <button
          onClick={restart}
          disabled={!!error}
          title="Restart"
          style={{
            width: 30, height: 30, borderRadius: 8, border: "none",
            background: "rgba(91,91,214,0.08)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#5B5BD6", flexShrink: 0,
            opacity: error ? 0.4 : 1,
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.16)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.08)")}
        >
          <RotateCcw size={13} />
        </button>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={toggleMute}
            style={{
              width: 28, height: 28, borderRadius: 7, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: muted ? "#CBD5E1" : "#5B5BD6",
            }}
          >
            {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.02}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            style={{
              width: 64, height: 4, borderRadius: 2,
              accentColor: "#5B5BD6", cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* ── Download button ── */}
      {canDownload && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <a
            href={src}
            download="recording.mp3"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              color: "#5B5BD6",
              background: "rgba(91,91,214,0.08)",
              border: "1px solid rgba(91,91,214,0.18)",
              textDecoration: "none",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.08)")}
          >
            <Download size={13} /> Download
          </a>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}