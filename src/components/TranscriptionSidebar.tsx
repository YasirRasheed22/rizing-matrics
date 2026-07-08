// TranscriptionSidebar.tsx
//@ts-nocheck
import { X, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InlineAudioPlayer from "../components/teams/InlineAudioPlayer";
import { useAuth } from "../context/AuthContext";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  transcript: any | null; // AssemblyAI transcript object
  recordingUrl: string;
  loading: boolean;
};

export default function TranscriptionSidebar({
  isOpen,
  onClose,
  transcript,
  recordingUrl,
  loading,
}: SidebarProps) {
  const {user} = useAuth();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200 overflow-y-auto"
        >
          <div className="p-5 flex items-center justify-between border-b">
            <h3 className="font-semibold text-lg">Call Conversation</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex flex-col items-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mb-3" />
                <p>Transcribing audio...</p>
              </div>
            ) : transcript ? (
              <div className="space-y-5">
                {/* Player */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <InlineAudioPlayer src={recordingUrl} user={user}/>
                </div>

                {/* Conversation */}
                {/* <p>{JSON.stringify(transcript)}</p> */}
                {transcript.utterances?.map((utt: any, i: number) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                        utt.displaySpeaker || utt.speaker === "Agent" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        utt.displaySpeaker || utt.speaker === "Agent"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <span className="font-bold block mb-1">
                        {utt.speaker || utt.displaySpeaker}
                      </span>
                      {utt.text}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {formatTimeFromMs(utt.start)} – {formatTimeFromMs(utt.end)}
                    </span>
                  </div>
                )) || <p className="text-gray-500">No transcription available</p>}
              </div>
            ) : (
              <p className="text-red-600">Failed to load transcription</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper
const formatTimeFromMs = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  return `${min}:${(sec % 60).toString().padStart(2, "0")}`;
};