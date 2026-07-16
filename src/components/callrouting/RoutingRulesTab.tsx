// src/components/call-routing/RoutingRulesTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  GitMerge,
  Clock,
  Users,
  PhoneForwarded,
  Plus,
  Trash2,
  Edit2,
  Filter,
} from "lucide-react"

export default function RoutingRulesTab() {
  const [rules, setRules] = useState([
    {
      id: 1,
      name: "Default Routing",
      condition: "Always",
      action: "Forward to Sales Queue",
    },
    {
      id: 2,
      name: "After Hours Routing",
      condition: "Time is between 6 PM – 9 AM",
      action: "Send to After-Hours IVR",
    },
    {
      id: 3,
      name: "Weekend Routing",
      condition: "If day is Saturday or Sunday",
      action: "Forward to Voicemail Box",
    },
  ])

  const deleteRule = (id: number) => {
    if (!confirm("Delete this rule?")) return
    setRules(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-10 p-3">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <GitMerge className="text-orange-500" />
          Routing Rules
        </h3>

        <button className="Ringnex-btn-primary px-6 py-3 flex items-center gap-3 text-lg">
          <Plus size={20} />
          Add Rule
        </button>
      </div>

      {/* RULE LIST */}
      <div className="space-y-8">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="Ringnex-card p-3 rounded-3xl shadow-xl border-2 border-gray-200 hover:shadow-2xl transition mt-3"
          >
            <div className="flex justify-between items-start">
              
              {/* LEFT */}
              <div className="space-y-4">

                {/* Rule Name */}
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="text-blue-600" />
                  {rule.name}
                </h4>

                {/* CONDITION */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock size={18} className="text-orange-500" />
                  <span className="font-medium">
                    Condition:{" "}
                    <span className="font-bold text-gray-900">{rule.condition}</span>
                  </span>
                </div>

                {/* ACTION */}
                <div className="flex items-center gap-3 text-gray-700">
                  <PhoneForwarded size={18} className="text-blue-600" />
                  <span className="font-medium">
                    Action:{" "}
                    <span className="font-bold text-gray-900">{rule.action}</span>
                  </span>
                </div>

              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl transition hover:scale-110">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                </button>

                <button
                  onClick={() => deleteRule(rule.id)}
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
