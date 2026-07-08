import { createContext, useContext, useState, useEffect } from "react";

interface SidebarCtx {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  width: number;
  hoverEnabled: boolean;
}

const SidebarContext = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggle = () => {
    setCollapsed(v => !v);
    setHoverEnabled(false); // 🔑 USER INTENT → disable hover
  };

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 1024);

      if (w < 1024) {
        setCollapsed(true);
        setHoverEnabled(false);
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const width = collapsed ? 72 : 260;

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, toggle, isMobile, width, hoverEnabled }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside provider");
  return ctx;
};
