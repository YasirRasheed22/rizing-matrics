// src/components/ui/AppDatePicker.tsx
// @ts-nocheck
import React, { forwardRef, useEffect,useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, Clock } from "lucide-react";


const PRIMARY    = "#5B5BD6";
const PRIMARY_H  = "#4747C2";
const PRIMARY_T  = "rgba(91,91,214,0.10)";
const PRIMARY_D  = "#7C7CF0";
const PRIMARY_DH = "#6B6BD4";
const PRIMARY_DT = "rgba(124,124,240,0.15)";
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light"; }
    catch { return "light"; }
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(() => {
      try {
        const val = localStorage.getItem("theme") as "dark" | "light" | null;
        if (val === "dark" || val === "light") setTheme(val);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  return theme;
}
function getPickerCSS(isDark: boolean) {
  const p     = isDark ? PRIMARY_D  : PRIMARY;
  const ph    = isDark ? PRIMARY_DH : PRIMARY_H;
  const pt    = isDark ? PRIMARY_DT : PRIMARY_T;
  const bg    = isDark ? "#1A1A26"  : "#fff";
  const text  = isDark ? "#F0F0F5"  : "#0D0D12";
  const muted = isDark ? "#68687A"  : "#9E9EAD";
  const bdClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
  const dayOff= isDark ? "#3A3A4A"  : "#D0D5DD";
  const timeBg= isDark ? "#1A1A26"  : "#fff";
  const arrowB= isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";

  return `
    .app-dp {
      font-family: 'Inter', -apple-system, sans-serif !important;
      border: 1px solid ${bdClr} !important;
      border-radius: 14px !important;
      box-shadow: ${isDark ? "0 10px 36px rgba(0,0,0,0.55)" : "0 10px 36px rgba(0,0,0,0.13)"} !important;
      background: ${bg} !important;
      overflow: hidden; padding: 0 !important;
      width:100%;
    }
    .app-dp .react-datepicker__header {
      background: ${bg} !important;
      border-bottom: 1px solid ${bdClr} !important;
      padding: 14px 6px 10px !important; border-radius: 0 !important;
    }
    .app-dp .react-datepicker__current-month,
    .app-dp .react-datepicker-time__header,
    .app-dp .react-datepicker__year-read-view--down-arrow {
      font-size: 13.5px !important; font-weight: 800 !important;
      color: ${text} !important; letter-spacing: -0.02em;
    }
    .app-dp .react-datepicker__day-names { margin-top: 6px !important; }
    .app-dp .react-datepicker__day-name {
      font-size: 10.5px !important; font-weight: 700 !important;
      color: ${muted} !important; text-transform: uppercase;
      letter-spacing: 0.04em; width: 34px !important;
      line-height: 28px !important; margin: 0 1px !important;
    }
    .app-dp .react-datepicker__month { margin: 6px 8px 10px !important; }
    .app-dp .react-datepicker__day {
      width: 34px !important; height: 34px !important;
      line-height: 34px !important; border-radius: 9px !important;
      font-size: 13px !important; font-weight: 500 !important;
      color: ${text} !important; margin: 2px 1px !important;
      transition: background 0.12s, color 0.12s !important;
    }
    .app-dp .react-datepicker__day:hover {
      background: ${pt} !important; color: ${p} !important; border-radius: 9px !important;
    }
    .app-dp .react-datepicker__day--selected,
    .app-dp .react-datepicker__day--keyboard-selected {
      background: ${p} !important; color: #fff !important;
      font-weight: 700 !important; border-radius: 9px !important;
    }
    .app-dp .react-datepicker__day--selected:hover,
    .app-dp .react-datepicker__day--keyboard-selected:hover { background: ${ph} !important; }
    .app-dp .react-datepicker__day--today {
      background: ${pt} !important; color: ${p} !important;
      font-weight: 800 !important; border-radius: 9px !important;
    }
    .app-dp .react-datepicker__day--today.react-datepicker__day--selected {
      background: ${p} !important; color: #fff !important;
    }
    .app-dp .react-datepicker__day--outside-month {
      color: ${dayOff} !important; font-weight: 400 !important;
    }
    .app-dp .react-datepicker__day--disabled {
      color: ${dayOff} !important; cursor: not-allowed !important; background: transparent !important;
    }
    .app-dp .react-datepicker__navigation {
      top: 16px !important; width: 28px !important; height: 28px !important;
      border-radius: 8px !important; transition: background 0.12s !important;
    }
    .app-dp .react-datepicker__navigation:hover {
      background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} !important;
    }
    .app-dp .react-datepicker__navigation-icon::before {
      border-color: ${muted} !important; border-width: 2px 2px 0 0 !important;
      width: 7px !important; height: 7px !important;
    }
    .app-dp .react-datepicker__time-container {
      border-left: 1px solid ${bdClr} !important; width: 110px !important;
    }
    .app-dp .react-datepicker__time-container .react-datepicker__time-box { width: 110px !important; }
    .app-dp .react-datepicker__time-container .react-datepicker__header { padding: 12px 6px 8px !important; }
    .app-dp .react-datepicker-time__header {
      font-size: 10.5px !important; font-weight: 700 !important;
      color: ${muted} !important; text-transform: uppercase !important; letter-spacing: 0.06em !important;
    }
    .app-dp .react-datepicker__time { background: ${timeBg} !important; }
    .app-dp .react-datepicker__time-list {
      scrollbar-width: thin; scrollbar-color: ${isDark ? "#3A3A4A" : "#eee"} transparent;
    }
    .app-dp .react-datepicker__time-list-item {
      font-size: 12.5px !important; font-family: 'Inter', -apple-system, sans-serif !important;
      color: ${text} !important; padding: 7px 12px !important;
      height: auto !important; transition: background 0.1s !important; border-radius: 0 !important;
      background: ${timeBg} !important;
    }
    .app-dp .react-datepicker__time-list-item:hover { background: ${pt} !important; color: ${p} !important; }
    .app-dp .react-datepicker__time-list-item--selected {
      background: ${p} !important; color: #fff !important; font-weight: 700 !important;
    }
    .app-dp .react-datepicker__time-list-item--selected:hover { background: ${ph} !important; }
    .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before {
      border-bottom-color: ${arrowB} !important;
    }
    .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::after {
      border-bottom-color: ${bg} !important;
    }
    .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::before {
      border-top-color: ${arrowB} !important;
    }
    .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::after {
      border-top-color: ${bg} !important;
    }
    .react-datepicker-popper { z-index: 9999 !important; }
  `;
}

/* ── Hook to inject/update CSS — now returns isDark ── */
function useDatePickerTheme(): boolean {
  const theme  = useLocalTheme();
  
  const isDark = theme === "dark";
  useEffect(() => {
    if (typeof document === "undefined") return;
    let tag = document.getElementById("app-dp-css") as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "app-dp-css";
      document.head.appendChild(tag);
    }
    tag.textContent = getPickerCSS(isDark);
  }, [isDark]);
  return isDark;
}

/* ── Trigger Props ── */
interface TriggerProps {
  value?: string;
  onClick?: () => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  iconType?: "date" | "datetime";
  isDark?: boolean; // ✅ theme prop
}

const Trigger = forwardRef<HTMLInputElement, TriggerProps>(
  (
    {
      value,
      onClick,
      placeholder,
      disabled,
      style,
      iconType = "date",
      isDark = false,
    },
    ref
  ) => {
    const Icon = iconType === "datetime" ? Clock : Calendar;

    // ✅ Theme-aware dynamic input style
    const inputStyle: React.CSSProperties = {
      width: "100%",
      boxSizing: "border-box",
      padding: "9px 12px 9px 34px",
      borderRadius: 10,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
      background: isDark ? "#2A2A38" : "#F6F7F9",
      fontSize: 13.5,
      color: isDark ? "#F0F0F5" : "#0D0D12",
      outline: "none",
      fontFamily: "'Inter', -apple-system, sans-serif",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border 0.15s, background 0.15s",
      letterSpacing: "-0.01em",
      opacity: disabled ? 0.5 : 1,
      ...style,
    };

    return (
      <div style={{ position: "relative", width: "100%" }}>
        <div
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
          }}
        >
          <Icon size={14} color={isDark ? "#68687A" : "#9E9EAD"} />
        </div>
        <input
          ref={ref}
          readOnly
          value={value || ""}
          onClick={onClick}
          placeholder={
            placeholder ||
            (iconType === "datetime" ? "Select date & time" : "Select date")
          }
          disabled={disabled}
          style={inputStyle}
          // ✅ Focus — dark ya light dono theme ke liye sahi colors
          onFocus={(e) => {
            e.target.style.borderColor = isDark
              ? "rgba(124,124,240,0.55)"
              : "rgba(91,91,214,0.40)";
            e.target.style.background = isDark ? "#1A1A26" : "#fff";
          }}
          // ✅ Blur — wapas original theme color par
          onBlur={(e) => {
            e.target.style.borderColor = isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.10)";
            e.target.style.background = isDark ? "#2A2A38" : "#F6F7F9";
          }}
        />
      </div>
    );
  }
);
Trigger.displayName = "AppDateTrigger";

