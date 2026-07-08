// src/components/agent/PermissionsTab.tsx
// @ts-nocheck
import { useTheme } from "../../context/ThemeContext";
import {
  Mic, ArrowRightLeft, Video, MapPin,
  MessageSquare, ShieldCheck, PhoneOff, Mail,
  Server, Lock, AtSign, User, Globe,
  Phone, PhoneCall, Ban, Eye,
  LayoutDashboard, Users, BookUser, MessageCircle,
  Inbox, FileText, BarChart2, Target,
  Key, UserCog, Building2, PenTool,
  Settings, PhoneForwarded, FileBarChart,
  ShieldAlert, CreditCard, Layers,
} from "lucide-react";

/* ── Shared UI Components ── */
function StatusBadge({ enabled }: { enabled: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textMuted = isDark ? "#68687A" : "#9E9EAD";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em",
      background: enabled 
        ? (isDark ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.10)") 
        : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
      color: enabled ? "#16A34A" : textMuted,
      border: `1px solid ${enabled ? "rgba(22,163,74,0.25)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)")}`,
      borderRadius: 9999, 
      padding: "3px 10px",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: enabled ? "#16A34A" : (isDark ? "#787883" : "#CBD5E1"),
        display: "inline-block",
      }} />
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function PrivRow({ icon: Icon, label, enabled }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 14px",
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: enabled 
            ? (isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.08)") 
            : (isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9"),
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} color={enabled ? accentMain : textMuted} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{label}</span>
      </div>
      <StatusBadge enabled={enabled} />
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";

  return (
    <div style={{ marginBottom: 10, marginTop: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: textMuted,
        textTransform: "uppercase", letterSpacing: "0.07em",
      }}>
        {label}
      </span>
    </div>
  );
}

function SmtpField({ icon: Icon, label, value }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const secondaryBg = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: textMuted,
        textTransform: "uppercase", letterSpacing: "0.05em"
      }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        border: `1px solid ${cardBorder}`, borderRadius: 11,
        background: secondaryBg, padding: "9px 14px",
      }}>
        <Icon size={14} color={textMuted} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 500, color: value ? textPrimary : textMuted }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

/* ── Permissions Meta ── */
const ROLE_GROUPS = [
  {
    title: "Calling",
    items: [
      { key:"makeCall",     label:"Make Calls",        icon:PhoneCall },
      { key:"canCallDNC",   label:"Can Call DNC",      icon:Phone     },
      { key:"showCallDNC",  label:"Show DNC Numbers",  icon:Ban       },
    ],
  },
  {
    title: "Features",
    items: [
      { key:"transcription",  label:"Transcription",             icon:Mic           },
      { key:"transfer",       label:"Call Transfer",             icon:ArrowRightLeft },
      { key:"recording",      label:"Call Recording",            icon:Video         },
      { key:"mms",            label:"MMS Support",               icon:MessageSquare },
      { key:"twoFA",          label:"Two-Factor Auth",           icon:ShieldCheck   },
      { key:"endCallPop",     label:"End Call Popup",            icon:PhoneOff      },
      { key:"emailPrivilege", label:"Email Privilege",           icon:Mail          },
    ],
  },
  {
    title: "Views",
    items: [
      { key:"viewDashboard",      label:"Dashboard",           icon:LayoutDashboard },
      { key:"viewTeamDashboard",  label:"Team Dashboard",      icon:Users           },
      { key:"viewCallLogs",       label:"Call Logs",           icon:PhoneForwarded  },
      { key:"viewContacts",       label:"Contacts",            icon:BookUser        },
      { key:"viewMessages",       label:"Messages",            icon:MessageCircle   },
      { key:"viewEmails",         label:"Emails",              icon:Inbox           },
      { key:"viewLeads",          label:"Leads",               icon:FileText        },
      { key:"viewSales",          label:"Sales",               icon:BarChart2       },
      { key:"viewKpis",           label:"KPIs",                icon:Target          },
      { key:"viewCompanyContacts",label:"Company Contacts",    icon:Building2       },
    ],
  },
  {
    title: "Profile",
    items: [
      { key:"changePassword", label:"Change Password", icon:Key     },
      { key:"editProfile",    label:"Edit Profile",    icon:UserCog },
      { key:"composeEmail",   label:"Compose Email",   icon:PenTool },
    ],
  },
  {
    title: "Admin",
    items: [
      { key:"viewAdminDashboard", label:"Admin Dashboard",  icon:ShieldAlert    },
      { key:"manageAgents",       label:"Manage Agents",    icon:Users          },
      { key:"manageTeams",        label:"Manage Teams",     icon:Settings       },
      { key:"manageNumbers",      label:"Manage Numbers",   icon:Phone          },
      { key:"manageLeadsAdmin",   label:"Manage Leads",     icon:FileText       },
      { key:"viewCallLogsAdmin",  label:"View Call Logs",   icon:PhoneForwarded },
      { key:"viewReports",        label:"View Reports",     icon:FileBarChart   },
      { key:"manageRoles",        label:"Manage Roles",     icon:Layers         },
      { key:"manageBilling",      label:"Manage Billing",   icon:CreditCard     },
    ],
  },
];

export default function PermissionsTab({ agentId, initialPrivileges, initialSmtp, additionalRole }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardShadow = isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 1px 4px rgba(0,0,0,0.05)";

  const privileges = initialPrivileges || {};
  const smtp = initialSmtp || {};
  const role = additionalRole || null;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: 20, 
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif" 
    }}>

      {/* Additional Role Section */}
      {role && (
        <div style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 20,
          padding: 28,
          boxShadow: cardShadow,
          backdropFilter: isDark ? "blur(20px) saturate(180%)" : "none",
        }}>
          {/* Role Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  color: textPrimary,
                  letterSpacing: "-0.02em"
                }}>
                  Role Permissions
                </h2>
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
                  background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.08)",
                  color: accentMain,
                  border: `1px solid ${isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.20)"}`,
                  borderRadius: 9999,
                  padding: "3px 12px",
                }}>
                  {role.name}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>
                Permissions inherited from the assigned role
              </p>
            </div>
          </div>

          <div style={{ height: 1, background: cardBorder, marginBottom: 22 }} />

          {/* Sales Target */}
          {role.targetEnable && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px",
              background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)",
              border: `1px solid ${isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.15)"}`,
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <Target size={14} color={accentMain} />
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: accentMain,
                  textTransform: "uppercase", letterSpacing: "0.05em", display: "block"
                }}>
                  Sales Target
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: accentMain,
                  fontVariantNumeric: "tabular-nums"
                }}>
                  {role.targetValue ?? "—"}
                </span>
              </div>
            </div>
          )}

          {/* Grouped Permissions */}
          {ROLE_GROUPS.map(({ title, items }) => (
            <div key={title} style={{ marginBottom: 22 }}>
              <SectionHeading label={title} />
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 9
              }}>
                {items.map(({ key, label, icon: Icon }) => (
                  <PrivRow 
                    key={key} 
                    icon={Icon} 
                    label={label} 
                    enabled={!!role[key]} 
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Login IP */}
          {role.loginIp && role.loginIpAddress && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px",
              background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
              border: `1px solid ${cardBorder}`,
              borderRadius: 12,
              marginTop: -8,
            }}>
              <MapPin size={14} color={accentMain} />
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: textMuted,
                  textTransform: "uppercase", letterSpacing: "0.05em", display: "block"
                }}>
                  Role Allowed IP
                </span>
                <span style={{
                  fontSize: 13.5, fontWeight: 600, color: textPrimary,
                  fontVariantNumeric: "tabular-nums"
                }}>
                  {role.loginIpAddress}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}