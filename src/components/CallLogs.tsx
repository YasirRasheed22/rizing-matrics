// @ts-nocheck

export default function CallLogs() {
    // TODO: fetch from /voice/logs
    const logs = [
      { id: 1, from: "+1234567890", to: "client:alice", duration: "02:15", time: "2025-11-17 10:30" },
      // …
    ];
  
    return (
      <div className="h-100 overflow-auto">
        <h5 className="p-3 border-bottom">Recent Calls</h5>
        <table className="table table-sm table-hover">
          <thead className="table-light">
            <tr>
              <th>From</th><th>To</th><th>Duration</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.from}</td>
                <td>{l.to}</td>
                <td>{l.duration}</td>
                <td>{l.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }