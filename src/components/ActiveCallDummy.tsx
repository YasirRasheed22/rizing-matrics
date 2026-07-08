//@ts-nocheck
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Pause,
  PlayCircle,
  PhoneOff,
  Plus,
  Notebook,
  ArrowRight,
  Ban,
} from "lucide-react";
import BlockNumberConfirmModal from "./BlockNumberConfirmModal";
import { useState, useEffect, useRef } from "react";
import api from "../api";

interface ActiveCallBarProps {
  isMuted: boolean;
  isRecording: boolean;
  isOnHold: boolean;
  isSupervisedMode?: boolean;
  customerName: string;
  call:object;
  customerNumber: string;
  privileges?: any;
  onMute: () => void;
  onHold: () => void;
  onHangup: () => void;
  onAdd?: () => void;
  onNotes?: () => void;
  onMakeLead?: () => void;
  onBlock?: () => void;
}

export function ActiveCallDummy({
  isMuted,
  isOnHold,
  customerName,
  call,
  customerNumber,
  privileges,
  onMute,
  onHold,
  onHangup,
  onAdd = () => {},
  onNotes = () => {},
  onMakeLead = () => {},
  onBlock = () => {},
}: ActiveCallBarProps) {
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer start on mount, stop on unmount
  useEffect(() => {
    // Start timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Cleanup on unmount (jab component band ho)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // empty dependency → sirf mount/unmount pe chalega

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const handleBlockClick = () => {
    setShowBlockConfirm(true);
  };

  const handleConfirmBlock = async (reason: string) => {
    setShowBlockConfirm(false);

    try {
      await api.post("/voice/block-number", {
        number: customerNumber,
        reason: reason || null,
      });

      console.log(`Blocked ${customerNumber}. Reason: ${reason || "None"}`);

      // Hangup call kar denge
      onHangup();
    } catch (err) {
      console.error("Block failed:", err);
      alert("Failed to block number. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className=" bg-white/80"
    >
      <div   className="backdrop-blur-xl bg-white/80 border-white/40 rounded  overflow-hidden">

        {/* HEADER */}
        <div className="px-5 py-4 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-2 h-2 rounded-full bg-green-500"
            />
            <span className="text-lg font-semibold text-gray-800">
              {formatTime(duration)}
            </span>
          </div>

          {isOnHold && (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              On Hold
            </span>
          )}
        </div>

        {/* USER */}
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xl font-bold shadow-md">
            {customerName?.[0] || "U"}
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {customerName || "Unknown"}
            </div>
            <div className="text-sm text-gray-500">{customerNumber || '+000000000'}</div>
          </div>
        </div>
        {call.isTransferring && (
              <div className="bg-blue-100 text-blue-700 text-sm px-4 py-2 text-center">
                Transferring call...
              </div>
            )}

            {call.transferStatus === "SUCCESS" && (
              <div className="bg-green-100 text-green-700 text-sm px-4 py-2 text-center">
                Call transferred to {call.transferredTo}
              </div>
            )}

            {call.transferStatus === "FAILED" && (
              <div className="bg-red-100 text-red-700 text-sm px-4 py-2 text-center">
                Transfer failed
              </div>
            )}

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-4 px-4 py-4">
          <ActionButton
            active={isMuted}
            label="Mute"
            icon={isMuted ? <MicOff /> : <Mic />}
            onClick={onMute}
            activeColor="bg-red-500"
          />

          {privileges?.transfer && (
            <ActionButton
              label="Transfer"
              icon={<ArrowRight />}
              onClick={onAdd}
            />
          )}

          <ActionButton
            active={isOnHold}
            label="Hold"
            icon={isOnHold ? <PlayCircle /> : <Pause />}
            onClick={onHold}
            activeColor="bg-yellow-400"
          />

          <ActionButton
            label="Block"
            icon={<Ban />}
            onClick={handleBlockClick}
            activeColor="bg-red-500"
          />
          <ActionButton
            label="Make a lead"
            icon={<Plus />}
            onClick={onMakeLead}
            activeColor="bg-red-500"
          />

          {/* Notes & Lead commented out jaise pehle the */}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 flex justify-center bg-gray-50">
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={onHangup}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded "
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </motion.button>
        </div>
      </div>

      <BlockNumberConfirmModal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleConfirmBlock}
        customerNumber={customerNumber}
      />
    </motion.div>
  );
}

/* Reusable Button (same as before) */
function ActionButton({
  icon,
  label,
  onClick,
  active,
  activeColor = "bg-blue-500",
}: any) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`w-15 h-15 rounded-xl flex items-center justify-center shadow-md transition ${
          active ? `${activeColor} text-white` : "bg-white text-gray-700"
        }`}
      >
        {icon}
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </motion.button>
  );
}