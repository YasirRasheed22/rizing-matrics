//@ts-nocheck
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, Calendar, Info } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function LeadsCalendarPage() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Theme Colors ──
  const textPrimary = isDark ? "#F0F0F5" : "#101828";
  const textMuted = isDark ? "#68687A" : "#667085";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const headerBg = isDark ? "#1A1A24" : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)";
  const bgPage = isDark ? "#0A0A0F" : "#F6F7F9";

  const calendarStyles = `
    .fc {
      font-family: 'Inter', -apple-system, sans-serif;
    }
    .fc .fc-toolbar {
      padding: 16px 20px;
      border-bottom: 1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"};
      margin-bottom: 0 !important;
      flex-wrap: wrap;
      gap: 10px;
      background: ${cardBg};
    }
    .fc .fc-toolbar-title {
      font-size: 15px !important;
      font-weight: 700 !important;
      color: ${textPrimary} !important;
      letter-spacing: -0.02em;
    }
    .fc .fc-button {
      background: ${cardBg} !important;
      border: 1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD"} !important;
      color: ${textMuted} !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      box-shadow: none !important;
      transition: all 0.15s !important;
    }
    .fc .fc-button:hover {
      background: ${isDark ? "rgba(255,255,255,0.06)" : "#F9FAFB"} !important;
      border-color: #7C7CF0 !important;
      color: #7C7CF0 !important;
    }
    .fc .fc-button:focus {
      box-shadow: 0 0 0 3px rgba(124,124,240,0.2) !important;
    }
    .fc .fc-button-primary:not(:disabled).fc-button-active,
    .fc .fc-button-primary:not(:disabled):active {
      background: ${isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF"} !important;
      border-color: #7C7CF0 !important;
      color: #7C7CF0 !important;
      font-weight: 600 !important;
    }
    .fc .fc-today-button {
      background: #5B5BD6 !important;
      border-color: #5B5BD6 !important;
      color: #fff !important;
    }
    .fc .fc-today-button:hover {
      background: #4747C2 !important;
    }
    .fc .fc-col-header-cell {
      padding: 10px 0;
      background: ${isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB"};
      border-color: ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"} !important;
    }
    .fc .fc-col-header-cell-cushion {
      font-size: 11px;
      font-weight: 600;
      color: ${textMuted};
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .fc .fc-daygrid-day {
      border-color: ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"} !important;
    }
    .fc .fc-daygrid-day:hover {
      background: ${isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB"};
    }
    .fc .fc-daygrid-day-number {
      font-size: 12px;
      font-weight: 500;
      color: ${textPrimary};
      padding: 6px 8px;
    }
    .fc .fc-day-today {
      background: ${isDark ? "rgba(124,124,240,0.08)" : "#EFF6FF"} !important;
    }
    .fc .fc-day-today .fc-daygrid-day-number {
      background: #5B5BD6;
      color: #fff;
      border-radius: 6px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .fc .fc-event {
      border: none !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      margin: 1px 2px !important;
    }
    .fc .fc-event:hover {
      filter: brightness(0.92);
    }
    .fc .fc-timegrid-slot {
      border-color: ${isDark ? "rgba(255,255,255,0.08)" : "#F2F4F7"} !important;
    }
    .fc .fc-timegrid-slot-label {
      font-size: 11px;
      color: ${textMuted};
      font-weight: 500;
    }
    .fc .fc-scrollgrid {
      border-color: ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"} !important;
      border-radius: 0 0 12px 12px;
      overflow: hidden;
    }
    .fc .fc-scrollgrid td,
    .fc .fc-scrollgrid th {
      border-color: ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"} !important;
    }
    .fc .fc-now-indicator-line {
      border-color: #EF4444 !important;
      border-width: 1.5px !important;
    }
    .fc .fc-now-indicator-arrow {
      border-top-color: #EF4444 !important;
    }
    .fc .fc-more-link {
      font-size: 11px;
      font-weight: 600;
      color: #7C7CF0;
      background: ${isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF"};
      border-radius: 4px;
      padding: 1px 6px;
    }
    .fc .fc-day-other .fc-daygrid-day-number {
      color: ${isDark ? "#4A4A5A" : "#D0D5DD"};
    }
    .fc-direction-ltr .fc-button-group > .fc-button:not(:last-child) {
      border-right-color: ${isDark ? "rgba(255,255,255,0.08)" : "#EAECF0"} !important;
    }
  `;

  return (
    <div style={{ minHeight: "100vh", background: bgPage, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{calendarStyles}</style>

      {/* Header */}
      <div style={{
        background: isDark ? "#1A1A24" : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)",
        padding: "18px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.25)"}`,
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ArrowLeft size={17} color="#fff" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Calendar size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                Follow-up Calendar
              </h1>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", margin: 0 }}>
                Track and manage your lead follow-ups
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px",
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.20)"}`,
          borderRadius: 10
        }}>
          <Info size={13} style={{ color: "rgba(255,255,255,0.8)" }} />
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            Click an event to view lead · Drag to reschedule
          </span>
        </div>
      </div>

      {/* Calendar Container */}
      <div style={{ padding: "0 28px 28px" }}>
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.06)"
        }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="calc(100vh - 160px)"
            editable={true}
            selectable={true}
            droppable={true}
            eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            nowIndicator={true}
            scrollTime="09:00:00"

            events={async (info, successCallback, failureCallback) => {
              try {
                const res = await api.get(
                  `/voice/followups/calendar?start=${info.startStr}&end=${info.endStr}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                const now = new Date();
                const formatted = res.data.data.map((lead) => {
                  const followupDate = new Date(lead.nextFollowupDate);
                  const isMissed = followupDate < now;
                  const disposition = lead.disposition || {};
                  const eventColor = isMissed ? "#EF4444" : (disposition.color || "#5B5BD6");

                  return {
                    id: lead.id.toString(),
                    title: lead.clientName,
                    start: lead.nextFollowupDate,
                    allDay: false,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    textColor: "#ffffff",
                    extendedProps: {
                      ...lead,
                      isMissed,
                      dispositionName: disposition.name || "No disposition",
                    },
                  };
                });

                successCallback(formatted);
              } catch (err) {
                console.error("Calendar fetch error:", err);
                failureCallback(err);
              }
            }}

            eventContent={(eventInfo) => {
              const { event } = eventInfo;
              const { extendedProps } = event;
              const isMissed = extendedProps.isMissed;

              return (
                <div style={{ padding: "3px 6px", fontSize: 11, lineHeight: 1.4, overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {event.title}
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 10, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {extendedProps.dispositionName}
                  </div>
                  {isMissed && (
                    <div style={{ marginTop: 2, display: "inline-block", background: "rgba(0,0,0,0.25)", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Missed
                    </div>
                  )}
                </div>
              );
            }}

            eventDrop={async (info) => {
              console.log("Event dropped:", info.event.id);
              // Uncomment when backend is ready
              // try {
              //   await api.patch(`/voice/leads/${info.event.id}`, { nextFollowupDate: info.event.start.toISOString() }, { headers: { Authorization: `Bearer ${token}` } });
              // } catch (err) { console.error(err); info.revert(); }
            }}

            eventClick={(info) => {
              info.jsEvent.preventDefault();
              navigate(`/lead/single/${info.event.id}`);
            }}

            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}

            views={{
              dayGridMonth: { titleFormat: { year: "numeric", month: "long" } },
              timeGridWeek: { titleFormat: { year: "numeric", month: "short", day: "numeric" } },
              timeGridDay: { titleFormat: { year: "numeric", month: "long", day: "numeric" } },
            }}

            buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
            eventDisplay="block"
          />
        </div>
      </div>
    </div>
  );
}