// src/pages/QueueDetailPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import { useParams } from "react-router-dom"

import {
  Headphones,
  Users,
  Volume2,
  Megaphone,
  Clock,
  Moon,
  Voicemail,
  GitBranch,
  ArrowRightCircle,
  BarChart3
} from "lucide-react"

import QueueOverviewTab from "../../components/queues/QueueOverviewTab"
import QueueMembersTab from "../../components/queues/QueueMembersTab"
import QueueGreetingTab from "../../components/queues/QueueGreetingTab"
import QueueAnnouncementTab from "../../components/queues/QueueAnnouncementTab"
import QueueBusinessHoursTab from "../../components/queues/QueueBusinessHoursTab"
import QueueAfterHoursTab from "../../components/queues/QueueAfterHoursTab"
import QueueVoicemailTab from "../../components/queues/QueueVoicemailTab"
// import QueueCallHandlingTab from "../../components/queues/QueueCallHandlingTab"
// import QueueOverflowTab from "../../components/queues/QueueOverflowTab"
// import QueueAnalyticsTab from "../../components/queues/QueueAnalyticsTab"

export default function QueueDetailPage() {
  const { queueId } = useParams()
  const [activeTab, setActiveTab] = useState("overview")

  // Dummy queue info
  const queueInfo = {
    id: queueId,
    name: "Support Queue",
    extension: "3001",
    members: 8,
    status: "Active",
    description: "Handles all incoming support calls"
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Headphones },
    { id: "members", label: "Members", icon: Users },
    { id: "greeting", label: "Greeting", icon: Volume2 },
    { id: "announcement", label: "Announcements", icon: Megaphone },
    { id: "business", label: "Business Hours", icon: Clock },
    { id: "afterHours", label: "After Hours", icon: Moon },
    { id: "voicemail", label: "Voicemail", icon: Voicemail },
    { id: "callHandling", label: "Call Handling", icon: GitBranch },
    { id: "overflow", label: "Overflow Routing", icon: ArrowRightCircle },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <QueueOverviewTab />

      case "members":
        return <QueueMembersTab />

      case "greeting":
        return <QueueGreetingTab />

      case "announcement":
        return <QueueAnnouncementTab />

      case "business":
        return <QueueBusinessHoursTab />

      case "afterHours":
        return <QueueAfterHoursTab />

      case "voicemail":
        return <QueueVoicemailTab />

    //   case "callHandling":
    //     return <QueueCallHandlingTab />

    //   case "overflow":
    //     return <QueueOverflowTab />

    //   case "analytics":
    //     return <QueueAnalyticsTab />

      default:
        return null
    }
  }

  return (
    <div className="ringnex-page">

      {/* HEADER */}
      <div className="ringnex-page-header">
        <div className="flex items-center gap-4">
          <Headphones className="w-12 h-12 text-orange-500" />
          <div>
            <h1 className="ringnex-title">{queueInfo.name}</h1>
            <p className="text-gray-600 mt-2">{queueInfo.description}</p>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="ringnex-card p-6 bg-white rounded-3xl border-2 shadow-xl">

        {/* TAB SWITCHER */}
        <div className="flex gap-3 border-b border-gray-200 pb-3 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{borderRadius: 10}}
              className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-semibold transition ${
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
