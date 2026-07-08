// src/pages/ExtensionDetailPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import {
  Phone,
  User,
  PhoneForwarded,
  Voicemail,
  Smartphone,
  Activity,
  Settings,
  Mail,
  Radio,
  ChevronLeft,
  Clock
} from "lucide-react"
import { Link, useParams } from "react-router-dom"

export default function ExtensionDetailPage() {
  const { id } = useParams()

  const [activeTab, setActiveTab] = useState("profile")

  const tabs = [
    { id: "profile", label: "Profile", icon: Settings },
    { id: "routing", label: "Routing", icon: PhoneForwarded },
    { id: "agent", label: "Assigned Agent", icon: User },
    { id: "voicemail", label: "Voicemail", icon: Voicemail },
    { id: "devices", label: "Devices", icon: Smartphone },
    { id: "activity", label: "Activity Logs", icon: Activity },
  ]

  // Dummy Data
  const extension = {
    number: "2001",
    status: "ACTIVE",
    agent: "John Doe",
    voicemailEnabled: true,
    email: "john@example.com",
    routing: {
      forwardTo: "2003",
      failover: "Voicemail",
      ringTime: "25s",
    },
    devices: [
      { id: 1, type: "SIP Softphone", status: "ONLINE" },
      { id: 2, type: "Yealink T48S", status: "OFFLINE" },
    ],
    logs: [
      { id: 1, type: "Call Answered", time: "2025-02-01 14:25" },
      { id: 2, type: "Forwarded to 2003", time: "2025-02-01 11:00" },
    ],
  }

  return (
    <div className="ringnex-page">

      {/* Top Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/admin/extensions"
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>

        <div>
          <h1 className="ringnex-title">Extension {extension.number}</h1>
          <p className="text-gray-600 text-lg mt-1">
            Manage routing, voicemail, devices & settings
          </p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="ringnex-tabs flex mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ringnex-tab ${
              activeTab === tab.id ? "ringnex-tab-active" : ""
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mt-6">
        {activeTab === "profile" && <ProfileTab extension={extension} />}
        {activeTab === "routing" && <RoutingTab extension={extension} />}
        {activeTab === "agent" && <AgentTab extension={extension} />}
        {activeTab === "voicemail" && <VoicemailTab extension={extension} />}
        {activeTab === "devices" && <DevicesTab extension={extension} />}
        {activeTab === "activity" && <ActivityTab extension={extension} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   PROFILE TAB
-------------------------------------------------------------------*/
function ProfileTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl shadow-xl border-2 border-gray-200">

      <h2 className="text-2xl font-bold mb-6">Extension Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <div className="input-group">
          <Phone className="input-icon" />
          <input type="text" value={extension.number} readOnly placeholder=" " />
          <label>Extension Number</label>
        </div>

        <div className="input-group">
          <User className="input-icon" />
          <input type="text" value={extension.agent} readOnly placeholder=" " />
          <label>Assigned Agent</label>
        </div>

        <div className="input-group">
          <Mail className="input-icon" />
          <input type="email" value={extension.email} readOnly placeholder=" " />
          <label>Email</label>
        </div>

        <div className="input-group">
          <Radio className="input-icon" />
          <input
            type="text"
            value={extension.status}
            readOnly
            placeholder=" "
          />
          <label>Status</label>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   ROUTING TAB
-------------------------------------------------------------------*/
function RoutingTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl border-2 shadow-xl">

      <h2 className="text-2xl font-bold mb-6">Call Routing</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <div className="input-group">
          <PhoneForwarded className="input-icon" />
          <input type="text" defaultValue={extension.routing.forwardTo} placeholder=" " />
          <label>Forward To</label>
        </div>

        <div className="input-group">
          <Settings className="input-icon" />
          <input type="text" defaultValue={extension.routing.failover} placeholder=" " />
          <label>Failover Action</label>
        </div>

        <div className="input-group">
          <Clock className="input-icon" />
          <input type="text" defaultValue={extension.routing.ringTime} placeholder=" " />
          <label>Ring Duration</label>
        </div>
      </div>

      <button className="ringnex-btn-primary mt-8 px-10 py-3 text-lg">
        Save Routing
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------
   ASSIGNED AGENT TAB
-------------------------------------------------------------------*/
function AgentTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl shadow-xl border-2 border-gray-200">

      <h2 className="text-2xl font-bold mb-6">Assigned Agent</h2>

      <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-2xl shadow-inner">

        <User className="w-16 h-16 text-blue-600" />

        <div>
          <p className="text-xl font-bold text-gray-800">{extension.agent}</p>
          <p className="text-gray-600">{extension.email}</p>
        </div>
      </div>

      <button className="ringnex-btn-primary mt-8 px-10 py-3 text-lg">
        Reassign Agent
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------
   VOICEMAIL TAB
-------------------------------------------------------------------*/
function VoicemailTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl shadow-xl border-2">

      <h2 className="text-2xl font-bold mb-6">Voicemail Settings</h2>

      <div className="flex items-center justify-between bg-gray-50 p-5 rounded-2xl shadow-inner">

        <div className="flex items-center gap-4">
          <Voicemail className="text-orange-500 w-10 h-10" />
          <div>
            <p className="text-xl font-bold">
              Voicemail {extension.voicemailEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>

        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked={extension.voicemailEnabled} />
          <div className="toggle-switch"></div>
        </label>
      </div>

      <button className="ringnex-btn-primary mt-8 px-10 py-3 text-lg">
        Save Voicemail Settings
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------
   DEVICES TAB
-------------------------------------------------------------------*/
function DevicesTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl shadow-xl border-2">

      <h2 className="text-2xl font-bold mb-6">SIP Devices</h2>

      <div className="grid gap-5">
        {extension.devices.map((d) => (
          <div
            key={d.id}
            className="p-5 bg-white border-2 rounded-2xl shadow hover:shadow-lg transition flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Smartphone className="w-12 h-12 text-blue-600" />
              <div>
                <p className="font-bold text-lg">{d.type}</p>
                <p
                  className={`font-semibold ${
                    d.status === "ONLINE" ? "text-emerald-600" : "text-gray-500"
                  }`}
                >
                  {d.status}
                </p>
              </div>
            </div>

            <button className="ringnex-btn-secondary">Reset</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   ACTIVITY TAB
-------------------------------------------------------------------*/
function ActivityTab({ extension }) {
  return (
    <div className="ringnex-card p-6 rounded-3xl shadow-xl border-2">

      <h2 className="text-2xl font-bold mb-6">Activity Logs</h2>

      <div className="space-y-6">
        {extension.logs.map((log) => (
          <div
            key={log.id}
            className="p-5 bg-gray-50 rounded-2xl border flex justify-between items-center"
          >
            <p className="font-medium text-gray-800">{log.type}</p>
            <p className="text-gray-500">{log.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
