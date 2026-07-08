
import {
  Phone,
  History,
  Contact,
  MessageCircle,
  MessageCircleCode,
  LayoutDashboard,
  Users,
  UserSquare,
  PhoneCall,
  BarChart3,
  FileChartColumn,
  MessageSquare,
  Cog,
  ChartBar,
  DollarSign,

  DollarSignIcon,
  PhoneOff,
  MicIcon,
  RadioTower,
  UsersRound,
  ScrollText,
} from "lucide-react";

export const navItems = [
  // AGENT SIDE
  { to: "/dashboard", icon: Phone, label: "Dialer", roles: ["AGENT"], privilege: "viewDashboard" },
  { to: "/team-call", icon: UsersRound, label: "Team Call", roles: ["AGENT"], privilege: "teamCalls" },
  // No privilege gate — only visible if the agent actually supervises at
  // least one team (matches TeamDashboard.tsx's own access check). The
  // page is useless without a team, so it shouldn't show in the sidebar
  // for agents who don't have one, no matter what privilege is set.
  { to: "/team-dashboard", icon: Users, label: "Team Dashboard", roles: ["AGENT"], visibleIf: (user: any) => (user?.supervisedTeams?.length || 0) > 0 },
  { to: "/logs", icon: History, label: "Call Logs", roles: ["AGENT"], privilege: "viewCallLogs" },
  { to: "/contact", icon: Contact, label: "Contacts", roles: ["AGENT"], privilege: "viewContacts" },
  { to: "/messages", icon: MessageCircle, label: "Messages", roles: ["AGENT"], privilege: "viewMessages" },
  // { to: "/emails", icon: Mail, label: "Email", roles: ["AGENT"], privilege: "viewEmails" },

  {
    label: "Leads Management",
    icon: BarChart3,
    roles: ["AGENT"],
    privilege: "viewLeads",
    children: [
      { to: "/leads", label: "All Leads" },           // inherits from parent
      { to: "/lead/followup", label: "Follow-ups" },
      { to: "/lead/hot-clients", label: "Hot Clients" },
    ],
  },

  { to: "/sale", icon: DollarSign, label: "Sales", roles: ["AGENT"], privilege: "viewSales" },
  { to: "/team-messages", icon: MessageCircleCode, label: "Team Messages", roles: ["AGENT"], privilege: "teamMessages" },
  { to: "/kpis", icon: ChartBar, label: "KPIs Board", roles: ["AGENT"], privilege: "viewKpis" },

  

  // ────────────────────────────────────────────────
  // ADMIN SIDE
  // ────────────────────────────────────────────────
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", roles: ["ADMIN"], privilege: "viewAdminDashboard" },

  { to: "/admin/agents", icon: Users, label: "Agents", roles: ["ADMIN"], privilege: "manageAgents" },
  { to: "/admin/teams", icon: UserSquare, label: "Teams", roles: ["ADMIN"], privilege: "manageTeams" },
  { to: "/admin/numbers", icon: PhoneCall, label: "Phone Numbers", roles: ["ADMIN"], privilege: "manageNumbers" },
  { to: "/admin/dnc", icon: PhoneOff, label: "DNC Phone Numbers", roles: ["ADMIN"], privilege: "showCallDNC" },
  {
    label: "Leads Management",
    icon: BarChart3,
    roles: ["ADMIN","AGENT"],
    to: "/admin/leads",
    privilege: "manageLeadsAdmin",
  },
  {
    to: "/admin/autodial",
    icon: RadioTower,
    label: "Auto Dial",
    roles: ["ADMIN", "AGENT"],
    privilege: "accessAutoDialAdmin",
  },
  {
    to: "/live-calls",
    icon: RadioTower,
    label: "Live Calls",
    roles: ["ADMIN", "AGENT"],
    privilege: "liveCallsAccess",
  },

 

  { to: "/admin/scripts", icon: ScrollText, label: "Call Scripts", roles: ["ADMIN", "AGENT"], privilege: "manageScripts" },
  { to: "/admin/call-logs", icon: History, label: "Call Logs", roles: ["ADMIN"], privilege: "viewCallLogsAdmin" },
  { to: "/admin/recording", icon: MicIcon, label: "Recording", roles: ["ADMIN"], privilege: "recording" },
  { to: "/admin/message-logs", icon: MessageSquare, label: "Message Logs", roles: ["ADMIN","AGENT"], privilege: "viewCallLogsAdmin" },
  { to: "/admin/contacts", icon: Contact, label: "Company Contacts", roles: ["ADMIN"], privilege: "viewCompanyContacts" },
  { to: "/admin/kpis", icon: BarChart3, label: "Agent KPIs", roles: ["ADMIN"], privilege: "viewKpisAdmin" }, 
  {
    icon: DollarSignIcon,
    to: "/admin/settings/billing",
    label: "Billing",
    roles: ["ADMIN"],
    privilege: 'manageBilling',
    
  },
  { to: "/admin/reports", icon: FileChartColumn, label: "Reports", roles: ["ADMIN"], privilege: "viewReports" },
  {
    icon: Cog,
    label: "Settings",
    roles: ["AGENT"],
    // privilege: 'editProfile',
    children: [
      { to: "/profile", label: "Profile",privilege: null },           // usually always visible
      { to: "/admin/settings/roles", label: "Roles", privilege: "manageRoles" },
      { to: "/admin/settings/dispositions", label: "Dispositions", privilege: "accessDisposition" },
    ],
  },
  {
    icon: Cog,
    label: "Settings",
    roles: ["ADMIN"],
    privilege: null,
    children: [
      { to: "/admin/settings/roles", label: "Roles", privilege: "manageRoles" },
      { to: "/admin/settings/dispositions", label: "Dispositions", privilege: "manageDispositions" },
     
    ],
  },
];