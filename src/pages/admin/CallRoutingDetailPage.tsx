// src/pages/CallRoutingDetailPage.tsx
// @ts-nocheck

import React, { useState } from "react"
import { useParams } from "react-router-dom"

import {
  Phone,
  GitMerge,
  Clock,
  Users,
  Voicemail,
  Volume2,
  Layers,
} from "lucide-react"

// NEW CALL ROUTING TABS
import RoutingMainTab from "../../components/callrouting/RoutingMainTab"
import RoutingSchedulesTab from "../../components/callrouting/RoutingSchedulesTab"
import RoutingIVRTab from "../../components/callrouting/RoutingIVRTab"
import RoutingQueuesTab from "../../components/callrouting/RoutingQueuesTab"
import RoutingVoicemailTab from "../../components/callrouting/RoutingVoicemailTab"
import RoutingRulesTab from "../../components/callrouting/RoutingRulesTab"

export default function CallRoutingDetailPage() {
  const { numberId } = useParams()
  const [activeTab, setActiveTab] = useState("main")

  // Dummy data
  const numberInfo = {
    id: numberId,
    number: "+1 (222) 555-2020",
    label: "Support Line",
  }

  const tabs = [
    { id: "main", label: "Routing", icon: Layers },
    { id: "schedules", label: "Schedules", icon: Clock },
    { id: "ivr", label: "IVR Menus", icon: Volume2 },
    { id: "queues", label: "Queues", icon: Users },
    { id: "voicemail", label: "Voicemail", icon: Voicemail },
    { id: "rules", label: "Rules", icon: GitMerge },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case "main":
        return <RoutingMainTab />
      case "schedules":
        return <RoutingSchedulesTab />
      case "ivr":
        return <RoutingIVRTab />
      case "queues":
        return <RoutingQueuesTab />
      case "voicemail":
        return <RoutingVoicemailTab />
      case "rules":
        return <RoutingRulesTab />
      default:
        return null
    }
  }

  return (
    <div className="ringnex-page">

      {/* HEADER */}
      <div className="ringnex-page-header">
        <div>
          <h1 className="ringnex-title flex items-center gap-3">
            <Phone className="text-blue-600" />
            {numberInfo.number}
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {numberInfo.label}
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="ringnex-card bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-3">

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
