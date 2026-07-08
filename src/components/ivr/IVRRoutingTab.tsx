//@ts-nocheck
import React, { useState } from "react"
import {
  PhoneForwarded,
  User,
  Users,
  GitBranch,
  Share2,
  Headphones,
} from "lucide-react"

export default function IVRRoutingTab() {
  const [routing, setRouting] = useState({
    type: "queue",
    target: "Support Queue",
  })

  const routingTypes = [
    { value: "queue", label: "Send to Queue", icon: Users },
    { value: "agent", label: "Route to Agent", icon: User },
    { value: "ivr", label: "Go to Another IVR", icon: GitBranch },
    { value: "external", label: "Forward to External Number", icon: Share2 },
    { value: "voicemail", label: "Send to Voicemail", icon: Headphones },
  ]

  return (
    <div className="space-y-10 p-3">

      <h3 className="text-2xl font-bold flex items-center gap-3">
        <PhoneForwarded className="text-orange-500" />
        Routing Rules
      </h3>

      <div className="ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-8">

        {/* ROUTING TYPE */}
        <div>
          <label className="text-sm font-bold text-gray-700">Routing Type</label>
            <br></br>
          <select
            value={routing.type}
            onChange={(e) => setRouting({ ...routing, type: e.target.value })}
            className="ringnex-input mt-3 w-80"
          >
            {routingTypes.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* TARGET FIELD */}
        <div>
          <label className="text-sm font-bold text-gray-700 mt-3">
            Target Destination
          </label>
                <br></br>
          <input
            type="text"
            className="ringnex-input mt-3 w-80"
            placeholder="Queue name, agent, number, IVR, etc."
            value={routing.target}
            onChange={(e) => setRouting({ ...routing, target: e.target.value })}
          />
        </div>

      </div>
    </div>
  )
}
