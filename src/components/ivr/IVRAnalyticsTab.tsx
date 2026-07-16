// src/components/ivr/IVRAnalyticsTab.tsx
// @ts-nocheck

import React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { BarChart3, Activity } from "lucide-react"

export default function IVRAnalyticsTab() {
  const callVolumeData = [
    { hour: "9 AM", calls: 42 },
    { hour: "10 AM", calls: 55 },
    { hour: "11 AM", calls: 48 },
    { hour: "12 PM", calls: 60 },
    { hour: "1 PM", calls: 72 },
    { hour: "2 PM", calls: 58 },
    { hour: "3 PM", calls: 63 },
  ]

  const dtmfData = [
    { key: "1", count: 120 },
    { key: "2", count: 95 },
    { key: "3", count: 60 },
    { key: "0", count: 30 },
    { key: "*", count: 5 },
  ]

  const outcomeData = [
    { label: "Completed", value: 310, color: "#10b981" },
    { label: "Abandoned", value: 45, color: "#ef4444" },
    { label: "Timeout", value: 22, color: "#f59e0b" },
  ]

  return (
    <div className="space-y-12 p-3">

      <h3 className="text-2xl font-bold flex items-center gap-3">
        <BarChart3 className="text-orange-500" />
        IVR Analytics
      </h3>

      {/* 1 — CALL VOLUME LINE CHART */}
      <div className="Ringnex-card p-6 border-2 rounded-3xl shadow-xl">
        <h4 className="text-xl font-semibold mb-4">Call Volume by Hour</h4>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callVolumeData}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 — DTMF KEY USAGE */}
      <div className="Ringnex-card p-6 border-2 rounded-3xl shadow-xl">
        <h4 className="text-xl font-semibold mb-4">DTMF Key Usage</h4>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dtmfData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3 — PERCENTAGE OF OUTCOMES */}
      <div className="Ringnex-card p-6 border-2 rounded-3xl shadow-xl">
        <h4 className="text-xl font-semibold mb-4">Call Outcomes</h4>

        <div className="flex justify-center h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomeData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
              >
                {outcomeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
