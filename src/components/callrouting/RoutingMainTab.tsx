// src/components/callrouting/RoutingMainTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Route,
  PhoneForwarded,
  Users,
  Voicemail,
  Phone,
  ChevronRight,
} from "lucide-react"

export default function RoutingMainTab() {
  const [selectedRoute, setSelectedRoute] = useState("queue")

  const routingOptions = [
    {
      id: "ivr",
      label: "IVR Menu",
      description: "Route callers using a multi-option menu",
      icon: Route,
    },
    {
      id: "queue",
      label: "Call Queue",
      description: "Distribute calls to available agents",
      icon: PhoneForwarded,
    },
    {
      id: "ringGroup",
      label: "Ring Group",
      description: "Ring multiple agents at the same time",
      icon: Users,
    },
    {
      id: "agent",
      label: "Single Agent",
      description: "Send calls directly to a specific person",
      icon: Phone,
    },
    {
      id: "voicemail",
      label: "Voicemail",
      description: "Send calls to voicemail immediately",
      icon: Voicemail,
    },
  ]

  return (
    <div className="space-y-8 mt-3">

      <h3 className="text-2xl font-bold">Inbound Call Routing</h3>

      <p className="text-gray-600 text-md mb-4">
        Choose where calls should go when this number is dialed.
      </p>

      {/* ROUTING OPTIONS LIST */}
      <div className="grid gap-5">
        {routingOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedRoute(opt.id)}
            style={{borderRadius: 10}}
            className={`flex items-center justify-between p-2 rounded-3xl border-2 transition-all 
              ${
                selectedRoute === opt.id
                  ? "border-orange-500 bg-orange-50 shadow-md"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }
            `}
          >
            <div className="flex items-center gap-4">
              <opt.icon className="w-8 h-8 text-gray-700" />
              <div className="text-left">
                <p className="text-lg font-semibold text-gray-900">{opt.label}</p>
                <p className="text-gray-600 text-sm">{opt.description}</p>
              </div>
            </div>

            <ChevronRight className="text-gray-400 w-6 h-6" />
          </button>
        ))}
      </div>

      {/* SELECTED ROUTING CONFIG CARD */}
      <div className="Ringnex-card p-3 border-2 border-gray-200 rounded-3xl shadow-xl mt-5">

        <h4 className="text-xl font-bold mb-4">Selected Route</h4>

        <div className="bg-gray-50 p-2 rounded-2xl border">
          <p className="font-semibold text-gray-800 text-lg capitalize">
            {selectedRoute.replace(/([A-Z])/g, " $1")}
          </p>
          <p className="text-gray-600 text-sm mt-2">
            {selectedRoute === "ivr" && "Calls will go to your IVR menu flow."}
            {selectedRoute === "queue" && "Calls will enter your support or sales queue."}
            {selectedRoute === "ringGroup" && "Calls will ring multiple agents simultaneously."}
            {selectedRoute === "agent" && "Calls will be sent directly to an assigned agent."}
            {selectedRoute === "voicemail" && "Calls go straight to voicemail."}
          </p>
        </div>

        <button className="Ringnex-btn-primary px-6 py-3 mt-5">
          Save Routing Rule
        </button>
      </div>
    </div>
  )
}
