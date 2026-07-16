// components/agent/QueueAssignmentTab.tsx
// @ts-nocheck

import SectionCard from "../shared/SectionCard";

const dummyQueues = ["Sales", "Support", "Billing", "VIP Support"];

export default function QueueAssignmentTab() {
  return (
    <SectionCard>
      <h2 className="text-xl font-bold mb-6">Queue Assignment</h2>

      {dummyQueues.map((q) => (
        <label key={q} className="flex items-center gap-3 mb-3">
          <input type="checkbox" className="Ringnex-checkbox w-5 h-5" />
          {q}
        </label>
      ))}

      <button className="Ringnex-btn-primary mt-6">Update Queues</button>
    </SectionCard>
  );
}
