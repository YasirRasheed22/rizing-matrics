// src/components/queues/QueueBusinessHoursTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { Clock, Copy, Plus, Trash2 } from "lucide-react"

export default function QueueBusinessHoursTab() {
  const [schedule, setSchedule] = useState({
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "17:00" }],
    thursday: [{ start: "09:00", end: "17:00" }],
    friday: [{ start: "09:00", end: "17:00" }],
    saturday: [],
    sunday: [],
  })

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]

  const toggleDayOpen = (day) => {
    if (schedule[day].length === 0) {
      schedule[day] = [{ start: "09:00", end: "17:00" }]
    } else {
      schedule[day] = []
    }
    setSchedule({ ...schedule })
  }

  const changeTime = (day, index, field, value) => {
    schedule[day][index][field] = value
    setSchedule({ ...schedule })
  }

  const addTimeRange = (day) => {
    schedule[day].push({ start: "09:00", end: "17:00" })
    setSchedule({ ...schedule })
  }

  const deleteTimeRange = (day, index) => {
    schedule[day].splice(index, 1)
    setSchedule({ ...schedule })
  }

  const copyMondayToAll = () => {
    days.forEach((d) => {
      schedule[d] = [...schedule.monday.map((r) => ({ ...r }))]
    })
    setSchedule({ ...schedule })
  }

  return (
    <div className="space-y-10 p-4">
      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Clock className="text-orange-500" />
        Queue Business Hours
      </h3>

      {/* COPY BUTTON */}
      <button
        onClick={copyMondayToAll}
        className="Ringnex-btn-secondary px-6 py-3 flex items-center gap-3 rounded-2xl mt-3 mb-3"
      >
        <Copy className="w-5 h-5" />
        Copy Monday to All Days
      </button>

      {/* SCHEDULE TABLE */}
      <div className="space-y-6">
        {days.map((day) => (
          <div
            key={day}
            className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-4 mt-2   "
          >
            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-bold capitalize">{day}</h4>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedule[day].length > 0}
                  onChange={() => toggleDayOpen(day)}
                  className="w-6 h-6 Ringnex-checkbox"
                />
                <span className="text-gray-800 font-medium">Open</span>
              </label>
            </div>

            {/* CLOSED */}
            {schedule[day].length === 0 && (
              <p className="text-gray-500 italic">Closed all day</p>
            )}

            {/* TIME RANGES */}
            {schedule[day].map((range, index) => (
              <div key={index} className="flex items-center gap-4">
                <input
                  type="time"
                  value={range.start}
                  onChange={(e) =>
                    changeTime(day, index, "start", e.target.value)
                  }
                  className="Ringnex-input w-40"
                />

                <span className="font-bold">to</span>

                <input
                  type="time"
                  value={range.end}
                  onChange={(e) =>
                    changeTime(day, index, "end", e.target.value)
                  }
                  className="Ringnex-input w-40"
                />

                {index > 0 && (
                  <button
                    onClick={() => deleteTimeRange(day, index)}
                    className="p-3 rounded-2xl bg-red-50 hover:bg-red-100 transition hover:scale-110"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                )}
              </div>
            ))}

            {/* ADD TIME RANGE */}
            {schedule[day].length > 0 && (
              <button
                onClick={() => addTimeRange(day)}
                className="Ringnex-btn-secondary px-4 py-2 text-sm flex items-center gap-2 mt-3"
              >
                <Plus className="w-4 h-4" />
                Add Time Range
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
