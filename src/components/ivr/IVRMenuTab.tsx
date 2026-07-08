//@ts-nocheck
import React, { useState } from "react"
import {
  Plus,
  Trash2,
  Grid2x2,
  PhoneForwarded,
  Users,
  Volume2,
  Share2,
} from "lucide-react"

export default function IVRMenuTab() {
  const [menu, setMenu] = useState([
    { key: "1", action: "queue", target: "Sales Queue" },
    { key: "2", action: "queue", target: "Support Queue" },
    { key: "3", action: "greeting", target: "Billing Message" },
    { key: "0", action: "operator", target: "Main Operator" },
  ])

  const actions = [
    { value: "queue", label: "Send to Queue", icon: Users },
    { value: "greeting", label: "Play Greeting", icon: Volume2 },
    { value: "ivr", label: "Go to Sub-IVR", icon: Grid2x2 },
    { value: "external", label: "Forward to Number", icon: PhoneForwarded },
    { value: "operator", label: "Operator", icon: Share2 },
  ]

  const addKey = () => {
    setMenu([...menu, { key: "", action: "queue", target: "" }])
  }

  const updateItem = (index, field, value) => {
    const copy = [...menu]
    copy[index][field] = value
    setMenu(copy)
  }

  const deleteItem = (index) => {
    const copy = [...menu]
    copy.splice(index, 1)
    setMenu(copy)
  }

  return (
    <div className="space-y-8 p-3">

      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Grid2x2 className="text-orange-500" />
        Menu Options (DTMF)
      </h3>

      {/* MENU LIST */}
      <div className="space-y-6">
        {menu.map((item, i) => (
          <div
            key={i}
            className="ringnex-card p-3 mt-2 border-2 rounded-3xl shadow-xl space-y-4"
          >
            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg text-gray-800">
                Key: {item.key || "(unset)"}
              </h4>
              <button
                onClick={() => deleteItem(i)}
                className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>

            {/* KEY INPUT */}
            <div>
              <label className="text-sm font-bold text-gray-600">DTMF Key</label>
              <br></br>
              <input
                maxLength={1}
                placeholder="1"
                value={item.key}
                onChange={(e) => updateItem(i, "key", e.target.value)}
                className="ringnex-input w-60 mt-2"
              />
            </div>

            {/* ACTION SELECT */}
            <div>
              <label className="text-sm font-bold text-gray-600">Action</label>
              <br></br>
              <select
                value={item.action}
                onChange={(e) => updateItem(i, "action", e.target.value)}
                className="ringnex-input mt-2 w-60"
              >
                {actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* TARGET FIELD */}
            <div>
              <label className="text-sm font-bold text-gray-600">Target</label>
              <br></br>
              <input
                placeholder="Enter target (queue, number, sub-IVR, etc.)"
                value={item.target}
                onChange={(e) => updateItem(i, "target", e.target.value)}
                className="ringnex-input mt-2 w-60"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD NEW KEY */}
      <button
        onClick={addKey}
        className="ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3 rounded-2xl shadow-xl hover:scale-105 mt-3"
      >
        <Plus className="w-6 h-6" />
        Add Menu Key
      </button>

    </div>
  )
}
