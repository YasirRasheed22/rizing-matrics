// src/pages/IVRDetailPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import { useParams } from "react-router-dom"
import {
  ListVideo,
  Volume2,
  Grid2x2,
  PhoneForwarded,
  Clock,
  GitMerge,
  BarChart3,
} from "lucide-react"

// TAB COMPONENTS (You will create these next)
import IVRGreetingTab from "../../components/ivr/IVRGreetingTab"
import IVRMenuTab from "../../components/ivr/IVRMenuTab"
import IVRRoutingTab from "../../components/ivr/IVRRoutingTab"
import IVRSchedulesTab from "../../components/ivr/IVRSchedulesTab"
import IVRAdvancedTab from "../../components/ivr/IVRAdvancedTab"
import IVRAnalyticsTab from "../../components/ivr/IVRAnalyticsTab"

export default function IVRDetailPage() {
  const { ivrId } = useParams()
  const [activeTab, setActiveTab] = useState("greeting")

  // Dummy IVR Data — replace with API later
  const ivrInfo = {
    id: ivrId,
    name: "Main IVR",
    number: "+1 (222) 555-2020",
    schedule: "Business Hours",
    status: "Active",
    description: "Main welcome menu for inbound callers",
  }

  const tabs = [
    { id: "greeting", label: "Greeting", icon: Volume2 },
    { id: "menu", label: "Menu Options", icon: Grid2x2 },
    { id: "routing", label: "Routing", icon: PhoneForwarded },
    { id: "schedules", label: "Schedules", icon: Clock },
    { id: "advanced", label: "Advanced", icon: GitMerge },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case "greeting":
        return <IVRGreetingTab />
      case "menu":
        return <IVRMenuTab />
      case "routing":
        return <IVRRoutingTab />
      case "schedules":
        return <IVRSchedulesTab />
      case "advanced":
        return <IVRAdvancedTab />
      case "analytics":
        return <IVRAnalyticsTab />
      default:
        return null
    }
  }

  return (
    <div className="Ringnex-page">

      {/* HEADER */}
      <div className="Ringnex-page-header">
        <div className="flex items-center gap-3">
          <ListVideo className="text-orange-500 w-10 h-10" />
          <div>
            <h1 className="Ringnex-title">{ivrInfo.name}</h1>
            <p className="text-gray-600 mt-2">{ivrInfo.description}</p>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="Ringnex-card p-3 bg-white rounded-3xl shadow-xl border-2 border-gray-200">

        {/* TABS */}
        <div className="flex gap-4 border-b border-gray-200 pb-3 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                borderRadius: 5
              }}
              className={`flex items-center gap-2 px-3 py-3 rounded-2xl font-semibold transition ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div>{renderTab()}</div>

      </div>
    </div>
  )
}
