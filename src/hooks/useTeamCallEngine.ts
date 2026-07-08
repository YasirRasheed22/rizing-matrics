// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../main";
import type { TeamCallPeer, TeamCallStatus } from "../types/teamcall";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useTeamCallEngine({ disabled = false }: { disabled?: boolean } = {}) {
  const { user, token } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pendingCandidatesRef = useRef<any[]>([]);
  const pendingOfferRef = useRef<any>(null);

  const statusRef = useRef<TeamCallStatus>("IDLE");

  const [status, setStatus] = useState<TeamCallStatus>("IDLE");
  const [peer, setPeer] = useState<TeamCallPeer | null>(null);

  /* ───────── STATUS ───────── */
  const safeSetStatus = (s: TeamCallStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  /* ───────── AUDIO ELEMENT ───────── */
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.playsInline = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;

    return () => {
      audio.remove();
    };
  }, []);

  /* ───────── PEER CREATION ───────── */
  const createPeer = async (remoteId: any) => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit("teamcall:ice-candidate", {
          toUserId: remoteId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        safeSetStatus("ON_CALL");
      }
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        reset();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  /* ───────── MIC ───────── */
  const getMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  };

  /* ───────── RESET ───────── */
  const reset = () => {
    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;

    setPeer(null);
    safeSetStatus("IDLE");
  };

  /* ───────── START CALL ───────── */
  const startCall = useCallback(async (target: TeamCallPeer) => {
    if (!socketRef.current || statusRef.current !== "IDLE") return;

    try {
      setPeer(target);
      safeSetStatus("OUTGOING");

      const stream = await getMic();
      const pc = await createPeer(target.id);

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer); // ✅ FIXED ORDER

      socketRef.current.emit("teamcall:invite", {
        toUserId: target.id,
        offer: pc.localDescription,
        fromUser: {
          id: user?.id,
          name: user?.name,
        },
      });

    } catch (e) {
      console.error(e);
      reset();
    }
  }, [user]);

  /* ───────── ACCEPT ───────── */
  const accept = useCallback(async () => {
    if (!pendingOfferRef.current) return;

    const { offer, fromUser } = pendingOfferRef.current;

    const stream = await getMic();
    const pc = await createPeer(fromUser.id);

    await pc.setRemoteDescription(offer);

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit("teamcall:answer", {
      toUserId: fromUser.id,
      answer: pc.localDescription,
    });

    for (const c of pendingCandidatesRef.current) {
      await pc.addIceCandidate(c).catch(() => {});
    }

    pendingCandidatesRef.current = [];
  }, []);

  /* ───────── REJECT ───────── */
  const reject = useCallback(() => {
    if (pendingOfferRef.current) {
      socketRef.current?.emit("teamcall:reject", {
        toUserId: pendingOfferRef.current.fromUser.id,
      });
    }
    reset();
  }, []);

  /* ───────── HANGUP ───────── */
  const hangup = useCallback(() => {
    if (peer) {
      socketRef.current?.emit("teamcall:hangup", {
        toUserId: peer.id,
      });
    }
    reset();
  }, [peer]);

  /* ───────── SOCKET ───────── */
  useEffect(() => {
    if (!user?.id || !token || disabled) return;

    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-user-room", { userId: user.id });
    });

    socket.on("reconnect", () => {
      socket.emit("join-user-room", { userId: user.id }); // ✅ FIX
    });

    socket.on("teamcall:incoming", ({ offer, fromUser }) => {
      if (statusRef.current !== "IDLE") {
        socket.emit("teamcall:reject", {
          toUserId: fromUser.id,
        });
        return;
      }

      pendingOfferRef.current = { offer, fromUser };
      setPeer(fromUser);
      safeSetStatus("INCOMING");
    });

    socket.on("teamcall:answer", async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer);

      for (const c of pendingCandidatesRef.current) {
        await pcRef.current?.addIceCandidate(c).catch(() => {});
      }

      pendingCandidatesRef.current = [];
    });

    socket.on("teamcall:ice-candidate", async ({ candidate }) => {
      if (!candidate) return;

      try {
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch {}
    });

    socket.on("teamcall:rejected", reset);
    socket.on("teamcall:ended", reset);

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  return {
    status,
    peer,
    startCall,
    accept,
    reject,
    hangup,
  };
}