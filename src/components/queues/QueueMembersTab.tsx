// src/components/queues/QueueMembersTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  UserPlus,
  UserMinus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from "lucide-react"

export default function QueueMembersTab() {
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  // Dummy agents in queue
  const members = [
    { id: 1, name: "John Doe", status: "AVAILABLE" },
    { id: 2, name: "Sarah Smith", status: "BUSY" },
    { id: 3, name: "Emma Wilson", status: "OFFLINE" },
  ]

  // All dummy agents for add modal
  const allAgents = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Sarah Smith" },
    { id: 3, name: "Emma Wilson" },
    { id: 4, name: "Mike Johnson" },
    { id: 5, name: "David Miller" },
  ]

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center gap-2">
            <CheckCircle size={16} /> Available
          </span>
        )
      case "BUSY":
        return (
          <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center gap-2">
            <Clock size={16} /> Busy
          </span>
        )
      default:
        return (
          <span className="px-4 py-2 rounded-full bg-gray-200 text-gray-600 text-sm font-bold flex items-center gap-2">
            <XCircle size={16} /> Offline
          </span>
        )
    }
  }

  return (
    <div className="space-y-10 p-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Queue Members</h3>

        <button
          onClick={() => setShowAddModal(true)}
          className="ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg"
        >
          <UserPlus size={22} />
          Add Agents
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative w-96">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ringnex-input pl-14 pr-4 py-3 rounded-2xl"
          placeholder="Search agents..."
        />
      </div>

      {/* MEMBERS TABLE */}
      <div className="ringnex-card p-6 rounded-3xl border-2 shadow-xl overflow-x-auto mt-4 mb-5">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="text-left p-4 font-bold text-gray-700">Agent</th>
              <th className="text-left p-4 font-bold text-gray-700">Status</th>
              <th className="text-left p-4 font-bold text-gray-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="p-4 flex items-center gap-3 font-semibold">
                  <User className="text-blue-500 w-5 h-5" />
                  {m.name}
                </td>

                <td className="p-4">{getStatusBadge(m.status)}</td>

                <td className="p-4">
                  <button className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110">
                    <UserMinus className="text-red-600 w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div
          className="ringnex-modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="ringnex-modal max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ringnex-modal-header">
              <h2 className="ringnex-modal-title">Add Agents to Queue</h2>
              <button
                className="ringnex-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="ringnex-modal-body space-y-6">

              <div className="relative w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  className="ringnex-input pl-14 pr-4 py-3 rounded-2xl"
                  placeholder="Search agents..."
                />
              </div>

              {/* Agent list */}
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {allAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-4 ringnex-card rounded-2xl border flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <User className="text-blue-500 w-5 h-5" />
                      <span className="font-semibold text-lg">{agent.name}</span>
                    </div>

                    <button className="ringnex-btn-primary px-5 py-2 text-sm">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="ringnex-modal-footer">
              <button
                className="ringnex-btn-secondary px-6 py-3"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
