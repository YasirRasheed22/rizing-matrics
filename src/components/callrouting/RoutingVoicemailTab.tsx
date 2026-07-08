// src/components/call-routing/RoutingVoicemailTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Voicemail,
  Users,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  HardDrive,
} from "lucide-react"

export default function RoutingVoicemailTab() {
  const [voicemails, setVoicemails] = useState([
    {
      id: 1,
      name: "Sales Voicemail",
      greeting: "sales-greeting.mp3",
      storageUsed: "32 MB",
      assignedTo: ["John", "Sarah"],
    },
    {
      id: 2,
      name: "Support Voicemail",
      greeting: "support-greeting.mp3",
      storageUsed: "81 MB",
      assignedTo: ["Emma", "Michael"],
    },
    {
      id: 3,
      name: "Billing Voicemail",
      greeting: "billing-greeting.mp3",
      storageUsed: "5 MB",
      assignedTo: ["Olivia"],
    },
  ])

  const deleteVoicemail = (id: number) => {
    if (!confirm("Delete this voicemail box?")) return
    setVoicemails(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="space-y-10 p-3">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Voicemail className="text-orange-500" />
          Voicemail Boxes
        </h3>

        <button className="ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg">
          <Plus size={20} />
          Add Voicemail Box
        </button>
      </div>

      {/* VOICEMAIL LIST */}
      <div className="space-y-8">
        {voicemails.map(vm => (
          <div
            key={vm.id}
            className="ringnex-card p-3 rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition mt-3"
          >
            {/* HEADER */}
            <div className="flex justify-between items-start">
              
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Voicemail className="text-blue-600" />
                  {vm.name}
                </h4>

                {/* GREETING */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Volume2 size={18} className="text-orange-500" />
                  <span className="font-medium">
                    Greeting: <span className="font-bold text-gray-900">{vm.greeting}</span>
                  </span>
                </div>

                {/* STORAGE */}
                <div className="flex items-center gap-3 text-gray-700">
                  <HardDrive size={18} className="text-blue-600" />
                  <span className="font-medium">
                    Storage Used:{" "}
                    <span className="font-bold text-gray-900">{vm.storageUsed}</span>
                  </span>
                </div>

                {/* ASSIGNED TO */}
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Assigned Agents:</p>

                  <div className="flex gap-2 flex-wrap">
                    {vm.assignedTo.map((agent, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 rounded-2xl bg-gray-100 border border-gray-200 text-sm font-medium text-gray-800"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col gap-3">
                <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                </button>

                <button
                  onClick={() => deleteVoicemail(vm.id)}
                  className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
