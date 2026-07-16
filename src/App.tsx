// src/App.tsx
//@ts-nocheck

import { lazy, Suspense,useState,useEffect, useRef, useContext } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {CallContext} from "./context/CallContext";
import ProtectedRoute from "./ProtectedRoute";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";


// Import all pages...
const CallDashboard = lazy(() => import("./pages/CallDashboard"));
const RegisterForm = lazy(() => import("./components/RegisterForm"));
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const AutoDialAdminPage = lazy(() => import("./pages/admin/AutoDialAdminPage"));

const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
// const Contact = lazy(() => import("./pages/Contact"));

const Messages = lazy(() => import("./pages/Messages"));
const AgentsPage = lazy(() => import("./pages/AgentsPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TeamMessage = lazy(() => import("./pages/TeamMessage"));
const Users = lazy(() => import("./pages/admin/Users"));
const Teams = lazy(() => import("./pages/admin/Teams"));
const Numbers = lazy(() => import("./pages/admin/Numbers"));
const Extensions = lazy(() => import("./pages/admin/Extensions"));
const CallRouting = lazy(() => import("./pages/admin/CallRouting"));
const IVR = lazy(() => import("./pages/admin/IVR"));
const Queues = lazy(() => import("./pages/admin/Queues"));
const Monitoring = lazy(() => import("./pages/admin/Monitoring"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const CallLogs = lazy(() => import("./pages/admin/CallLogs"));
const MessageLogs = lazy(() => import("./pages/admin/MessageLogs"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Contacts = lazy(() => import("./pages/admin/Contacts"));
const Integrations = lazy(() => import("./pages/admin/Integrations"));
const Api = lazy(() => import("./pages/admin/Api"));
const SettingsCompany = lazy(() => import("./pages/admin/SettingsCompany"));
const SettingsSecurity = lazy(() => import("./pages/admin/SettingsSecurity"));
const SettingsBilling = lazy(() => import("./pages/admin/SettingsBilling"));
const BillingEnterprise = lazy(() => import("./pages/admin/BillingEnterprise"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const AgentDetailPage = lazy(() => import("./pages/admin/AgentDetailPage"));
const TeamDetailPage = lazy(() => import("./pages/admin/TeamDetailPage"));
const NumberDetailPage = lazy(() => import("./pages/admin/NumberDetailPage"));
const ExtensionDetailPage = lazy(() => import("./pages/admin/ExtensionDetailPage"));
const CallRoutingDetailPage = lazy(() => import("./pages/admin/CallRoutingDetailPage"));
const IVRDetailPage = lazy(() => import("./pages/admin/IVRDetailPage"));
const QueueDetailPage = lazy(() => import("./pages/admin/QueueDetailPage"));
const BuyPhoneNumberPage = lazy(() => import("./pages/admin/BuyPhoneNumberPage"));
const DNC = lazy(() => import("./pages/admin/DNC"));
const SkuGroupReport = lazy(() => import("./pages/admin/SkuGroupReport"));
const SmsSpendReport = lazy(() => import("./pages/admin/SmsSpendReport"));
const VoiceSpendReport = lazy(() => import("./pages/admin/VoiceSpendReport"));
const LeadsSalesPage = lazy(() => import("./pages/LeadsSalesPage"));
const NewLead = lazy(() => import("./pages/NewLead"));
const Dispositions = lazy(() => import("./pages/admin/Dispositions"));
const LeadsStatusPage = lazy(() => import("./pages/LeadsStatusPage"));
const AgentKPIs = lazy(() => import("./pages/AgentKPIs"));
const AgentKPIDetail = lazy(() => import("./pages/AgentKPIDetail"));
const AdminLeadsDashboard = lazy(() => import("./pages/AdminLeadsDashboard"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const OutboundReportPage = lazy(() => import("./pages/admin/OutboundReportPage"));
const InboundReportPage = lazy(() => import("./pages/admin/InboundReportPage"));
const MessagesReportPage = lazy(() => import("./pages/admin/MessagesReportPage"));
const PerformanceReportPage = lazy(() => import("./pages/admin/PerformanceReportPage"));
const AgentBillingReportPage = lazy(() => import("./pages/admin/AgentBillingReportPage"));
const LeadDashboard = lazy(() => import("./pages/admin/LeadDashboard"));
const SingleLeadPage = lazy(() => import("./pages/SingleLeadPage"));
const EmailDashboard = lazy(() => import("./pages/EmailDashboard"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const ScriptsPage = lazy(() => import("./pages/admin/ScriptsPage"));
const ScriptEditorPage = lazy(() => import("./pages/admin/ScriptEditorPage"));
const AdminLeadsSalesDetail = lazy(() => import("./pages/admin/AdminLeadsSalesDetail"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const TeamCallPage = lazy(() => import("./pages/TeamCallPage"));

import { ThemeProvider } from "./context/ThemeContext";
import GlobalCallUI from "./components/GlobalCallUI";
import { FloatingChatProvider } from "./context/FloatingChatContext";
import FloatingChatWidget from "./components/FloatingChatWidget";
import { CallProvider } from "./context/CallContext";
import { TeamCallProvider } from "./context/TeamCallContext";
import TeamCallWebOverlay from "./components/TeamCallWebOverlay";
import ForgotPassword from "./components/ForgotPassword";
import { SidebarProvider } from "./components/sidebar/SidebarContext";
import CallWindow from "./pages/CallWindow";
import AdminCallStatus from "./pages/AdminCallStatus";
import LoginForm from "./components/LoginForm";
import SupervisorCallsReportPage from "./pages/SupervisorCallsReportPage";
import SupervisorAgentReportPage from "./pages/SupervisorAgentReportPage";
import RecordingPage from "./pages/admin/RecordingPage";
import toast, { Toaster, resolveValue } from "react-hot-toast";
import DispositionsPage from "./pages/admin/DispositionsPage";
import LeadsCalendarPage from "./pages/LeadsCalendarPage";
import GlobalEndPop from "./components/GlobalEndPop";
import ResetPassword from "./components/ResetPassword";
import Contact from "./pages/Contact";
import CallLogsPage from "./pages/CallLogsPage";
import LiveCallsPage from "./pages/LiveCallsPage";

function RedirectBasedOnRole() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "AGENT") {
    const canMakeCall = user.additionalRole?.makeCall === true;
    const moveToTeamDashboard = user.additionalRole?.viewTeamDashboard === true;
    if (!canMakeCall && moveToTeamDashboard === false) return <Navigate to="/profile" replace />;
    if (moveToTeamDashboard) return <Navigate to="/team-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/admin" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/call" element={<CallWindow />} />

      {/* Protected Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route element={<ProtectedRoute allowedRoles={["AGENT", "ADMIN"]} />}>
            <Route path="/dashboard" element={<CallDashboard />} />
            <Route path="/team-call" element={<TeamCallPage />} />
            <Route path="/team-dashboard" element={<TeamDashboard />} />
            <Route path="/team/edit/:id" element={<TeamDetailPage />} />
            <Route path="/team/:teamId/calls" element={<SupervisorCallsReportPage />} />
            <Route path="/team/:teamId/agents/status/:status" element={<SupervisorAgentReportPage />} />
            <Route path="/logs" element={<CallLogsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/team-messages" element={<TeamMessage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/leads" element={<LeadsSalesPage />} />
            <Route path="/leads/calendar" element={<LeadsCalendarPage />} />
            <Route path="/lead/single/:id" element={<SingleLeadPage />} />
            <Route path="/leads/add-lead" element={<NewLead />} />
            <Route path="/lead/:dispositions" element={<LeadsStatusPage />} />
            <Route path="/kpis" element={<AgentKPIs />} />
            <Route path="/sale" element={<SalesPage />} />
            <Route path="/kpi-detail/:kpiType" element={<AgentKPIDetail />} />
            <Route path="/emails" element={<EmailDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "AGENT"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/agents" element={<AgentsPage />} />
            <Route path="/admin/agents/view/:id" element={<AgentDetailPage />} />
            <Route path="/admin/agents/status/:id" element={<AdminCallStatus />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/teams" element={<Teams />} />
            <Route path="/admin/teams/view/:id" element={<TeamDetailPage />} />
            <Route path="/admin/numbers" element={<Numbers />} />
            <Route path="/admin/dnc" element={<DNC />} />
            <Route path="/admin/buy-number" element={<BuyPhoneNumberPage />} />
            <Route path="/admin/numbers/view/:id" element={<NumberDetailPage />} />
            <Route path="/admin/lead/single/:id" element={<SingleLeadPage />} />
            <Route path="/admin/extensions" element={<Extensions />} />
            <Route path="/admin/extensions/view/:id" element={<ExtensionDetailPage />} />
            <Route path="/admin/call-routing" element={<CallRouting />} />
            <Route path="/admin/call-routing/view/:id" element={<CallRoutingDetailPage />} />
            <Route path="/admin/ivr" element={<IVR />} />
            <Route path="/admin/ivr/view/:id" element={<IVRDetailPage />} />
            <Route path="/admin/queues" element={<Queues />} />
            <Route path="/admin/queues/view/:id" element={<QueueDetailPage />} />
            <Route path="/admin/monitoring" element={<Monitoring />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/reports/outbound" element={<OutboundReportPage />} />
            <Route path="/admin/reports/inbound" element={<InboundReportPage />} />
            <Route path="/admin/reports/messages" element={<MessagesReportPage />} />
            <Route path="/admin/reports/performance" element={<PerformanceReportPage />} />
            <Route path="/admin/reports/billing" element={<AgentBillingReportPage />} />
            <Route path="/admin/call-logs" element={<CallLogs />} />
            <Route path="/admin/recording" element={<RecordingPage />} />
            <Route path="/admin/message-logs" element={<MessageLogs />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/contacts" element={<Contacts />} />
            <Route path="/admin/integrations" element={<Integrations />} />
            <Route path="/admin/api" element={<Api />} />
            <Route path="/admin/settings/company" element={<SettingsCompany />} />
            <Route path="/admin/settings/security" element={<SettingsSecurity />} />
            <Route path="/admin/settings/billing" element={<BillingEnterprise />} />
            <Route path="/admin/settings/billing/enterprise" element={<BillingEnterprise />} />
            <Route path="/admin/settings/roles" element={<RolesPage />} />
            <Route path="/admin/scripts" element={<ScriptsPage />} />
            <Route path="/admin/scripts/:id" element={<ScriptEditorPage />} />
            <Route path="/admin/settings/dispositions" element={<DispositionsPage />} />
            <Route path="/admin/settings/billing/sku-group-report" element={<SkuGroupReport />} />
            <Route path="/admin/settings/billing/sms-report" element={<SmsSpendReport />} />
            <Route path="/admin/settings/billing/voice-report" element={<VoiceSpendReport />} />
            <Route path="/admin/dispositions" element={<Dispositions />} />
            <Route path="/admin/kpis" element={<AgentKPIs />} />
            <Route path="/admin/kpi-detail/:kpiType" element={<AgentKPIDetail />} />
            <Route path="/admin/leads" element={<AdminLeadsDashboard />} />
            <Route path="/admin/leads/detail" element={<AdminLeadsSalesDetail />} />
            <Route path="/lead" element={<LeadsSalesPage />} />
            <Route path="/lead/single/:id" element={<SingleLeadPage />} />
            <Route path="/lead/add-lead" element={<NewLead />} />
            <Route path="/admin/autodial" element={<AutoDialAdminPage />} />
            <Route path="/live-calls" element={<LiveCallsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RedirectBasedOnRole />} />
      <Route path="*" element={<RedirectBasedOnRole />} />
    </Routes>
  );
}

// ✅ Ye component sirf GlobalEndPop, GlobalCallUI, FloatingChatWidget
//    render karta hai — isCallWindow ka check yahan hota hai
// App.tsx mein GlobalUI se PEHLE ye add karo

export function ReopenDialerButton({ isDark = false }) {
  const engine = useContext(CallContext);

  const btnBord = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const btnBg = isDark ? "#1E1E28" : "#F6F7F9";
  const toggleColor = isDark ? "#A0A0B0" : "#6B6B7B";

  const activeBg = isDark ? "rgba(34,197,94,0.14)" : "#ECFDF5";
  const activeBorder = isDark ? "rgba(34,197,94,0.28)" : "#BBF7D0";
  const activeColor = isDark ? "#86EFAC" : "#16A34A";

  const reconnectBg = isDark ? "rgba(99,102,241,0.14)" : "#EEF2FF";
  const reconnectBorder = isDark ? "rgba(129,140,248,0.28)" : "#C7D2FE";
  const reconnectColor = isDark ? "#A5B4FC" : "#4F46E5";

  const [checking, setChecking] = useState(false);

  const [lastActiveCall, setLastActiveCall] = useState<{
    hasActiveCall: boolean;
    conferenceName?: string;
    conferenceSid?: string;
    agentCallSid?: string | null;
    customerName?: string;
    customerNumber?: string;
    durationSeconds?: number;
    direction?: string;
    startedAt?: number;
  }>({ hasActiveCall: false });

  const engineActive =
    engine?.status === "ON_CALL" ||
    engine?.status === "DIALING" ||
    engine?.status === "INCOMING";

  const checkActiveCallOnce = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setLastActiveCall({ hasActiveCall: false });
        return null;
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://api.rizingmatrics.com"}/voice/agent/active-call`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setLastActiveCall({
        hasActiveCall: !!data?.hasActiveCall,
        conferenceName: data?.conferenceName,
        conferenceSid: data?.conferenceSid,
        agentCallSid: data?.agentCallSid || null,
        customerName: data?.customerName,
        customerNumber: data?.customerNumber,
        durationSeconds: data?.durationSeconds,
        direction: data?.direction,
        startedAt: data?.startedAt,
      });

      return data;
    } catch (err) {
      console.warn("[ReopenDialer] active call check failed:", err);
      setLastActiveCall({ hasActiveCall: false });
      return null;
    }
  };

  const handleReconnectClick = async () => {
    if (checking) return;

    setChecking(true);

    try {
      const hasActive = await checkActiveCallOnce();
      
      if(hasActive?.hasActiveCall ===true){
        window.electronAPI?.openCallWindow();
      }else{
        toast.success("No active call found to reconnect.");
      }
    } finally {
      setChecking(false);
    }
  };

  if (!window.electronAPI) return null;

  const isReconnectAvailable = lastActiveCall.hasActiveCall && !engineActive;

  const tooltip = checking
    ? "Checking previous call..."
    : engineActive
      ? "Open active dialer"
      : isReconnectAvailable
        ? `Reconnect previous call${
            lastActiveCall.customerName || lastActiveCall.customerNumber
              ? ` — ${lastActiveCall.customerName || lastActiveCall.customerNumber}`
              : ""
          }`
        : "Check and reconnect previous call";

  const iconColor = engineActive
    ? activeColor
    : isReconnectAvailable
      ? reconnectColor
      : toggleColor;

  return (
    <button
      type="button"
      onClick={handleReconnectClick}
      title={tooltip}
      aria-label={tooltip}
      disabled={checking}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1px solid ${
          engineActive
            ? activeBorder
            : isReconnectAvailable
              ? reconnectBorder
              : btnBord
        }`,
        background: engineActive
          ? activeBg
          : isReconnectAvailable
            ? reconnectBg
            : btnBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: checking ? "not-allowed" : "pointer",
        flexShrink: 0,
        color: iconColor,
        transition: "all 140ms ease",
        opacity: checking ? 0.75 : 1,
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = isDark
          ? "0 8px 20px rgba(0,0,0,0.28)"
          : "0 8px 18px rgba(16,24,40,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
          display: "block",
          animation: checking ? "previousCallPulse 0.9s ease-in-out infinite" : "none",
        }}
      >
        {/* reconnect arc */}
        <path
          d="M16.8 4.8C14.8 3.5 12.2 3.3 10 4.3C7.5 5.5 6 7.9 6 10.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M16.3 2.7L18.7 5.2L15.3 5.8"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* previous small dot */}
        <circle
          cx="6"
          cy="10.5"
          r="1.25"
          fill="currentColor"
          opacity="0.9"
        />

        {/* phone receiver */}
        
        <path
          d="M8.55 13.1C10.25 16.15 12.85 18.55 16.05 20.05C16.95 20.47 18.02 20.18 18.58 19.36L19.45 18.08C19.82 17.53 19.74 16.79 19.25 16.34L17.55 14.78C17.12 14.39 16.48 14.32 15.98 14.61L14.62 15.39C13.3 14.57 12.21 13.49 11.39 12.18L12.18 10.82C12.47 10.32 12.4 9.68 12.01 9.25L10.45 7.55C10 7.06 9.26 6.98 8.71 7.35L7.43 8.22C6.61 8.78 6.32 9.85 6.74 10.75C7.23 11.8 7.83 12.78 8.55 13.1Z"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {isReconnectAvailable && !checking && (
        <span
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#EF4444",
            border: `2px solid ${isDark ? "#1E1E28" : "#F6F7F9"}`,
          }}
        />
      )}

      <style>{`
        @keyframes previousCallPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.88); opacity: 0.72; }
        }
      `}</style>
    </button>
  );
}
function GlobalUI() {
  const hash = window.location.hash;
  const isCallWindow =
    hash === "#/call" || hash.startsWith("#/call?") || hash.startsWith("#/call/");

  return (
    <>
      <GlobalEndPop />
      {!isCallWindow && <GlobalCallUI />}
      {!isCallWindow && <TeamCallWebOverlay />}

      <FloatingChatWidget />
    </>
  );
}
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
// App.tsx ya jahan bhi root component hai — ek baar mount karo



function NotificationSoundPlayer() {
  useEffect(() => {
    // Double registration hatao — sirf ek call
    if (!window.electronAPI?.onPlayNotificationSound) {
      console.warn("[Notif] onPlayNotificationSound not found on electronAPI");
      return;
    }

    console.log("[Notif] Registering sound listener");
    const cleanup = window.electronAPI.onPlayNotificationSound(() => {
      console.log("[Notif] Sound triggered");
      playBeep();
    });

    return cleanup;
  }, []);

  function playBeep() {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtValue(0.001, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
      oscillator.onended = () => ctx.close();
    } catch (e) {
      console.warn("[Notif] Sound play failed:", e);
    }
  }

  return null;
}

// App component mein use karo:

export default function App() {
  const theme  = useLocalTheme();
  
  const isDark = theme === "dark";
  
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <FloatingChatProvider>
            <CallProvider>
            <TeamCallProvider>
              {/* <Toaster position="top-right" /> */}
          <Toaster position="top-right">
  {(t) => {
    // toast.custom(...) toasts (e.g. delete-confirmation dialogs) supply
    // their own complete UI — t.message is a render function, not a
    // string/JSX, so it must go through resolveValue(). Rendering it
    // raw (as the branches below do for plain toast.success/error calls)
    // silently renders nothing, which is why custom toasts were invisible.
    // These also skip the icon/title/close chrome below since the custom
    // component (e.g. DeleteConfirmToast) already provides its own.
    if (t.type === "custom") {
      return (
        <div style={{
          transform: t.visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)",
          opacity: t.visible ? 1 : 0,
          transition: "all 0.22s ease",
        }}>
          {resolveValue(t.message, t)}
        </div>
      );
    }

    const isSuccess = t.type === "success";
    const isError = t.type === "error";
    const isWarning = t.icon === "⚠️";

    const config = isSuccess
      ? {
          icon: CheckCircle2,
          title: "Success",
          accent: "#10B981",
          bg: isDark ? "rgba(16,185,129,0.14)" : "#ECFDF5",
          border: isDark ? "rgba(16,185,129,0.32)" : "#A7F3D0",
          iconBg: "rgba(16,185,129,0.16)",
        }
      : isError
      ? {
          icon: AlertCircle,
          title: "Error",
          accent: "#EF4444",
          bg: isDark ? "rgba(239,68,68,0.14)" : "#FEF2F2",
          border: isDark ? "rgba(239,68,68,0.34)" : "#FECACA",
          iconBg: "rgba(239,68,68,0.16)",
        }
      : isWarning
      ? {
          icon: AlertTriangle,
          title: "Warning",
          accent: "#F59E0B",
          bg: isDark ? "rgba(245,158,11,0.14)" : "#FFFBEB",
          border: isDark ? "rgba(245,158,11,0.34)" : "#FDE68A",
          iconBg: "rgba(245,158,11,0.16)",
        }
      : {
          icon: AlertCircle,
          title: "Notice",
          accent: isDark ? "#7C7CF0" : "#5B5BD6",
          bg: isDark ? "rgba(124,124,240,0.14)" : "#F4F4FF",
          border: isDark ? "rgba(124,124,240,0.32)" : "#D8D8FF",
          iconBg: isDark ? "rgba(124,124,240,0.18)" : "rgba(91,91,214,0.12)",
        };

    const Icon = config.icon;

    return (
      <div
        style={{
          width: 360,
          maxWidth: "calc(100vw - 28px)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "13px 14px",
          borderRadius: 16,
          background: config.bg,
          color: isDark ? "#F0F0F5" : "#0D0D12",
          border: `1px solid ${config.border}`,
          boxShadow: isDark
            ? "0 18px 44px rgba(0,0,0,0.42)"
            : "0 18px 44px rgba(15,23,42,0.14)",
          backdropFilter: "blur(18px)",
          fontFamily: "'Inter', sans-serif",
          transform: t.visible
            ? "translateX(0) scale(1)"
            : "translateX(18px) scale(0.96)",
          opacity: t.visible ? 1 : 0,
          transition: "all 0.22s ease",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: config.iconBg,
            color: config.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 3,
            }}
          >
            <strong
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: isDark ? "#FFFFFF" : "#111827",
                letterSpacing: "-0.01em",
              }}
            >
              {config.title}
            </strong>
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: isDark ? "#D7D7E2" : "#374151",
              fontWeight: 500,
              wordBreak: "break-word",
            }}
          >
            {t.message as React.ReactNode}
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          aria-label="Close toast"
          style={{
            width: 26,
            height: 26,
            borderRadius: 9,
            border: "none",
            background: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.07)",
            color: isDark ? "#B8B8C8" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? "rgba(255,255,255,0.14)"
              : "rgba(15,23,42,0.12)";
            e.currentTarget.style.color = isDark ? "#FFFFFF" : "#111827";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.07)";
            e.currentTarget.style.color = isDark ? "#B8B8C8" : "#64748B";
          }}
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>
    );
  }}
</Toaster>
              <NotificationSoundPlayer />
              
              <Suspense
                fallback={
                  <div
                    style={{
                      margin: 0,
                      background: isDark ? '"#7C7CF0' : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100vh",
                    }}
                  >
                    <div className="Ringnex-spinner"></div>
                  </div>
                }
              >
                
                <AppRoutes />
                
              </Suspense>

              {/* ✅ GlobalUI — same CallProvider context mein,
                  HashRouter ke andar (main.tsx mein wrap hua hai),
                  Suspense se BAHAR taake route changes affect na karein */}
                  
              <GlobalUI />
            </TeamCallProvider>
            </CallProvider>
          </FloatingChatProvider>
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}