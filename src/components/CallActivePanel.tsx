//@ts-nocheck

import { Mic, MicOff, Pause, Play, PhoneOff } from "lucide-react";

export default function CallActivePanel({
  customerName,
  customerNumber,
  duration,
  isMuted,
  isOnHold,
}) {
  return (
    <div className="h-screen bg-white flex flex-col justify-between">
      {/* HEADER */}
      <div className="h-12 bg-indigo-600 text-white flex items-center justify-center">
        Ringnex (Beta) — Active Call
      </div>

      {/* USER */}
      <div className="flex flex-col items-center mt-10">
        <div className="h-24 w-24 rounded-full bg-indigo-500 text-white text-3xl flex items-center justify-center">
          {customerName?.[0] || "U"}
        </div>
        <h2 className="mt-4 text-xl font-bold">{customerName}</h2>
        <p className="text-gray-500">{customerNumber}</p>
        <p className="mt-2 text-sm">{format(duration)}</p>
      </div>

      {/* CONTROLS */}
      <div className="flex justify-around mb-10">
        <Btn
          icon={isMuted ? <MicOff /> : <Mic />}
          onClick={() =>
            window.electronAPI.sendCallAction("MUTE")
          }
        />
        <Btn
          icon={isOnHold ? <Play /> : <Pause />}
          onClick={() =>
            window.electronAPI.sendCallAction("HOLD")
          }
        />
        <Btn
          icon={<PhoneOff />}
          danger
          onClick={() =>
            window.electronAPI.sendCallAction("HANGUP")
          }
        />
      </div>
    </div>
  );
}

const Btn = ({ icon, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`h-16 w-16 rounded-full flex items-center justify-center ${
      danger ? "bg-red-600" : "bg-gray-200"
    }`}
  >
    {icon}
  </button>
);

const format = (s) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60)
    .toString()
    .padStart(2, "0")}`;
