// src/components/call-routing/RoutingSchedulesTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { Clock, Plus, Trash2, CalendarDays } from "lucide-react"

export default function RoutingSchedulesTab() {
  const [schedules, setSchedules] = useState([
    {
      id: 1,
      label: "Business Hours",
      days: "Mon–Fri",
      hours: "09:00 AM – 06:00 PM",
    },
    {
      id: 2,
      label: "After Hours",
      days: "Mon–Fri",
      hours: "06:00 PM – 09:00 AM",
    },
    {
      id: 3,
      label: "Weekend",
      days: "Sat–Sun",
      hours: "24 Hours",
    },
  ])

  const handleDelete = (id: number) => {
    if (!confirm("Remove this schedule?")) return
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-8 p-3">

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <Clock className="text-orange-500" />
          Routing Schedules
        </h3>

        <button className="ringnex-btn-primary flex items-center gap-3 px-6 py-3 text-lg">
          <Plus size={20} /> Add Schedule
        </button>
      </div>

      {/* SCHEDULE LIST */}
      <div className="grid md:grid-cols-2 gap-6 mt-3">
        {schedules.map(schedule => (
          <div
            key={schedule.id}
            className="ringnex-card p-3 rounded-3xl border-2 border-gray-200 shadow-xl hover:shadow-2xl transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{schedule.label}</h4>

                <div className="mt-2 space-y-2">
                  <div className="flex gap-3 items-center text-gray-700">
                    <CalendarDays size={18} className="text-blue-500" />
                    <span className="font-medium">{schedule.days}</span>
                  </div>

                  <div className="flex gap-3 items-center text-gray-700">
                    <Clock size={18} className="text-orange-500" />
                    <span className="font-medium">{schedule.hours}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(schedule.id)}
                className="p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition hover:scale-110"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
