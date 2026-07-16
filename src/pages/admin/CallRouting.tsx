// src/pages/CallRoutingPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Plus,
  Phone,
  Search,
  ChevronRight,
  Route,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function CallRouting() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  // Dummy company numbers + routing rules
  const numbers = [
    {
      id: 1,
      number: "+1 (222) 555-1010",
      label: "Main Company Number",
      routing: "IVR Menu",
      type: "Main Line",
    },
    {
      id: 2,
      number: "+1 (222) 555-2020",
      label: "Support Line",
      routing: "Call Queue: Support",
      type: "Support",
    },
    {
      id: 3,
      number: "+1 (222) 555-3030",
      label: "Sales Line",
      routing: "Ring Group: Sales Team",
      type: "Sales",
    },
    {
      id: 4,
      number: "+1 (222) 555-4040",
      label: "After Hours Line",
      routing: "Voicemail",
      type: "After Hours",
    },
  ]

  const filtered = numbers.filter(
    (n) =>
      n.number.includes(search) ||
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.routing.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="Ringnex-page">

      {/* HEADER */}
      <div className="Ringnex-page-header">
        <div>
          <h1 className="Ringnex-title">Call Routing</h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage how incoming calls flow through your system
          </p>
        </div>

        <button className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg">
          <Plus size={22} />
          Add Routing Rule
        </button>
      </div>

      {/* ROUTING LIST CARD */}
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
              placeholder="Search numbers, labels, or routing..."
            />
          </div>

          <p className="text-gray-600 font-medium">
            {filtered.length} routing rule(s)
          </p>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-5 font-bold text-gray-700">Number</th>
                <th className="text-left p-5 font-bold text-gray-700">Label</th>
                <th className="text-left p-5 font-bold text-gray-700">Routing</th>
                <th className="text-right p-5 font-bold text-gray-700">Manage</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                //   onClick={() =>}
                >
                  {/* PHONE NUMBER */}
                  <td className="p-5 font-semibold text-gray-900">
                    <div className="flex items-center gap-3">
                      <Phone className="text-blue-500 w-5 h-5" />
                      {n.number}
                    </div>
                  </td>

                  {/* LABEL */}
                  <td className="p-5 font-medium text-gray-700">{n.label}</td>

                  {/* ROUTING DESTINATION */}
                  <td className="p-5 text-gray-700">
                    <div className="flex items-center gap-3">
                      <Route className="text-orange-500 w-5 h-5" />
                      {n.routing}
                    </div>
                  </td>

                  {/* MANAGE BUTTON */}
                  <td className="p-5 text-right">
                    <button
                    onClick={()=>{
                        // console.log(`/admin/call-routing/view/${n.id}`)
                        navigate(`/admin/call-routing/view/${n.id}`)
                    }}
                      className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110 flex items-center gap-1 ml-auto"
                    >
                      Manage
                      <ChevronRight className="w-5 h-5 text-blue-600" />
                    </button>
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
