// src/pages/ExtensionsPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Plus,
  Phone,
  User,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Settings,
  PhoneForwarded,
  Users,
  Radio
} from "lucide-react"

export default function Extensions() {
  const [search, setSearch] = useState("")
  const [showDrawer, setShowDrawer] = useState(false)

  // Wizard State
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    type: "",
    number: "",
    assignedTo: "",
  })

  // Dummy extension data
  const extensions = [
    { id: 101, number: "2001", agent: "John Doe", status: "ACTIVE" },
    { id: 102, number: "2002", agent: "Sarah Smith", status: "INACTIVE" },
    { id: 103, number: "2003", agent: "Emma Wilson", status: "ACTIVE" },
    { id: 104, number: "2004", agent: "Mike Johnson", status: "ACTIVE" },
  ]

  const filtered = extensions.filter(
    (ext) =>
      ext.number.includes(search) ||
      ext.agent.toLowerCase().includes(search.toLowerCase())
  )

  const resetModal = () => {
    setShowDrawer(false)
    setStep(1)
    setForm({ type: "", number: "", assignedTo: "" })
  }

  const handleSubmit = () => {
    console.log("NEW EXTENSION:", form)
    resetModal()
    alert("Extension Created (dummy mode)")
  }

  return (
    <div className="Ringnex-page">

      {/* HEADER */}
      <div className="Ringnex-page-header">
        <div>
          <h1 className="Ringnex-title">Extensions</h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage all phone extensions assigned to agents
          </p>
        </div>

        <button
          onClick={() => setShowDrawer(true)}
          className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg"
        >
          <Plus size={22} />
          Add Extension
        </button>
      </div>

      {/* CARD WRAPPER */}
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
              placeholder="Search by extension or agent..."
            />
          </div>

          <p className="text-gray-600 font-medium">
            {filtered.length} extension(s)
          </p>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-5 font-bold text-gray-700">Extension</th>
                <th className="text-left p-5 font-bold text-gray-700">Assigned Agent</th>
                <th className="text-left p-5 font-bold text-gray-700">Status</th>
                <th className="text-left p-5 font-bold text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((ext) => (
                <tr
                  key={ext.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="p-5 font-semibold text-gray-800">
                    <div className="flex items-center gap-3">
                      <Phone className="text-blue-500 w-5 h-5" />
                      {ext.number}
                    </div>
                  </td>

                  <td className="p-5 text-gray-700">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-400 w-5 h-5" />
                      {ext.agent}
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="p-5">
                    {ext.status === "ACTIVE" ? (
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

                  {/* ACTIONS */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110">
                        <Edit2 className="w-5 h-5 text-blue-600" />
                      </button>
                      <button className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>

      {/* ----------------------------------------------------------
         ADD EXTENSION DRAWER (Multi-Step Wizard)
      ----------------------------------------------------------- */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50"
             onClick={resetModal}>

          <div
            className="w-[450px] h-full bg-white shadow-2xl border-l-2 border-gray-200 p-5 overflow-y-auto Ringnex-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 ">
              <h2 className="text-3xl font-bold">
                Add New Extension
              </h2>
              <button
                onClick={resetModal}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* STEP INDICATOR */}
            <div className="flex justify-between mb-8">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 mx-1 rounded-full ${
                    step >= s ? "bg-orange-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* STEP 1 — TYPE */}
            {step === 1 && (
              <div>
                <h3 className="text-xl font-bold mb-4">Select Extension Type</h3>

                <div className="grid gap-4">

                  {[
                    { id: "user", label: "User Extension", icon: User },
                    { id: "team", label: "Team Extension", icon: Users },
                    { id: "ivr", label: "IVR / Auto-Receptionist", icon: Radio },
                    { id: "queue", label: "Call Queue", icon: PhoneForwarded },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setForm({ ...form, type: option.id })}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition 
                        ${form.type === option.id ? 
                          "border-orange-500 bg-orange-50" : 
                          "border-gray-200 bg-gray-50 hover:bg-gray-100"}
                      `}
                    >
                      <option.icon className="w-6 h-6 text-gray-700" />
                      <span className="font-semibold">{option.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  disabled={!form.type}
                  onClick={() => setStep(2)}
                  className="Ringnex-btn-primary w-full py-3 mt-5"
                >
                  Next <ChevronRight />
                </button>
              </div>
            )}

            {/* STEP 2 — NUMBER */}
            {step === 2 && (
              <div>
                <h3 className="text-xl font-bold mb-6">Extension Number</h3>

                <div className="input-group mb-6">
                  <Phone className="input-icon" />
                  <input
                    type="text"
                    placeholder=" "
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: e.target.value })
                    }
                  />
                  <label>Enter Extension Number</label>
                </div>

                <div className="flex justify-between mt-5">
                  <button
                    onClick={() => setStep(1)}
                    className="Ringnex-btn-secondary flex items-center gap-2"
                  >
                    <ChevronLeft /> Back
                  </button>

                  <button
                    disabled={!form.number}
                    onClick={() => setStep(3)}
                    className="Ringnex-btn-primary flex items-center gap-2"
                  >
                    Next <ChevronRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — ASSIGN TO */}
            {step === 3 && (
              <div>
                <h3 className="text-xl font-bold mb-6">Assign Extension</h3>

                <div className="input-group mb-6">
                  <User className="input-icon" />
                  <select
                    className="w-full"
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                  >
                    <option value="">Select Agent</option>
                    <option value="1">John Doe</option>
                    <option value="2">Sarah Smith</option>
                    <option value="3">Mike Johnson</option>
                  </select>
                  <label>Select Owner</label>
                </div>

                <div className="flex justify-between mt-5">
                  <button
                    onClick={() => setStep(2)}
                    className="Ringnex-btn-secondary flex items-center gap-2"
                  >
                    <ChevronLeft /> Back
                  </button>

                  <button
                    disabled={!form.assignedTo}
                    onClick={() => setStep(4)}
                    className="Ringnex-btn-primary flex items-center gap-2"
                  >
                    Next <ChevronRight />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 — REVIEW */}
            {step === 4 && (
              <div>
                <h3 className="text-xl font-bold mb-6">Review Information</h3>

                <div className="space-y-4 bg-gray-50 p-3 rounded-2xl border">

                  <div className="flex justify-between">
                    <p className="font-semibold">Type:</p>
                    <p>{form.type}</p>
                  </div>

                  <div className="flex justify-between">
                    <p className="font-semibold">Extension Number:</p>
                    <p>{form.number}</p>
                  </div>

                  <div className="flex justify-between">
                    <p className="font-semibold">Assigned To:</p>
                    <p>{form.assignedTo}</p>
                  </div>

                </div>

                <div className="flex justify-between mt-5">
                  <button
                    onClick={() => setStep(3)}
                    className="Ringnex-btn-secondary flex items-center gap-2"
                  >
                    <ChevronLeft /> Back
                  </button>

                  <button
                    onClick={handleSubmit}
                    className="Ringnex-btn-primary flex items-center gap-2"
                  >
                    <Check /> Create Extension
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
