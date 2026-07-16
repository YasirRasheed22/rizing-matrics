// src/components/teams/TeamQueuesTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { PhoneCall, Trash2 } from "lucide-react"

export default function TeamQueuesTab({ teamId }) {

  // Dummy queues
  const [queues, setQueues] = useState([
    { id: 1, name: "Inbound Sales", calls: 320 },
    { id: 2, name: "Support Level 1", calls: 450 },
  ])

  return (
    <div className="space-y-8 p-3">

      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Assigned Queues</h3>
        <button className="Ringnex-btn-primary">+ Assign Queue</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="py-4 px-6 text-left">Queue</th>
              <th className="py-4 px-6">Monthly Calls</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queues.map((q) => (
              <tr key={q.id} className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 flex items-center gap-3">
                  <PhoneCall className="text-blue-500" />
                  {q.name}
                </td>
                <td className="text-center">{q.calls}</td>
                <td className="text-right py-4 px-6">
                  <button className="p-2 bg-red-50 hover:bg-red-100 rounded-xl">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