/* ── Helpers ── */
function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val.includes("T") ? val : val + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function toDateTimeStr(d: Date): string {
  const h  = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${toDateStr(d)}T${h}:${mi}`;
}

/* ── DateInput ── */
export interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  min?: string;
  max?: string;
  disabled?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder,
  style,
  min,
  max,
  disabled,
}: DateInputProps) {
  const isDark = useDatePickerTheme(); // ✅ isDark use karo

  return (
    <ReactDatePicker
      selected={parseDate(value)}
      onChange={(d: Date | null) => onChange(d ? toDateStr(d) : "")}
      dateFormat="MMM d, yyyy"
      placeholderText={placeholder || "Select date"}
      minDate={min ? parseDate(min) : undefined}
      maxDate={max ? parseDate(max) : undefined}
      disabled={disabled}
      customInput={
        <Trigger style={style} iconType="date" isDark={isDark} /> // ✅ isDark pass
      }
      calendarClassName="app-dp"
      popperPlacement="bottom-start"
      showPopperArrow
      portalId="root"
      popperContainer={({ children }) => (
        <div style={{ zIndex: 999999 }}>{children}</div>
      )}
    />
  );
}

/* ── DateTimeInput ── */
export interface DateTimeInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  min?: string;
  max?: string;
  disabled?: boolean;
}

export function DateTimeInput({
  value,
  onChange,
  placeholder,
  style,
  min,
  max,
  disabled,
}: DateTimeInputProps) {
  const isDark = useDatePickerTheme(); // ✅ isDark use karo

  return (
    <ReactDatePicker
      selected={parseDate(value)}
      onChange={(d: Date | null) => onChange(d ? toDateTimeStr(d) : "")}
      showTimeSelect
      timeFormat="h:mm aa"
      timeIntervals={15}
      dateFormat="MMM d, yyyy h:mm aa"
      placeholderText={placeholder || "Select date & time"}
      minDate={min ? parseDate(min) : undefined}
      maxDate={max ? parseDate(max) : undefined}
      disabled={disabled}
      customInput={
        <Trigger style={style} iconType="datetime" isDark={isDark} /> // ✅ isDark pass
      }
      calendarClassName="app-dp"
      popperPlacement="bottom-start"
      showPopperArrow
      portalId="app-datepicker-portal"
      popperProps={{ strategy: "fixed" }}
    />
  );
}