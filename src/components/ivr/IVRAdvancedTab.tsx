// src/components/ivr/IVRAdvancedTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  GitMerge,
  Clock,
  RotateCw,
  KeyRound,
  Ban,
  CheckCircle,
  Hash,
} from "lucide-react"

export default function IVRAdvancedTab() {
  const [settings, setSettings] = useState({
    inputTimeout: 5,
    maxRetries: 3,
    invalidAction: "repeat",
    noInputAction: "operator",
    callerId: "allow",
    sipHeader: "",
  })

  const update = (field, value) => {
    setSettings({ ...settings, [field]: value })
  }

  return (
    <div className="space-y-10 p-3">
      
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <GitMerge className="text-orange-500" />
        Advanced IVR Settings
      </h3>

      {/* INPUT TIMEOUT */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <Clock className="text-blue-600" />
          Input Timeout (seconds)
        </label>
        <input
          type="number"
          min={1}
          className="Ringnex-input w-80 mt-3"
          value={settings.inputTimeout}
          onChange={(e) => update("inputTimeout", e.target.value)}
        />
      </div>

      {/* MAX RETRIES */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <RotateCw className="text-orange-500" />
          Max Retry Attempts
        </label>
        <input
          type="number"
          min={1}
          className="Ringnex-input w-80 mt-3"
          value={settings.maxRetries}
          onChange={(e) => update("maxRetries", e.target.value)}
        />
      </div>

      {/* INVALID KEY ACTION */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <KeyRound className="text-red-500" />
          Action on Invalid Key
        </label>

        <select
          className="Ringnex-input"
          value={settings.invalidAction}
          onChange={(e) => update("invalidAction", e.target.value)}
        >
          <option value="repeat">Repeat Menu</option>
          <option value="play-greeting">Replay Greeting</option>
          <option value="operator">Send to Operator</option>
          <option value="hangup">Hang Up</option>
        </select>
      </div>

      {/* NO INPUT ACTION */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <Ban className="text-purple-600" />
          No Input Action
        </label>

        <select
          className="Ringnex-input w-80 mt-2"
          value={settings.noInputAction}
          onChange={(e) => update("noInputAction", e.target.value)}
        >
          <option value="repeat">Repeat Menu</option>
          <option value="play-greeting">Replay Greeting</option>
          <option value="operator">Send to Operator</option>
          <option value="hangup">Hang Up</option>
        </select>
      </div>

      {/* CALLER ID POLICY */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <Hash className="text-green-600" />
          Caller ID Policy
        </label>

        <select
          className="Ringnex-input"
          value={settings.callerId}
          onChange={(e) => update("callerId", e.target.value)}
        >
          <option value="allow">Allow All</option>
          <option value="block-anonymous">Block Anonymous</option>
          <option value="block-all">Block All</option>
        </select>
      </div>

      {/* CUSTOM SIP HEADER */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <CheckCircle className="text-teal-600" />
          Custom SIP Header (optional)
        </label>

        <input
          type="text"
          className="Ringnex-input "
          placeholder="X-Custom: Value"
          value={settings.sipHeader}
          onChange={(e) => update("sipHeader", e.target.value)}
        />
      </div>

    </div>
  )
}
