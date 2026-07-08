export const getAppTz = () => localStorage.getItem("appTimezone") || "UTC";

export const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
    timeZone: getAppTz(),
  });

export const formatDate = (d: string) => {
  const tz = getAppTz();
  const dateStr      = new Date(d).toLocaleDateString("en-US", { timeZone: tz });
  const todayStr     = new Date().toLocaleDateString("en-US", { timeZone: tz });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-US", { timeZone: tz });

  if (dateStr === todayStr)     return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
};

export const formatFullDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: getAppTz(),
  });

export const formatDuration = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, "0")}s`;