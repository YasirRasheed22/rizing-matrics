// src/components/ivr/IVRKeypressActionsTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { Plus, PhoneForwarded, Users, Headphones, Trash2, Edit2 } from "lucide-react"

export default function IVRKeypressActionsTab() {
  const [actions, setActions] = useState([
    { key: "1", type: "Queue", target: "Support Queue" },
    { key: "2", type: "Agent", target: "John Doe" },
    { key: "3", type: "Voicemail", target: "General VM" },
  ])

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ key: "", type: "Queue", target: "" })
  const [editIndex, setEditIndex] = useState(null)

  const handleSave = () => {
    if (!form.key || !form.target) return

    if (editIndex !== null) {
      const updated = [...actions]
      updated[editIndex] = form
      setActions(updated)
    } else {
      setActions([...actions, form])
    }

    setForm({ key: "", type: "Queue", target: "" })
    setEditIndex(null)
    setShowModal(false)
  }

  const handleEdit = (index) => {
    setEditIndex(index)
    setForm(actions[index])
    setShowModal(true)
  }

  const handleDelete = (index) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Keypress Actions</h3>

        <button
          className="ringnex-btn-primary flex items-center gap-3 px-6 py-3 text-lg"
          onClick={() => setShowModal(true)}
        >
          <Plus size={22} />
          Add Keypress
        </button>
      </div>

      {/* Table */}
      <div className="ringnex-card p-6 rounded-3xl border-2 border-gray-200 bg-white shadow-xl overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="p-4 text-left font-bold text-gray-700">Key</th>
              <th className="p-4 text-left font-bold text-gray-700">Action Type</th>
              <th className="p-4 text-left font-bold text-gray-700">Destination</th>
              <th className="p-4 text-left font-bold text-gray-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {actions.map((a, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="p-4 font-semibold text-gray-800">{a.key}</td>
                <td className="p-4 text-gray-700">{a.type}</td>
                <td className="p-4 text-gray-700">{a.target}</td>

                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(i)}
                      className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110"
                    >
                      <Edit2 className="text-blue-600 w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(i)}
                      className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
                    >
                      <Trash2 className="text-red-600 w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="ringnex-modal-backdrop">
          <div className="ringnex-modal max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="ringnex-modal-header">
              <h2 className="ringnex-modal-title">
                {editIndex !== null ? "Edit Keypress" : "Add New Keypress"}
              </h2>
              <button className="ringnex-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className="ringnex-modal-body space-y-8">

              {/* Key */}
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder=" "
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  maxLength={1}
                />
                <label>Key (0–9)</label>
              </div>

              {/* Type */}
              <div className="input-group">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="Queue">Queue</option>
                  <option value="Agent">Agent</option>
                  <option value="Voicemail">Voicemail</option>
                  <option value="External Number">External Number</option>
                  <option value="Announcement">Announcement</option>
                </select>
                <label>Action Type</label>
              </div>

              {/* Target */}
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder=" "
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                />
                <label>Destination / Target</label>
              </div>

            </div>

            <div className="ringnex-modal-footer">
              <button className="ringnex-btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="ringnex-btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
