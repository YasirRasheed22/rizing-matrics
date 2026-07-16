// components/agent/TeamAssignmentTab.tsx
// @ts-nocheck

import SectionCard from "../shared/SectionCard";

const dummyTeams = ["North Region", "South Region", "Email Team", "Outbound"];

export default function TeamAssignmentTab() {
  return (
    <SectionCard>
      <h2 className="text-xl font-bold mb-6">Team Assignment</h2>

      {dummyTeams.map((team) => (
        <label key={team} className="flex items-center gap-3 mb-3">
          <input type="checkbox" className="Ringnex-checkbox w-5 h-5" />
          {team}
        </label>
      ))}

      <button className="Ringnex-btn-primary mt-6">Save Teams</button>
    </SectionCard>
  );
}
