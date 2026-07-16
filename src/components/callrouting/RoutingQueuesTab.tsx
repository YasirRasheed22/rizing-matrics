// src/components/call-routing/RoutingQueuesTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Users,
  Plus,
  Headphones,
  Clock,
  PhoneIncoming,
  Trash2,
  Edit2,
} from "lucide-react"

export default function RoutingQueuesTab() {
  const [queues, setQueues] = useState([
    {
      id: 1,
      name: "Sales Queue",
      agents: ["John", "Sarah", "Michael"],
      waitTime: "32 sec",
      callsWaiting: 3,
    },
    {
      id: 2,
      name: "Support Queue",
      agents: ["Emma", "David"],
      waitTime: "15 sec",
      callsWaiting: 1,
    },
    {
      id: 3,
      name: "Billing Queue",
      agents: ["Olivia"],
      waitTime: "0 sec",
      callsWaiting: 0,
    },
  ])

  const deleteQueue = (id: number) => {
    if (!confirm("Delete this queue?")) return
    setQueues(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-10 p-3">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Users className="text-blue-500" />
          Call Queues
        </h3>

        <button className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg">
          <Plus size={20} />
          Add Queue
        </button>
      </div>

      {/* QUEUE LIST */}
      <div className="space-y-8 mt-3" >
        {queues.map(queue => (
          <div
            key={queue.id}
            className="Ringnex-card p-3 rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition mt-3"
          >
            <div className="flex justify-between items-start">
              {/* LEFT SIDE (info) */}
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Headphones className="text-orange-500" />
                  {queue.name}
                </h4>

                <div className="flex items-center gap-3 text-gray-700">
                  <PhoneIncoming size={18} className="text-blue-600" />
                  <span className="font-medium">
                    Calls Waiting:{" "}
                    <span className="font-bold text-gray-900">
                      {queue.callsWaiting}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Clock size={18} className="text-orange-500" />
                  <span className="font-medium">
                    Avg Wait Time:{" "}
                    <span className="font-bold text-gray-900">
                      {queue.waitTime}
                    </span>
                  </span>
                </div>

                {/* Agents */}
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Agents:</p>
                  <div className="flex gap-2 flex-wrap">
                    {queue.agents.map((agent, i) => (
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

              {/* ACTIONS */}
              <div className="flex gap-3 mt-2">
                <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                </button>

                <button
                  onClick={() => deleteQueue(queue.id)}
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
