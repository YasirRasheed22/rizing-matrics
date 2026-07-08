// src/components/numbers/NumberPortingTab.tsx
// @ts-nocheck

import React, { useState } from "react"
import { FileText, Calendar, ShieldCheck } from "lucide-react"

export default function NumberPortingTab({ numberId }) {
  const [port, setPort] = useState({
    status: "Completed",
    carrier: "AT&T",
    submittedOn: "2024-01-02",
    completedOn: "2024-01-08",
  })

  return (
    <div className="space-y-10">

      <h3 className="text-2xl font-bold">Porting Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        <div className="ringnex-badge-box">
          <span className="ringnex-badge-label">Status</span>
          <span className="ringnex-badge-value">{port.status}</span>
        </div>

        <div className="ringnex-badge-box">
          <span className="ringnex-badge-label">Previous Carrier</span>
          <span className="ringnex-badge-value">{port.carrier}</span>
        </div>

        <div className="ringnex-badge-box">
          <span className="ringnex-badge-label">Submitted On</span>
          <span className="ringnex-badge-value">{port.submittedOn}</span>
        </div>

        <div className="ringnex-badge-box">
          <span className="ringnex-badge-label">Completed On</span>
          <span className="ringnex-badge-value">{port.completedOn}</span>
        </div>

      </div>

      <button className="ringnex-btn-secondary px-8 py-3 flex items-center gap-3">
        <FileText className="w-5 h-5" /> Download Porting Documents
      </button>
    </div>
  )
}
