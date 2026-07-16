// src/pages/IVRListPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Plus,
  Search,
  ListVideo,
  Phone,
  Clock,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function IVR() {
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  // Dummy data
  const ivrs = [
    {
      id: 1,
      name: "Main IVR",
      number: "+1 (222) 555-2020",
      schedule: "Business Hours",
      status: "ACTIVE",
    },
    {
      id: 2,
      name: "After Hours IVR",
      number: "+1 (222) 555-5050",
      schedule: "After Hours",
      status: "ACTIVE",
    },
    {
      id: 3,
      name: "Holiday Menu",
      number: "Not Assigned",
      schedule: "Holiday Routing",
      status: "DRAFT",
    },
  ]

  const filtered = ivrs.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="Ringnex-page">

      {/* HEADER */}
      <div className="Ringnex-page-header">
        <div>
          <h1 className="Ringnex-title">IVR Menus</h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage call menus, greetings, and automated phone navigation
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/ivr/create")}
          className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg"
        >
          <Plus size={22} />
          Add New IVR
        </button>
      </div>

      {/* MAIN CARD */}
      <div className="Ringnex-card p-6 bg-white rounded-3xl shadow-xl border-2 border-gray-200">

        {/* SEARCH BAR */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="Ringnex-input pl-14 pr-4 py-3 rounded-2xl shadow-inner"
              placeholder="Search IVRs by name or number..."
            />
          </div>

          <p className="text-gray-600 font-medium">
            {filtered.length} IVR(s)
          </p>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-5 font-bold text-gray-700">IVR Name</th>
                <th className="text-left p-5 font-bold text-gray-700">Assigned Number</th>
                <th className="text-left p-5 font-bold text-gray-700">Schedule</th>
                <th className="text-left p-5 font-bold text-gray-700">Status</th>
                <th className="text-left p-5 font-bold text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((ivr) => (
                <tr
                  key={ivr.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  {/* IVR Name */}
                  <td
                    className="p-5 font-semibold text-gray-800 cursor-pointer"
                    onClick={() => navigate(`/admin/ivr/${ivr.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <ListVideo className="text-orange-500 w-5 h-5" />
                      {ivr.name}
                    </div>
                  </td>

                  {/* Assigned Number */}
                  <td className="p-5 text-gray-700">
                    <div className="flex items-center gap-3">
                      <Phone className="text-gray-400 w-5 h-5" />
                      {ivr.number}
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="p-5 text-gray-700">
                    <div className="flex items-center gap-3">
                      <Clock className="text-blue-500 w-5 h-5" />
                      {ivr.schedule}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="p-5">
                    {ivr.status === "ACTIVE" ? (
                      <span className="px-4 py-2 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 flex items-center gap-2 w-fit">
                        <CheckCircle size={16} />
                        Active
                      </span>
                    ) : (
                      <span className="px-4 py-2 rounded-full text-sm font-bold bg-gray-200 text-gray-700 flex items-center gap-2 w-fit">
                        <XCircle size={16} />
                        Draft
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/admin/ivr/view/${ivr.id}`)}
                        className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110"
                      >
                        <Edit2 className="w-5 h-5 text-blue-600" />
                      </button>

                      <button className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>

                      <button className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition hover:scale-110">
                        <Copy className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  )
}
