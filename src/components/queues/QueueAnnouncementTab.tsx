// src/components/queues/QueueAnnouncementTab.tsx
// @ts-nocheck

import React, { useState, useRef } from "react"
import {
  Upload,
  Play,
  Pause,
  Trash2,
  Type,
  Check,
  Volume2,
  RotateCcw,
  Clock,
} from "lucide-react"

export default function QueueAnnouncementTab() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsText, setTtsText] = useState("")
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState(30)

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

  const deleteAnnouncement = () => {
    setUploadedFile(null)
    setAudioUrl("")
    setIsPlaying(false)
  }

  return (
    <div className="space-y-10 p-4">

      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Volume2 className="text-orange-500" />
        Queue Announcements
      </h3>

      {/* UPLOAD AREA */}
      {!uploadedFile && (
        <label className="ringnex-card p-3 rounded-3xl border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition flex flex-col items-center gap-4 text-center">
          <Upload className="w-14 h-14 text-orange-500" />
          <p className="font-semibold text-lg text-gray-700">
            Upload announcement audio (MP3/WAV)
          </p>
          <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
        </label>
      )}

      {/* ANNOUNCEMENT FILE */}
      {uploadedFile && (
        <div className="ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6">
          
          {/* FILE HEADER */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-gray-900">{uploadedFile.name}</p>
              <p className="text-gray-600 text-sm">Uploaded announcement</p>
            </div>

            <button
              onClick={deleteAnnouncement}
              className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>

          {/* PLAYBACK */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="ringnex-btn-primary w-14 h-14 rounded-full flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>

            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <span className="text-gray-700 font-medium">Preview Announcement</span>
          </div>
        </div>
      )}

      {/* TTS SECTION */}
      <div className="ringnex-card p-3 mt-3 rounded-3xl border-2 shadow-xl space-y-6">

        <h4 className="text-xl font-bold flex items-center gap-3">
          <Type className="text-blue-600" />
          Text-to-Speech Announcement
        </h4>

        <textarea
          className="ringnex-input w-full h-32 text-lg"
          placeholder="Type a message to generate a TTS announcement..."
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
        />

        <button className="ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3 mt-3">
          <Check className="w-6 h-6" />
          Generate Announcement
        </button>
      </div>

      {/* REPEAT ANNOUNCEMENT SETTINGS */}
      <div className="ringnex-card p-3 mt-3 rounded-3xl border-2 shadow-xl space-y-6">
        
        <h4 className="text-xl font-bold flex items-center gap-3">
          <RotateCcw className="text-purple-500" />
          Repeat Announcement While Waiting
        </h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={repeatEnabled}
            onChange={(e) => setRepeatEnabled(e.target.checked)}
            className="w-6 h-6 ringnex-checkbox"
          />
          <span className="text-gray-800 font-medium">Enable repeating announcements</span>
        </label>

        {repeatEnabled && (
          <div className="flex items-center gap-4 mt-4">
            <Clock className="text-gray-500 w-6 h-6" />
            <span className="text-gray-700 font-medium">Repeat every:</span>

            <input
              type="number"
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(e.target.value)}
              min={10}
              className="ringnex-input w-32"
            />

            <span className="text-gray-700 font-medium">seconds</span>
          </div>
        )}

      </div>

    </div>
  )
}
