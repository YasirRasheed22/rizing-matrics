// src/components/queues/QueueGreetingTab.tsx
// @ts-nocheck

import React, { useState, useRef } from "react"
import {
  Upload,
  Play,
  Pause,
  Trash2,
  Mic,
  Type,
  Check,
  Volume2,
} from "lucide-react"

export default function QueueGreetingTab() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsText, setTtsText] = useState("")

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
        <Volume2 className="text-orange-500" />
        Queue Greeting Audio
      </h3>

      {/* UPLOAD */}
      {!uploadedFile && (
        <label className="Ringnex-card p-5 rounded-3xl border-2 border-dashed border-gray-300 text-center cursor-pointer hover:bg-gray-50 transition flex flex-col items-center gap-4">
          <Upload className="w-14 h-14 text-orange-500" />
          <p className="text-gray-700 font-semibold text-lg">
            Upload greeting audio (MP3/WAV)
          </p>
          <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
        </label>
      )}

      {/* AUDIO PLAYER */}
      {uploadedFile && (
        <div className="Ringnex-card p-6 rounded-3xl border-2 shadow-xl space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-gray-900">{uploadedFile.name}</p>
              <p className="text-gray-600 text-sm">Uploaded greeting</p>
            </div>

            <button
              onClick={deleteGreeting}
              className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
            >
              <Trash2 className="text-red-600 w-5 h-5" />
            </button>
          </div>

          {/* PLAY / PAUSE */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="Ringnex-btn-primary w-14 h-14 rounded-full flex items-center justify-center"
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

      {/* TEXT-TO-SPEECH */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6 mt-3">
        <h4 className="text-xl font-bold flex items-center gap-3">
          <Type className="text-blue-600" />
          Text-to-Speech (TTS)
        </h4>

        <textarea
          className="Ringnex-input w-full text-lg h-32"
          placeholder="Type a message to generate a TTS greeting..."
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
        />

        <button className="Ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3 mt-3">
          <Check className="w-6 h-6" />
          Generate TTS Greeting
        </button>
      </div>

      {/* RECORDING */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-4 mt-3 mb-3">
        <h4 className="text-xl font-bold flex items-center gap-3">
          <Mic className="text-red-500" />
          Record Greeting
        </h4>

        <p className="text-gray-600">
          Voice recording will be added during backend integration.
        </p>

        <button className="Ringnex-btn-secondary px-6 py-3 text-lg flex items-center gap-3">
          <Mic className="w-6 h-6" />
          Start Recording
        </button>
      </div>

    </div>
  )
}
