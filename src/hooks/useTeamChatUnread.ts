//@ts-nocheck
// src/hooks/useTeamChatUnread.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "./firebase";
import { useAuth } from "../context/AuthContext";
import api from "../api";

/* ─── Electron API typing ─────────────────────────────────────────────── */
declare global {
  interface Window {
    electronAPI?: {
      notify?: (title: string, body: string) => void;
    };
  }
}

/* ─── Per-user localStorage key ─────────────────────────────────────────── */
const seenKey = (userId: string | number) => `tc_lastSeen_v2_${userId}`;

export function loadSeenMap(userId: string | number): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(seenKey(userId)) || "{}");
  } catch {
    return {};
  }
}

export function saveSeenMap(map: Record<string, number>, userId: string | number) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("tc_seen_updated"));
  } catch {}
}

/* ─── countUnread ───────────────────────────────────────────────────────── */
export function countUnread(
  msgs: Record<string, any> | null | undefined,
  myId: any,
  seenTs: number
): number {
  if (!msgs) return 0;

  return Object.values(msgs).filter((m: any) => {
    if (!m) return false;
    if (m.senderId == myId) return false;
    if (m.deleted === true) return false;
    if (m.hiddenFor?.[myId]) return false;
    if (m.type === "system") return false;

    const ts: number =
      typeof m.timestamp === "number" && m.timestamp > 0
        ? m.timestamp
        : m.time
          ? new Date(m.time).getTime()
          : 0;

    return ts > seenTs;
  }).length;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

function getMsgTs(m: any): number {
  if (!m) return 0;

  if (typeof m.timestamp === "number" && m.timestamp > 0) {
    return m.timestamp;
  }

  if (m.time) {
    const t = new Date(m.time).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  return 0;
}

function getMessagePreview(m: any): string {
  if (!m) return "New message";

  const text = typeof m.text === "string" ? m.text.trim() : "";
  if (text) return text;

  if (Array.isArray(m.attachments) && m.attachments.length > 0) {
    return "📎 Sent an attachment";
  }

  return "New message";
}

function canNotifyMessage(m: any, myId: any): boolean {
  if (!m) return false;
  if (m.senderId == myId) return false;
  if (m.deleted === true) return false;
  if (m.hiddenFor?.[myId]) return false;
  if (m.type === "system") return false;

  return true;
}

function notifyElectron(title: string, body: string) {
  try {
    if (window.electronAPI?.notify) {
      window.electronAPI.notify(title, body);
    }
  } catch {
    // notification failure should never break chat
  }
}

/* ─── useTeamChatUnread ─────────────────────────────────────────────────── */
export function useTeamChatUnread(): number {
  const { user } = useAuth();
  const myId = user?.id;

  const [totalUnread, setTotalUnread] = useState(0);

  const myTeamIdsRef = useRef<Set<string>>(new Set());
  const teamsMapRef = useRef<Record<string, any>>({});
  const agentsMapRef = useRef<Record<string, any>>({});

  /*
    notifySeenRef:
    - Prevents old Firebase messages from firing notifications on first load.
    - Stores unique keys per chat/message.
  */
  const notifySeenRef = useRef<Set<string>>(new Set());

  const snapRef = useRef<{
    individual: Record<string, Record<string, any>>;
    group: Record<string, Record<string, any>>;
    custom: Record<string, Record<string, any>>;
  }>({
    individual: {},
    group: {},
    custom: {},
  });

  const recalc = useCallback(() => {
    if (!myId) return;

    const seen = loadSeenMap(myId);
    let total = 0;

    Object.entries(snapRef.current.individual).forEach(([k, msgs]) => {
      total += countUnread(msgs, myId, seen[k] || 0);
    });

    Object.entries(snapRef.current.group).forEach(([k, msgs]) => {
      const teamId = k.replace("group_", "");
      if (!myTeamIdsRef.current.has(String(teamId))) return;

      total += countUnread(msgs, myId, seen[k] || 0);
    });

    Object.entries(snapRef.current.custom).forEach(([k, msgs]) => {
      total += countUnread(msgs, myId, seen[k] || 0);
    });

    setTotalUnread(total);
  }, [myId]);

  /* ─── Re-run when seenMap changes ─────────────────────────────────────── */
  useEffect(() => {
    window.addEventListener("tc_seen_updated", recalc);
    window.addEventListener("storage", recalc);

    return () => {
      window.removeEventListener("tc_seen_updated", recalc);
      window.removeEventListener("storage", recalc);
    };
  }, [recalc]);

  /*
    Fetch:
    1. Agents map => individual chat sender/partner name.
    2. Teams map + membership => group notifications only for participants.
  */
  useEffect(() => {
    if (!myId) return;

    api
      .get("/auth/all")
      .then((r) => {
        const list: any[] = Array.isArray(r.data) ? r.data : r.data?.data || [];
        const map: Record<string, any> = {};

        list.forEach((a: any) => {
          if (a?.id !== undefined && a?.id !== null) {
            map[String(a.id)] = a;
          }
        });

        agentsMapRef.current = map;
      })
      .catch(() => {
        console.warn("useTeamChatUnread: could not fetch agents");
      });

    api
      .get("/voice/team")
      .then((r) => {
        const teams: any[] = r.data?.data || [];
        const mine = teams
          .filter((t) => t.members?.some((m: any) => m.user?.id == myId))
          .map((t) => String(t.id));

        const teamMap: Record<string, any> = {};
        teams.forEach((t: any) => {
          if (t?.id !== undefined && t?.id !== null) {
            teamMap[String(t.id)] = t;
          }
        });

        teamsMapRef.current = teamMap;
        myTeamIdsRef.current = new Set(mine);

        recalc();
      })
      .catch(() => {
        console.warn("useTeamChatUnread: could not fetch teams, group counts may be inaccurate");
      });
  }, [myId, recalc]);

  /* ─── Firebase listeners + Electron notifications ─────────────────────── */
  useEffect(() => {
    if (!myId) return;

    let indInitial = true;
    let grpInitial = true;
    let cusInitial = true;

    /* ── Individual chats ──────────────────────────────────────────────── */
    const indRef = ref(db, "teamChats/");
    const indFn = (snap: any) => {
      snap.forEach((child: any) => {
        const rawChatId = child.key || "";
        const chatId = String(rawChatId);

        /*
          Safer participant check:
          Avoid includes() because user id 1 can wrongly match chat 10_12.
        */
        const parts = chatId.split("_").map(String);
        if (!parts.includes(String(myId))) return;

        const [a, b] = parts;
        const partnerId = String(a) === String(myId) ? b : a;
        const chatKey = `individual_${partnerId}`;
        const msgs = child.child("messages").val();

        if (msgs) {
          snapRef.current.individual[chatKey] = msgs;
        } else {
          delete snapRef.current.individual[chatKey];
        }

        Object.entries(msgs || {}).forEach(([msgKey, m]: any) => {
          const uniqueKey = `individual_${chatId}_${msgKey}`;

          if (indInitial) {
            notifySeenRef.current.add(uniqueKey);
            return;
          }

          if (notifySeenRef.current.has(uniqueKey)) return;
          notifySeenRef.current.add(uniqueKey);

          if (!canNotifyMessage(m, myId)) return;

          const senderName =
            m.senderName ||
            agentsMapRef.current[String(m.senderId)]?.name ||
            agentsMapRef.current[String(partnerId)]?.name ||
            "Team Member";

          /*
            Individual notification:
            Title: sender name
            Body: message
          */
          notifyElectron(senderName, getMessagePreview(m));
        });
      });

      if (indInitial) indInitial = false;
      recalc();
    };

    onValue(indRef, indFn);

    /* ── Team group chats ──────────────────────────────────────────────── */
    const grpRef = ref(db, "teamGroupChats/");
    const grpFn = (snap: any) => {
      snap.forEach((child: any) => {
        const teamId = String(child.key || "");
        const chatKey = `group_${teamId}`;
        const msgs = child.child("messages").val();

        if (msgs) {
          snapRef.current.group[chatKey] = msgs;
        } else {
          delete snapRef.current.group[chatKey];
        }

        /*
          Group notification only if current user is participant/member.
          Every participant running this app will receive their own notification.
        */
        if (!myTeamIdsRef.current.has(teamId)) return;

        Object.entries(msgs || {}).forEach(([msgKey, m]: any) => {
          const uniqueKey = `group_${teamId}_${msgKey}`;

          if (grpInitial) {
            notifySeenRef.current.add(uniqueKey);
            return;
          }

          if (notifySeenRef.current.has(uniqueKey)) return;
          notifySeenRef.current.add(uniqueKey);

          if (!canNotifyMessage(m, myId)) return;

          const team = teamsMapRef.current[teamId];
          const groupName = team?.name || "Team Group";
          const senderName =
            m.senderName ||
            agentsMapRef.current[String(m.senderId)]?.name ||
            "Someone";

          /*
            Group notification:
            Title: group name
            Body: sender name + message
          */
          notifyElectron(groupName, `${senderName}: ${getMessagePreview(m)}`);
        });
      });

      if (grpInitial) grpInitial = false;
      recalc();
    };

    onValue(grpRef, grpFn);

    /* ── Custom group chats ────────────────────────────────────────────── */
    const cusRef = ref(db, "customGroupChats/");
    const cusFn = (snap: any) => {
      snapRef.current.custom = {};

      snap.forEach((child: any) => {
        const groupId = String(child.key || "");
        const group = child.val();

        if (!group) return;
        if (group.deleted === true) return;
        if (!group?.participants?.[myId]) return;
        if (group?.hiddenFor?.[myId]) return;

        const chatKey = `custom-group_${groupId}`;

        if (group.messages) {
          snapRef.current.custom[chatKey] = group.messages;
        }

        Object.entries(group.messages || {}).forEach(([msgKey, m]: any) => {
          const uniqueKey = `custom_${groupId}_${msgKey}`;

          if (cusInitial) {
            notifySeenRef.current.add(uniqueKey);
            return;
          }

          if (notifySeenRef.current.has(uniqueKey)) return;
          notifySeenRef.current.add(uniqueKey);

          if (!canNotifyMessage(m, myId)) return;

          const groupName = group.name || "Group Chat";
          const senderName =
            m.senderName ||
            group.participantDetails?.[m.senderId]?.name ||
            agentsMapRef.current[String(m.senderId)]?.name ||
            "Someone";

          /*
            Custom group notification:
            Title: custom group name
            Body: sender name + message
          */
          notifyElectron(groupName, `${senderName}: ${getMessagePreview(m)}`);
        });
      });

      if (cusInitial) cusInitial = false;
      recalc();
    };

    onValue(cusRef, cusFn);

    return () => {
      off(indRef, "value", indFn);
      off(grpRef, "value", grpFn);
      off(cusRef, "value", cusFn);
    };
  }, [myId, recalc]);

  return totalUnread;
}