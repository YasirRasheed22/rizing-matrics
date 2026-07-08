//@ts-nocheck
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function SidebarItem({
  item,
  collapsed,
  missedCount,
  messageCount,
  teamChatUnread,   // ← new prop
}: any) {
  
  
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  const isExactActive  = item.to && location.pathname === item.to;
  const isChildActive  = item.children?.some((child: any) =>
    location.pathname.startsWith(child.to)
  ) ?? false;
  const isActive = isExactActive || isChildActive;

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  // ── Badge helper ────────────────────────────────────────────
  // Returns the count to show for a given nav label, or 0
  const getBadge = (label: string): number => {
    if (label === "Call Logs"      && missedCount    > 0) return missedCount;
    if (label === "Messages"       && messageCount   > 0) return messageCount;
    if (label === "Team Messages"  && teamChatUnread > 0) return teamChatUnread;
    return 0;
  };

  // ── SIMPLE ITEM ─────────────────────────────────────────────
  if (!item.children) {
    const badge = getBadge(item.label);
    
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        end
      >
        <Icon className="icon" />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && badge > 0 && (
          <span className="badge bg-danger">{badge > 99 ? "99+" : badge}</span>
        )}

        {/* Collapsed mode: show dot indicator on the icon */}
        {collapsed && badge > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#EF4444",
              border: "1.5px solid #fff",
            }}
          />
        )}
      </NavLink>
    );
  }

  // ── DROPDOWN ITEM ────────────────────────────────────────────
  // For group items, sum up badges of all children
  const groupBadge = item.children?.reduce((sum: number, c: any) => sum + getBadge(c.label), 0) || 0;

  return (
    <div
      className="sidebar-item"
      onMouseEnter={() => collapsed && setOpen(true)}
      onMouseLeave={() => collapsed && setOpen(false)}
    >
      {/* Parent row */}
      <div
        className={`sidebar-link ${isActive ? "active" : ""}`}
        onClick={() => !collapsed && setOpen((v) => !v)}
        style={{ cursor: "pointer" }}
      >
        <Icon className="icon" />
        {!collapsed && <span style={{ fontSize: 14 }}>{item.label}</span>}
        {!collapsed && groupBadge > 0 && (
          <span className="badge bg-danger" style={{ marginLeft: "auto", marginRight: 4 }}>
            {groupBadge > 99 ? "99+" : groupBadge}
          </span>
        )}
        {!collapsed && (
          <ChevronDown size={12} className={`chev ${open ? "rot" : ""}`} />
        )}

        {/* Collapsed dot */}
        {collapsed && groupBadge > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#EF4444",
              border: "1.5px solid #fff",
            }}
          />
        )}
      </div>

      {/* Submenu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={collapsed ? "submenu-float" : "submenu"}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {item.children.map((c: any) => {
              const childBadge = getBadge(c.label);
              return (
                <NavLink
                  key={c.to}
                  to={c.to}
                  className={({ isActive }) =>
                    `submenu-item ${isActive ? "active" : "custom-text"}`
                  }
                  end
                >
                  {c.label}
                  {childBadge > 0 && (
                    <span className="badge bg-danger" style={{ marginLeft: "auto" }}>
                      {childBadge > 99 ? "99+" : childBadge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}