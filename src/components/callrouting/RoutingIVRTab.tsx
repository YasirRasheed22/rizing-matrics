// src/components/call-routing/RoutingIVRTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Menu,
  Volume2,
  Keyboard,
  Plus,
  Trash2,
  Upload,
  Edit2,
} from "lucide-react"

export default function RoutingIVRTab() {
  const [ivrList, setIvrList] = useState([
    {
      id: 1,
      name: "Main IVR",
      prompt: "Welcome to RingNex. Press 1 for Sales, 2 for Support.",
      options: [
        { key: "1", action: "Forward to Sales Queue" },
        { key: "2", action: "Forward to Support Queue" },
        { key: "9", action: "Voicemail" },
      ],
    },
    {
      id: 2,
      name: "After Hours IVR",
      prompt: "Our office is currently closed.",
      options: [{ key: "9", action: "Leave Voicemail" }],
    },
  ])

  const handleDelete = (id: number) => {
    if (!confirm("Delete this IVR menu?")) return
    setIvrList(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-10 p-3">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Menu className="text-blue-500" />
          IVR Menus
        </h3>

        <button className="ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg">
          <Plus size={20} />
          Add IVR Menu
        </button>
      </div>

      {/* IVR LIST */}
      <div className="space-y-8 mt-3">
        {ivrList.map(ivr => (
          <div
            key={ivr.id}
            className="ringnex-card p-3 rounded-3xl shadow-xl border-2 border-gray-200 hover:shadow-2xl transition mt-2" 
          >
            {/* HEADER */}
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{ivr.name}</h4>

                <div className="mt-4 flex items-start gap-3 text-gray-700">
                  <Volume2 className="text-orange-500 w-6 h-6" />
                  <p className="font-medium leading-relaxed">{ivr.prompt}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                </button>
                <button
                  onClick={() => handleDelete(ivr.id)}
                  className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            {/* OPTIONS */}
            <div className="mt-3">
              <h5 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Keyboard className="text-blue-500" />
                Key Press Options
              </h5>

              <div className="space-y-4">
                {ivr.options.map((opt, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200 mt-2" 
                  >
                    <div className="flex gap-6 items-center">
                      <span className="text-2xl font-extrabold text-orange-600 w-10 text-center">
                        {opt.key}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {opt.action}
                      </span>
                    </div>

                    <button className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110">
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* AUDIO UPLOAD */}
            <div className="mt-4">
              <button className="ringnex-btn-secondary flex items-center gap-3 px-5 py-2">
                <Upload size={18} />
                Upload New Prompt
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}
