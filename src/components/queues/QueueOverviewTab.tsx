// src/components/queues/QueueOverviewTab.tsx
// @ts-nocheck

import React from "react"
import {
  Users,
  PhoneCall,
  Clock,
  Timer,
  CheckCircle,
  AlertTriangle,
  Headphones,
} from "lucide-react"

export default function QueueOverviewTab() {
  // Dummy Data
  const stats = {
    totalCalls: 342,
    answered: 289,
    abandoned: 33,
    avgWait: "00:42",
    maxWait: "02:15",
    serviceLevel: "89%",
    queueSize: 25,
    maxQueueSize: 50,
    distribution: "Round Robin",
  }

  return (
    <div className="space-y-10 p-3">

      {/* TITLE */}
      <h3 className="text-2xl font-bold flex items-center gap-3">
        <Headphones className="text-orange-500" />
        Queue Overview
      </h3>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-3">

        {/* Total Calls */}
        <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl flex items-center gap-4">
          <PhoneCall className="w-10 h-10 text-blue-600" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Total Calls</p>
            <p className="text-3xl font-bold">{stats.totalCalls}</p>
          </div>
        </div>

        {/* Answered */}
        <div className="Ringnex-card p-6 rounded-3xl border-2 shadow-xl flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Answered</p>
            <p className="text-3xl font-bold">{stats.answered}</p>
          </div>
        </div>

        {/* Abandoned */}
        <div className="Ringnex-card p-6 rounded-3xl border-2 shadow-xl flex items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-600" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Abandoned</p>
            <p className="text-3xl font-bold">{stats.abandoned}</p>
          </div>
        </div>

        {/* Service Level */}
        <div className="Ringnex-card p-6 rounded-3xl border-2 shadow-xl flex items-center gap-4">
          <Users className="w-10 h-10 text-purple-600" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Service Level</p>
            <p className="text-3xl font-bold">{stats.serviceLevel}</p>
          </div>
        </div>
      </div>

      {/* WAIT TIMES */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-3">

        <div className="flex items-center gap-4">
          <Clock className="w-12 h-12 text-orange-500" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Average Wait</p>
            <p className="text-2xl font-bold">{stats.avgWait}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Timer className="w-12 h-12 text-blue-500" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Max Wait</p>
            <p className="text-2xl font-bold">{stats.maxWait}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Users className="w-12 h-12 text-purple-600" />
          <div>
            <p className="text-gray-600 text-sm font-semibold">Queue Size</p>
            <p className="text-2xl font-bold">{stats.queueSize}/{stats.maxQueueSize}</p>
          </div>
        </div>

      </div>

      {/* DISTRIBUTION METHOD */}
      <div className="Ringnex-card p-3 rounded-3xl border-2 shadow-xl space-y-3 mt-3 mb-5">
        <h4 classname="text-xl font-bold">Call Distribution Method</h4>

        <select className="Ringnex-input w-full text-lg">
          <option>{stats.distribution}</option>
          <option>Ring All</option>
          <option>Sequential</option>
          <option>Longest Idle</option>
          <option>Weighted Distribution</option>
        </select>

        <p className="text-gray-600 text-sm mt-2">
          This determines how calls are routed to available agents.
        </p>
      </div>
    </div>
  )
}
