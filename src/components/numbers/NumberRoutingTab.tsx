// src/components/numbers/NumberRoutingTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { Shuffle, ArrowRight, PhoneForwarded } from "lucide-react"

export default function NumberRoutingTab({ numberId }) {
  const [routing, setRouting] = useState({
    mode: "Direct To Agent",
    forwardTo: "",
    ivr: "None",
  })

  return (
    <div className="space-y-10">

      <h3 className="text-2xl font-bold">Routing Rules</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* Routing Mode */}
        <div className="input-wrapper">
          <Shuffle className="input-icon" />
          <select
            value={routing.mode}
            onChange={(e) => setRouting({ ...routing, mode: e.target.value })}
          >
            <option>Direct To Agent</option>
            <option>Forwarding</option>
            <option>Send to IVR</option>
          </select>
          <label>Routing Mode</label>
        </div>

        {/* Forward Number */}
        {routing.mode === "Forwarding" && (
          <div className="input-wrapper">
            <PhoneForwarded className="input-icon" />
            <input
              placeholder=" "
              value={routing.forwardTo}
              onChange={(e) =>
                setRouting({ ...routing, forwardTo: e.target.value })
              }
            />
            <label>Forward To (Phone Number)</label>
          </div>
        )}

        {/* IVR Selector */}
        {routing.mode === "Send to IVR" && (
          <div className="input-wrapper">
            <ArrowRight className="input-icon" />
            <select
              value={routing.ivr}
              onChange={(e) =>
                setRouting({ ...routing, ivr: e.target.value })
              }
            >
              <option>None</option>
              <option>Main IVR</option>
              <option>Support IVR</option>
              <option>Sales IVR</option>
            </select>
            <label>Select IVR</label>
          </div>
        )}

      </div>

      <button className="ringnex-btn-primary px-8 py-3">Save Changes</button>
    </div>
  )
}
