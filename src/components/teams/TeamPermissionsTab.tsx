// src/components/teams/TeamPermissionsTab.tsx
// @ts-nocheck

import React, { useState } from "react"

export default function TeamPermissionsTab({ teamId }) {

  const [permissions, setPermissions] = useState({
    canViewReports: true,
    canWhisper: false,
    canMonitor: true,
    canBarge: false,
    canDeleteRecordings: false,
  })

  const toggle = (key) =>
    setPermissions({ ...permissions, [key]: !permissions[key] })

  return (
    <div className="space-y-8 p-3">

      <h3 className="text-2xl font-bold">Permissions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {Object.entries(permissions).map(([key, value]) => (
          <label key={key} className="flex items-center gap-3 text-lg font-medium">
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggle(key)}
              className="Ringnex-checkbox"
            />
            {key.replace(/([A-Z])/g, " $1").trim()}
          </label>
        ))}

      </div>
    </div>
  )
}
