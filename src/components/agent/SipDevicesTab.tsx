// components/agent/SipDevicesTab.tsx
// @ts-nocheck

import SectionCard from "../shared/SectionCard";
import { Smartphone, Monitor } from "lucide-react";

const devices = [
  { type: "Softphone App", status: "Online", icon: Smartphone },
  { type: "Desk Phone (Polycom)", status: "Offline", icon: Monitor },
];

export default function SipDevicesTab() {
  return (
    <SectionCard>
      <h2 className="text-xl font-bold mb-6">SIP Devices</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((d, i) => (
          <div
            key={i}
            className="p-5 border rounded-2xl shadow flex items-center gap-4"
          >
            <d.icon className="w-10 h-10 text-blue-600" />
            <div>
              <p className="font-bold">{d.type}</p>
              <p className="text-sm text-gray-500">{d.status}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
