// components/agent/LiveActivityTab.tsx
// @ts-nocheck

import SectionCard from "../shared/SectionCard";
import { Phone, Clock, Activity } from "lucide-react";

export default function LiveActivityTab() {
  return (
    <SectionCard>
      <h2 className="text-xl font-bold mb-6">Live Agent Activity</h2>

      <div className="flex items-center gap-6">

        <div className="p-4 bg-green-100 text-green-700 rounded-xl">
          <Phone className="w-8 h-8" />
        </div>

        <div className="p-4 bg-blue-100 text-blue-700 rounded-xl">
          <Clock className="w-8 h-8" />
        </div>

        <div className="p-4 bg-orange-100 text-orange-700 rounded-xl">
          <Activity className="w-8 h-8" />
        </div>
      </div>

      <p className="text-gray-500 mt-6">
        (Live waveform, call status, timer will be added when API is ready)
      </p>
    </SectionCard>
  );
}
