//@ts-nocheck
import React, { useState } from "react"
import { Clock, Calendar, Plus, Trash2 } from "lucide-react"
import { DateInput } from "../ui/AppDatePicker"

export default function IVRSchedulesTab() {
  const [businessHours, setBusinessHours] = useState([
    { day: "Monday", start: "09:00", end: "17:00" },
    { day: "Tuesday", start: "09:00", end: "17:00" },
    { day: "Wednesday", start: "09:00", end: "17:00" },
    { day: "Thursday", start: "09:00", end: "17:00" },
    { day: "Friday", start: "09:00", end: "17:00" },
  ])

  const [holidays, setHolidays] = useState([
    { name: "New Year", date: "2025-01-01" },
    { name: "Christmas", date: "2025-12-25" },
  ])

  const updateHours = (index, field, value) => {
    const copy = [...businessHours]
    copy[index][field] = value
    setBusinessHours(copy)
  }

  const addHoliday = () => {
    setHolidays([...holidays, { name: "", date: "" }])
  }

  const updateHoliday = (i, f, v) => {
    const copy = [...holidays]
    copy[i][f] = v
    setHolidays(copy)
  }

  const removeHoliday = (i) => {
    const copy = [...holidays]
    copy.splice(i, 1)
    setHolidays(copy)
  }

  return (
    <div className="space-y-10 p-3">

      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Clock className="text-orange-500" />
        IVR Schedules
      </h3>

      {/* BUSINESS HOURS */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-6">
        <h4 className="text-xl font-bold">Business Hours</h4>

        <div className="space-y-4">
          {businessHours.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-6">
              <div className="font-semibold text-gray-700 flex items-center">
                {row.day}
              </div>

              <input
                type="time"
                className="Ringnex-input"
                value={row.start}
                onChange={(e) => updateHours(i, "start", e.target.value)}
              />

              <input
                type="time"
                className="Ringnex-input"
                value={row.end}
                onChange={(e) => updateHours(i, "end", e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* HOLIDAY SCHEDULES */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-8 mt-3">
        <h4 className="text-xl font-bold flex items-center gap-3">
          <Calendar className="text-blue-600" />
          Holiday Routing
        </h4>

        <div className="space-y-6">
          {holidays.map((h, i) => (
            <div key={i} className="grid grid-cols-3 gap-6 items-center mt-2">

              <input
                type="text"
                placeholder="Holiday Name"
                className="Ringnex-input"
                value={h.name}
                onChange={(e) => updateHoliday(i, "name", e.target.value)}
              />

              <DateInput
                value={h.date}
                onChange={(val) => updateHoliday(i, "date", val)}
              />

              <button
                onClick={() => removeHoliday(i)}
                className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110 w-fit"
              >
                <Trash2 className="text-red-600 w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addHoliday}
          className="Ringnex-btn-primary px-6 py-3 text-lg flex items-center gap-3 mt-4"
        >
          <Plus className="w-5 h-5" />
          Add Holiday
        </button>

      </div>
    </div>
  )
}
