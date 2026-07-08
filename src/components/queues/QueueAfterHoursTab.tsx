// src/components/queues/QueueAfterHoursTab.tsx
// @ts-nocheck

import React, { useState, useRef } from "react"
import {
  Moon,
  Upload,
  Play,
  Pause,
  Trash2,
  Type,
  Check,
  PhoneForwarded,
  Voicemail,
  User,
  Phone,
} from "lucide-react"

export default function QueueAfterHoursTab() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsText, setTtsText] = useState("")
  const [routing, setRouting] = useState("voicemail")

  const audioRef = useRef(null)

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setUploadedFile(file)
    setAudioUrl(url)
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()

    setIsPlaying(!isPlaying)
  }

  const deleteGreeting = () => {
    setUploadedFile(null)
    setAudioUrl("")
    setIsPlaying(false)
  }

  return (
    <div className="space-y-10 p-4">

      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Moon className="text-blue-600" />
        After Hours Routing
      </h3>

      {/* AFTER HOURS GREETING UPLOAD */}
      <div className="space-y-4">
        <h4 className="text-xl font-bold">After-Hours Greeting</h4>

        {!uploadedFile && (
          <label className="ringnex-card p-3 rounded-3xl border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition flex flex-col items-center gap-4 text-center">
            <Upload className="w-14 h-14 text-blue-500" />
            <p className="font-semibold text-lg text-gray-700">
              Upload after-hours greeting (MP3/WAV)
            </p>
            <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
          </label>
        )}

        {uploadedFile && (
          <div className="ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6">

            {/* FILE INFO */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-gray-900">{uploadedFile.name}</p>
                <p className="text-gray-600 text-sm">After-hours greeting</p>
              </div>

              <button
                onClick={deleteGreeting}
                className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>

            {/* PLAYER */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="ringnex-btn-primary rounded-full w-14 h-14 flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </button>

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <span className="text-gray-700 font-medium">Preview Greeting</span>
            </div>
          </div>
        )}
      </div>

      {/* TTS SECTION */}
      <div className="ringnex-card p-4 rounded-3xl border-2 shadow-xl space-y-6 mt-3">

        <h4 className="text-xl font-bold flex items-center gap-3">
          <Type className="text-orange-500" />
          Text-to-Speech (TTS)
        </h4>

        <textarea
          className="ringnex-input w-full text-lg h-32"
          placeholder="Type a message to speak when callers reach after hours..."
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
        />

        <button className="ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3">
          <Check className="w-6 h-6" />
          Generate TTS Audio
        </button>
      </div>

      {/* ROUTING OPTIONS */}
      <div className="ringnex-card p-4 rounded-3xl border-2 shadow-xl space-y-6 mt-3">
        
        <h4 className="text-xl font-bold">After-Hours Call Routing</h4>

        <div className="space-y-4">
          {/* VOICEMAIL */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="routing"
              value="voicemail"
              checked={routing === "voicemail"}
              onChange={() => setRouting("voicemail")}
              className="w-5 h-5 ringnex-radio"
            />
            <div className="flex items-center gap-2">
              <Voicemail className="text-purple-600 w-5 h-5" />
              <span className="text-gray-800 font-medium">Send to Voicemail</span>
            </div>
          </label>

          {/* AGENT */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="routing"
              value="agent"
              checked={routing === "agent"}
              onChange={() => setRouting("agent")}
              className="w-5 h-5 ringnex-radio"
            />
            <div className="flex items-center gap-2">
              <User className="text-blue-600 w-5 h-5" />
              <span className="text-gray-800 font-medium">Forward to Agent</span>
            </div>
          </label>

          {/* PHONE NUMBER */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="routing"
              value="phone"
              checked={routing === "phone"}
              onChange={() => setRouting("phone")}
              className="w-5 h-5 ringnex-radio"
            />
            <div className="flex items-center gap-2">
              <Phone className="text-green-600 w-5 h-5" />
              <span className="text-gray-800 font-medium">Forward to Phone Number</span>
            </div>
          </label>

          {/* IVR */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="routing"
              value="ivr"
              checked={routing === "ivr"}
              onChange={() => setRouting("ivr")}
              className="w-5 h-5 ringnex-radio"
            />
            <div className="flex items-center gap-2">
              <PhoneForwarded className="text-orange-600 w-5 h-5" />
              <span className="text-gray-800 font-medium">Send to IVR Menu</span>
            </div>
          </label>

          {/* HANG UP */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="routing"
              value="hangup"
              checked={routing === "hangup"}
              onChange={() => setRouting("hangup")}
              className="w-5 h-5 ringnex-radio"
            />
            <div className="flex items-center gap-2">
              <Trash2 className="text-red-600 w-5 h-5" />
              <span className="text-gray-800 font-medium">Disconnect Call</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
