// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { autoDialApi } from "./autoDialApi";
import api from "../api";

/* ─── Types ──────────────────────────────────────────────── */
export type DialState   = "idle" | "preview" | "dialing" | "on_call" | "cooldown";
export type DialingMode = "preview" | "progressive" | "power";

export interface AgentStatusData {
  autoDialEnabled: boolean;
  agentStatus: string;
  pendingCount: number;
  canDial: boolean;
}

export interface QueueItem {
  id: number;
  phoneNumber: string;
  status: string;
  priority?: number;
  contact?:  { firstName: string; lastName: string } | null;
  campaign?: { id: number; name: string; dialingMode: DialingMode } | null;
}

const MODE_COOLDOWN: Record<DialingMode, number> = {
  preview:     0,
  progressive: 2000,
  power:       0,
};

/* ─── Hook ───────────────────────────────────────────────── */
export function useAutoDialEngine(callEngine: any) {
  const [dialState, setDialState]     = useState<DialState>("idle");
  const [agentStatus, setAgentStatus] = useState<AgentStatusData | null>(null);
  const [queue, setQueue]             = useState<QueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<QueueItem | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);

  // ── All refs — no stale closures, no dep array issues ────
  const callEngineRef     = useRef(callEngine);
  const dialStateRef      = useRef<DialState>("idle");
  const processingRef     = useRef(false);
  const prevCallStatusRef = useRef<string>("OFFLINE");
  const currentItemRef    = useRef<QueueItem | null>(null);
  const agentStatusRef    = useRef<AgentStatusData | null>(null);
  const triggerRef        = useRef<() => Promise<void>>(async () => {});

  // Sync refs
  useEffect(() => { callEngineRef.current  = callEngine; },  [callEngine]);
  useEffect(() => { dialStateRef.current   = dialState; },   [dialState]);
  useEffect(() => { currentItemRef.current = currentItem; }, [currentItem]);
  useEffect(() => { agentStatusRef.current = agentStatus; }, [agentStatus]);

  const safeSetState = (s: DialState) => {
    dialStateRef.current = s;
    setDialState(s);
  };

  /* ── Data loaders ────────────────────────────────────────── */
  const loadStatus = useCallback(async (): Promise<AgentStatusData | null> => {
    try {
      const res = await autoDialApi.getAgentStatus();
      const s = res.data?.data as AgentStatusData;
      setAgentStatus(s);
      agentStatusRef.current = s;
      return s;
    } catch { return null; }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const res = await autoDialApi.getAgentQueue({ status: "pending" });
      setQueue(res.data?.data || []);
    } catch {}
  }, []);

  /* ── executeCall ─────────────────────────────────────────── */
  const executeCall = useCallback(async (item: QueueItem) => {
    safeSetState("dialing");
    setErrorMsg(null);

    try {
      await new Promise(r => setTimeout(r, 800));

      const callRes = await autoDialApi.startQueueCall(item.id);
      const conf    = callRes.data?.conferenceFriendlyName;
      if (!conf) throw new Error("conferenceFriendlyName missing");

      const engine = callEngineRef.current;
      if (!engine?.startAutoDialCall) throw new Error("Twilio device not ready");

      await engine.startAutoDialCall(item.phoneNumber, conf);

      const s = await loadStatus();
      if (s?.pendingCount && s.pendingCount > 0) await loadQueue();

    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Call failed";
      setErrorMsg(msg);
      setCurrentItem(null);
      currentItemRef.current = null;
      safeSetState("idle");
      processingRef.current = false;
    }
  }, []); // eslint-disable-line

  /* ── triggerNextCycle ────────────────────────────────────── */
  const triggerNextCycle = useCallback(async () => {
    // Guard 1: already running
    if (processingRef.current) return;

    // Guard 2: call engine busy — koi bhi active state nahi honi chahiye
    const cs = callEngineRef.current?.status;
    if (cs === "ON_CALL" || cs === "DIALING" || cs === "INCOMING") return;

    // Guard 3: sirf READY state mein chale
    if (cs !== "READY") return;

    // Guard 4: fresh backend check
    const s = await loadStatus();
    if (!s?.autoDialEnabled) return;
    if (!s?.canDial) return;
    // canDial = autoDialEnabled + AVAILABLE + pendingCount > 0

    // Guard 5: double check after async (call aa sakti thi beech mein)
    if (callEngineRef.current?.status !== "READY") return;
    if (processingRef.current) return;

    processingRef.current = true;

    try {
      const reserveRes = await autoDialApi.reserveNext();
      const item: QueueItem = reserveRes.data?.data;

      if (!item) {
        safeSetState("idle");
        return;
      }

      setCurrentItem(item);
      currentItemRef.current = item;

      const mode = (item.campaign?.dialingMode || "progressive") as DialingMode;

      if (mode === "preview") {
        safeSetState("preview");
        processingRef.current = false;
        return;
      }

      // progressive / power → auto-dial
      await executeCall(item);

    } catch {
      safeSetState("idle");
    } finally {
      processingRef.current = false;
    }
  }, []); // eslint-disable-line — all refs

  // Ref sync — har jagah triggerRef.current() use karo
  useEffect(() => { triggerRef.current = triggerNextCycle; }, [triggerNextCycle]);

  /* ── Poll: 15s ───────────────────────────────────────────────
   * Kaam:
   *   1. Status + queue refresh (hamesha)
   *   2. Recovery trigger — agar idle + canDial + READY mein stuck hai
   *      (device registration ke baad ya kisi failure ke baad restart)
   */
  useEffect(() => {
    const init = async () => {
      const s = await loadStatus();
      if (s?.pendingCount && s.pendingCount > 0) await loadQueue();

      // Mount par: agar already enabled + canDial → 1.5s baad trigger
      // (device ko register hone ka waqt dete hain)
      if (s?.canDial) {
        setTimeout(() => triggerRef.current(), 1500);
      }
    };
    init();

    const id = setInterval(async () => {
      const s = await loadStatus();
      if (s?.autoDialEnabled && s.pendingCount > 0) await loadQueue();

      // Recovery: agar idle state mein hain aur conditions sahi hain
      // triggerNextCycle ke andar guards hain — call-on-call impossible
      const isIdle = dialStateRef.current === "idle";
      const engineReady = callEngineRef.current?.status === "READY";
      if (s?.canDial && isIdle && !processingRef.current && engineReady) {
        triggerRef.current();
      }
    }, 15_000);

    return () => clearInterval(id);
  }, []); // eslint-disable-line — uses refs + triggerRef

  /* ── Call status watcher ──────────────────────────────────────
   *
   * CRITICAL rules:
   * 1. Sirf callEngine?.status dependency — aur kuch NAHI
   *    (currentItem dep → re-run → timer cancel → dialing stop)
   *
   * 2. Refs use karo andar — no stale closure
   *
   * 3. OFFLINE → READY: device register hua → trigger check
   * 4. ON_CALL/DIALING → READY: call khatam → cooldown → trigger
   */
  useEffect(() => {
    if (!callEngine) return;

    const curr = callEngine.status;
    const prev = prevCallStatusRef.current;
    prevCallStatusRef.current = curr;

    // ── Sync dialState with engine ──────────────────────────
    if (curr === "ON_CALL") { safeSetState("on_call"); return; }
    if (curr === "DIALING") { safeSetState("dialing"); return; }

    // ── OFFLINE → READY: Twilio device just registered ──────
    if (prev === "OFFLINE" && curr === "READY") {
      const s = agentStatusRef.current;
      // Agar autoDialEnabled tha aur canDial hai → start karo
      if (s?.canDial && dialStateRef.current === "idle" && !processingRef.current) {
        setTimeout(() => triggerRef.current(), 800);
      }
      return;
    }

    // ── ON_CALL / DIALING → READY: call khatam ──────────────
    if ((prev === "ON_CALL" || prev === "DIALING") && curr === "READY") {
      setCurrentItem(null);
      currentItemRef.current = null;
      safeSetState("cooldown");

      // Mode ke hisaab se cooldown (ref se — stale closure nahi)
      const lastMode = (currentItemRef.current?.campaign?.dialingMode || "progressive") as DialingMode;
      const delay    = prev === "ON_CALL" ? MODE_COOLDOWN[lastMode] : 1500;

      const timer = window.setTimeout(() => {
        safeSetState("idle");
        triggerRef.current(); // ref se call — dep nahi
      }, delay);

      return () => window.clearTimeout(timer);
      // Cleanup sirf callEngine.status change par — currentItem change se NAHI
    }

  }, [callEngine?.status]); // ← SIRF YE — kuch nahi

  /* ── callNow (Preview mode) ──────────────────────────────── */
  const callNow = useCallback(async () => {
    if (dialStateRef.current !== "preview") return;
    if (!currentItemRef.current) return;
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      await executeCall(currentItemRef.current);
    } finally {
      processingRef.current = false;
    }
  }, []); // eslint-disable-line

  /* ── skipContact ─────────────────────────────────────────── */
  const skipContact = useCallback(async () => {
    const item = currentItemRef.current;
    if (!item) return;

    try { await api.patch(`/voice/autodial/queue/${item.id}/skip`); } catch {}

    setCurrentItem(null);
    currentItemRef.current = null;
    safeSetState("idle");

    const s = await loadStatus();
    if (s?.pendingCount && s.pendingCount > 0) await loadQueue();
    setTimeout(() => triggerRef.current(), 400);
  }, []); // eslint-disable-line

  /* ── toggleAutoDial ──────────────────────────────────────── */
  const toggleAutoDial = useCallback(async (): Promise<boolean> => {
    const current = agentStatusRef.current;
    if (!current) return false;
    const next = !current.autoDialEnabled;

    try {
      await autoDialApi.toggleAgentAutoDial(next);
      const updated: AgentStatusData = {
        ...current,
        autoDialEnabled: next,
        canDial: next && current.pendingCount > 0 && current.agentStatus === "AVAILABLE",
      };
      setAgentStatus(updated);
      agentStatusRef.current = updated;

      if (next) {
        // Enable kiya — agar READY hai toh seedha trigger
        if (callEngineRef.current?.status === "READY") {
          setTimeout(() => triggerRef.current(), 500);
        }
        // Warna `OFFLINE → READY` watcher ya poll handle karega
      } else {
        // Disable kiya — sab reset
        safeSetState("idle");
        setCurrentItem(null);
        currentItemRef.current = null;
        processingRef.current  = false;
      }
      return true;
    } catch { return false; }
  }, []); // eslint-disable-line

  return {
    dialState, agentStatus, queue, currentItem, errorMsg,
    callNow, skipContact, toggleAutoDial, loadStatus,
  };
}
