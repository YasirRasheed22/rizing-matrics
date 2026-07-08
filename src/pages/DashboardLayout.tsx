import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar"; // 👈 NEW PATH
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useSidebar } from "../components/sidebar/SidebarContext";
import NetworkStatusBar from "../components/NetworkStatusBar";
import WalletLowModal from "../components/WalletLowModal";


export default function DashboardLayout() {
  const { token } = useAuth();
  const { width } = useSidebar();

  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>

      {/* ✅ SIDEBAR */}
      <Sidebar />

    {/* ✅ MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300" style={{
        marginLeft:width
      }}>

        {/* Header */}

        <div className="sticky top-0 z-50">
          <Header />
          <NetworkStatusBar />
        </div>

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg-app)", position: "relative" }}>
          <div className="p-3 pb-32">
            <Outlet />
            <WalletLowModal />

            {/* <Toaster position="top-center"/> */}
          </div>
        </main>

      </div>
    </div>
  );
}
