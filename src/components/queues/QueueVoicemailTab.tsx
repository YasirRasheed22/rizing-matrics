// src/components/queues/QueueVoicemailTab.tsx
// @ts-nocheck

import React, { useState, useRef } from "react"
import {
  Voicemail,
  Upload,
  Play,
  Pause,
  Trash2,
  Type,
  Check,
  Mail,
  Plus,
  Clock
} from "lucide-react"

export default function QueueVoicemailTab() {
  const [enabled, setEnabled] = useState(true)

  const [uploadedFile, setUploadedFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsText, setTtsText] = useState("")

  const [emails, setEmails] = useState(["support@company.com"])
  const [maxLength, setMaxLength] = useState(60)

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

  const addEmail = () => setEmails([...emails, ""])
  const updateEmail = (i, value) => {
    emails[i] = value
    setEmails([...emails])
  }
  const removeEmail = (i) => {
    emails.splice(i, 1)
    setEmails([...emails])
  }

  return (
    <div className="space-y-10 p-4">

      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Voicemail className="text-orange-500" />
        Voicemail Settings
      </h3>

      {/* ENABLE TOGGLE */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="ringnex-checkbox"
        />
        <span className="text-gray-800 font-semibold text-lg">Enable Voicemail</span>
      </label>

      {!enabled && (
        <p className="text-gray-500 italic">
          Voicemail is disabled. Callers will not be able to leave a message.
        </p>
      )}

      {enabled && (
        <>
          {/* GREETING UPLOAD */}
          <div className="space-y-4">
            <h4 className="text-xl font-bold">Voicemail Greeting</h4>

            {!uploadedFile && (
              <label className="ringnex-card p-4 rounded-3xl border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition flex flex-col items-center gap-4 text-center">
                <Upload className="w-14 h-14 text-orange-500" />
                <p className="font-semibold text-lg text-gray-700">
                  Upload voicemail greeting (MP3/WAV)
                </p>
                <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
              </label>
            )}

            {uploadedFile && (
              <div className="ringnex-card p-6 rounded-3xl border-2 shadow-xl space-y-6">

                {/* FILE HEADER */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{uploadedFile.name}</p>
                    <p className="text-gray-600 text-sm">Voicemail Greeting</p>
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

          {/* TTS */}
          <div className="ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6 mt-3">

            <h4 className="text-xl font-bold flex items-center gap-3">
              <Type className="text-blue-600" />
              Text-to-Speech (TTS)
            </h4>

            <textarea
              className="ringnex-input w-full text-lg h-32"
              placeholder="Type a message for the voicemail greeting..."
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
            />

            <button className="ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3 mt-3">
              <Check className="w-6 h-6" />
              Generate TTS Greeting
            </button>
          </div>

          {/* EMAIL NOTIFICATIONS */}
          <div className="ringnex-card p-4 rounded-3xl border-2 shadow-xl space-y-6 mt-3">
            <h4 className="text-xl font-bold flex items-center gap-3">
              <Mail className="text-purple-600" />
              Email Notifications
            </h4>

            {emails.map((email, index) => (
              <div key={index} className="flex items-center gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="ringnex-input w-90"
                  placeholder="email@example.com"
                />

                {index > 0 && (
                  <button
                    onClick={() => removeEmail(index)}
                    className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
                  >
                    <Trash2 className="text-red-600 w-5 h-5" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addEmail}
              className="ringnex-btn-secondary flex items-center gap-2 px-4 py-2 mt-3"
            >
              <Plus className="w-4 h-4" />
              Add Another Email
            </button>
          </div>

          {/* MAX LENGTH */}
          <div className="ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6 mt-3">

            <h4 className="text-xl font-bold flex items-center gap-3">
              <Clock className="text-gray-600" />
              Maximum Recording Length
            </h4>

            <div className="flex items-center gap-4">
              <input
                type="number"
                className="ringnex-input w-32"
                min={10}
                max={300}
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
              />
              <span className="font-medium text-gray-700">seconds</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
