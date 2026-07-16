// src/pages/QueuesPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Plus,
  Users,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  Headphones,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Queues() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)

  // Dummy queues
  const queues = [
    {
      id: 1,
      name: "Support Queue",
      extension: "3001",
      members: 8,
      status: "ACTIVE",
    },
    {
      id: 2,
      name: "Sales Queue",
      extension: "3002",
      members: 5,
      status: "ACTIVE",
    },
    {
      id: 3,
      name: "Billing Queue",
      extension: "3003",
      members: 3,
      status: "INACTIVE",
    },
  ]

  const filtered = queues.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.extension.includes(search)
  )

  // New Queue Form
  const [form, setForm] = useState({
    name: "",
    extension: "",
  })

  const handleCreateQueue = (e) => {
    e.preventDefault()
    setShowModal(false)
    alert("Queue created (dummy). Connect to backend later.")
  }

  return (
    <div className="Ringnex-page">

      {/* HEADER */}
      <div className="Ringnex-page-header">
        <div>
          <h1 className="Ringnex-title">Call Queues</h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage your call distribution groups
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg"
        >
          <Plus size={22} />
          Add Queue
        </button>
      </div>

      {/* MAIN CARD */}
      <div className="Ringnex-card p-6 bg-white rounded-3xl shadow-xl border-2 border-gray-200">

        {/* SEARCH */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="Ringnex-input pl-14 pr-4 py-3 rounded-2xl shadow-inner"
              placeholder="Search queues by name or extension..."
            />
          </div>

          <p className="text-gray-600 font-medium">
            {filtered.length} queue(s)
          </p>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-5 font-bold text-gray-700">Queue</th>
                <th className="text-left p-5 font-bold text-gray-700">Extension</th>
                <th className="text-left p-5 font-bold text-gray-700">Members</th>
                <th className="text-left p-5 font-bold text-gray-700">Status</th>
                <th className="text-left p-5 font-bold text-gray-700"></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => navigate(`/admin/queues/view/${q.id}`)}
                >
                  <td className="p-5 font-semibold text-gray-800 flex items-center gap-3">
                    <Headphones className="text-orange-500 w-6 h-6" />
                    {q.name}
                  </td>

                  <td className="p-5 text-gray-700">{q.extension}</td>

                  <td className="p-5 text-gray-700">{q.members} Members</td>

                  <td className="p-5">
                    {q.status === "ACTIVE" ? (
                      <span className="px-4 py-2 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 flex items-center gap-2 w-fit">
                        <CheckCircle size={16} />
                        Active
                      </span>
                    ) : (
                      <span className="px-4 py-2 rounded-full text-sm font-bold bg-red-100 text-red-700 flex items-center gap-2 w-fit">
                        <XCircle size={16} />
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="p-5 text-gray-600">
                    <ChevronRight />
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

      {/* ADD QUEUE MODAL */}
      {showModal && (
        <div
          className="Ringnex-modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="Ringnex-modal max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Ringnex-modal-header">
              <h2 className="Ringnex-modal-title">Create New Queue</h2>

              <button
                onClick={() => setShowModal(false)}
                className="Ringnex-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQueue} className="p-6 space-y-8">

              {/* QUEUE NAME */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Queue Name
                </label>
                <input
                  type="text"
                  className="Ringnex-input mt-2"
                  placeholder="Support Queue"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* EXTENSION */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Extension
                </label>
                <input
                  type="text"
                  className="Ringnex-input mt-2"
                  placeholder="3001"
                  value={form.extension}
                  onChange={(e) =>
                    setForm({ ...form, extension: e.target.value })
                  }
                  required
                />
              </div>

              {/* SAVE BUTTON */}
              <button
                type="submit"
                className="Ringnex-btn-primary w-full py-3 text-lg rounded-2xl"
              >
                Create Queue
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
