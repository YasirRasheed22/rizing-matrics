// components/Sidebar.tsx
// @ts-nocheck

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import {
  Phone,
  History,
  Settings,
  User,
  Contact,
  MessageCircle,
  LogOut,
  Headphones,
  MessageCircleCode,
  LayoutDashboard,
  Users,
  UserSquare,
  PhoneCall,
  Share2,
  GitBranch,
  ListVideo,
  BarChart3,
  FileChartColumn,
  MessageSquare,
  FileClock,
  Puzzle,
  Braces,
  ShieldCheck,
  CreditCard,
  Activity,
  ChevronDown,
  ChevronRight,
  Cog,
  ChartBar,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

// Bootstrap Components
import { Modal, Button } from "react-bootstrap";
import { useCall } from "../context/CallContext";
import { motion, AnimatePresence } from "framer-motion";


const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1], // Apple-like curve
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};


const navItems = [
  // AGENT ONLY
  { to: "/dashboard", icon: Phone, label: "Dialer", roles: ["AGENT"] },
  { to: "/logs", icon: History, label: "Call Logs", roles: ["AGENT"] },
  { to: "/contact", icon: Contact, label: "Contacts", roles: ["AGENT"] },
  { to: "/messages", icon: MessageCircle, label: "Messages", roles: ["AGENT"] },
  {
    label: "Leads Management",
    icon: BarChart3,
    roles: ["AGENT"],
    children: [
      { to: "/leads", label: "All Leads" },
      // { to: "/leads/new",       label: "New Leads" },
      { to: "/lead/followup", label: "Follow-ups" },
      { to: "/lead/hot-clients", label: "Hot Clients" },
      // { to: "/leads/qualified", label: "Qualified" },
      // add more...
    ],
  },
  // { to: "/admin/leads", icon: BarChart3, label: "Leads", roles: ["ADMIN"] },
  {
    to: "/sale",
    icon: DollarSign,
    label: "Sales",
    roles: ["AGENT"],
  },
  {
    to: "/team-messages",
    icon: MessageCircleCode,
    label: "Team Messages",
    roles: ["AGENT"],
  },
  {
    to: "/kpis",
    icon: ChartBar,
    label: "KPIs Board",
    roles: ["AGENT"],
  },
  {
    icon: Cog,
    label: "Settings",
    roles: ["AGENT"],
    children: [
      { to: "/profile", label: "Profile" },
      
    ],
  },

  // ADMIN ONLY
  {
    to: "/admin",
    icon: LayoutDashboard,
    label: "Admin Dashboard",
    roles: ["ADMIN"],
  },
  { to: "/admin/agents", icon: Users, label: "Agents", roles: ["ADMIN"] },
  { to: "/admin/teams", icon: UserSquare, label: "Teams", roles: ["ADMIN"] },
  {
    to: "/admin/numbers",
    icon: PhoneCall,
    label: "Phone Numbers",
    roles: ["ADMIN"],
  },
  // { to: "/admin/extensions", icon: Share2, label: "Extensions", roles: ["ADMIN"] },
  // { to: "/admin/call-routing", icon: GitBranch, label: "Call Routing", roles: ["ADMIN"] },
  // { to: "/admin/ivr", icon: ListVideo, label: "IVR Menus", roles: ["ADMIN"] },
  // { to: "/admin/queues", icon: Activity, label: "Queues", roles: ["ADMIN"] },
  // { to: "/admin/monitoring", icon: Headphones, label: "Monitoring", roles: ["ADMIN"] },
  // { to: "/admin/analytics", icon: BarChart3, label: "Analytics", roles: ["ADMIN"] },
  {
    to: "/admin/reports",
    icon: FileChartColumn,
    label: "Reports",
    roles: ["ADMIN"],
  },
  {
    to: "/admin/call-logs",
    icon: History,
    label: "Call Logs",
    roles: ["ADMIN"],
  },
  {
    to: "/admin/message-logs",
    icon: MessageSquare,
    label: "Message Logs",
    roles: ["ADMIN"],
  },
  // { to: "/admin/audit-logs", icon: FileClock, label: "Audit Logs", roles: ["ADMIN"] },
  {
    to: "/admin/contacts",
    icon: Contact,
    label: "Company Contacts",
    roles: ["ADMIN"],
  },
  { to: "/admin/kpis",icon: BarChart3, label: "Agent KPIs", roles: ["ADMIN"] },
  // { to: "/admin/integrations", icon: Puzzle, label: "Integrations", roles: ["ADMIN"] },
  // { to: "/admin/api", icon: Braces, label: "API Keys", roles: ["ADMIN"] },
  // { to: "/admin/settings/company", icon: Settings, label: "Company Settings", roles: ["ADMIN"] },
  // { to: "/admin/settings/security", icon: ShieldCheck, label: "Security", roles: ["ADMIN"] },

  {
    icon: Cog,
    label: "Settings",
    roles: ["ADMIN"],
    children: [
      
      { to: "/admin/settings/billing", label: "Billing", roles: ["ADMIN"] },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { missedCount,messageCount } = useCall();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();
  // Keep track of which dropdowns are open
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toggleMenu = (label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const handleClose = () => setShowLogoutModal(false);
  const handleShow = () => setShowLogoutModal(true);
  const confirmLogout = () => {
    handleClose();
    logout(navigate);
  };
 
  useEffect(() => {
    // Find which menu should be open based on current path
    for (const item of navItems) {
      if (item.children) {
        const childActive = item.children.some(
          (child) =>
            location.pathname.startsWith(child.to || "") ||
            location.pathname === child.to
        );
        if (childActive) {
          setOpenMenu(item.label);
          return; // only one can match meaningfully
        }
      }
    }
    // Optional: close all if no child route matches
    // setOpenMenu(null);
  }, [location.pathname]);
  

  return (
    <>
      <div className="Ringnex-sidebar fixed inset-y-0 left-0 z-50">
        <div className="Ringnex-logo">
          <Link to="/dashboard">
            <img src={logo} alt="MYAIO" />
          </Link>
        </div>

        <nav className="Ringnex-nav">
          {navItems
            .filter((item) => item.roles.includes(user?.role ?? ""))
            .map((item) => {
              const hasChildren = item.children && item.children.length > 0;

              // Now we compare with single value
              const isOpen = openMenu === item.label;

              // Better child active detection (also works with nested routes)
              const isChildActive =
                item.children?.some(
                  (child) =>
                    location.pathname.startsWith(child.to || "") ||
                    location.pathname === child.to
                ) ?? false;

              // Auto-open if a child is active (optional but recommended)
              // You can do this in useEffect if you want to be very clean
              // But for simplicity we'll keep it here

              if (!hasChildren) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to!}
                    end
                    className={({ isActive }) =>
                      isActive ? "Ringnex-nav-item active" : "text-black Ringnex-nav-item"
                    }
                  >
                    {item.icon && <item.icon className="w-5 h-5" />}
                    <span>{item.label}</span>
                    
                    {missedCount > 0 && item.label === 'Call Logs' && (
                    <span style={{backgroundColor:'red'}} className="badge bg-danger ms-auto">
                      {missedCount || 0}
                    </span>
                    )}
                    {messageCount > 0 && item.label === 'Messages' && (
                    <span style={{backgroundColor:'red'}}  className="">
                      {messageCount || 0}
                    </span>
                    )}
                  </NavLink>
                );
              }

              // Dropdown item
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`Ringnex-nav-item w-100 text-start d-flex align-items-center justify-content-between ${
                      isOpen || isChildActive ? "active" : "text-black"
                    }`}
                  >
                    <div className="d-flex align-items-center gap-3">
                      {item.icon && <item.icon className="w-5 h-5" />}
                      <span>{item.label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div
                    className="Ringnex-submenu"
                    style={{
                      maxHeight: isOpen ? "500px" : "0",
                      overflow: "hidden",
                      transition: "max-height 0.3s ease",
                    }}
                  >
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to!}
                        className={({ isActive }) =>
                          isActive
                            ? "Ringnex-nav-item Ringnex-submenu-item active ps-5"
                            : "Ringnex-nav-item text-black Ringnex-submenu-item ps-5"
                        }
                      >
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Logout Button - Opens Bootstrap Modal */}
          <button
            onClick={handleShow}
            className="Ringnex-logout d-flex align-items-center gap-3 text-danger hover-bg-danger-subtle"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              background: "none",
            }}
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </nav>

        <div className="Ringnex-user">
          <div className="Ringnex-user-info">
            <div className="Ringnex-avatar">{user?.name?.[0] || "U"}</div>
            <div>
              <div
                className="Ringnex-user-name"
                style={{ textTransform: "capitalize" }}
              >
                {user?.name || "Agent"}
              </div>
              {user?.role == "ADMIN" ? null : (
                <div className="Ringnex-user-status">
                  SIP ID: {user?.sipIdentity || "Offline"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap Logout Confirmation Modal */}
      <Modal
        show={showLogoutModal}
        onHide={handleClose}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Are you sure you want to log out?</p>
          <p className="text-muted mb-0">
            You will need to sign in again to access your account.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button className="bg-orange" onClick={confirmLogout}>
            Yes, Log Out
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
  
}
