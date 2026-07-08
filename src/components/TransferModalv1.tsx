// src/components/TransferModal.tsx
//@ts-nocheck
import { motion, AnimatePresence } from "framer-motion";
import parsePhoneNumberFromString, { AsYouType } from "libphonenumber-js";
import { 
  X, 
  Phone, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  UserX, 
  PhoneOff, 
  Globe,
  Delete
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const slideInLeft = {
  hidden: { x: -60, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

const pulseScale = {
  scale: [1, 1.06, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    repeatType: "reverse" as const,
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
};
interface Agent {
  sipIdentity: string;
  name: string;
  role: string;
  status?: "online" | "busy" | "offline" | "away" | "available";
  isAvailable?: boolean;
}

interface Props {
  show: boolean;
  type: "blind" | "supervisor";
  agent: Agent | null;
  setAgent: (agent: Agent | null) => void;
  onTransfer: (payload: any) => void;
  onCancel: () => void;
  agentList: Agent[];
  contacts: any[];
}

const dialPadButtons: [string, string][] = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
];
export default function TransferModal({
  show,
  type,
  agent: selectedAgent,
  setAgent,
  onTransfer,
  onCancel,
  agentList = [],
  contacts,
  
}: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"agents" | "contacts" | "dialpad">("agents");
const [dialValue, setDialValue] = useState("");
const [rawInput, setRawInput] = useState("");
const formatPretty = (raw: string): string => {
  if (!raw) return "";
  if (raw.startsWith("+")) return new AsYouType().input(raw);
  return new AsYouType(detectRegion(raw)).input(raw);
};
const detectRegion = (input: string): "US" | "PK" => {
  if (input.startsWith("+")) return "US";
  if (/^0(3|4|5|6|7|8|9)/.test(input)) return "PK";
  return "US";
};
const toE164 = (raw: string): string => {
  if (!raw) return "";
  try {
    if (raw.startsWith("+")) {
      const p = parsePhoneNumberFromString(raw);
      if (p?.isValid()) return p.number;
      return raw.replace(/[^\d+]/g, "");
    } else {
      const p = parsePhoneNumberFromString(raw, detectRegion(raw));
      if (p?.isValid()) return p.number;
      return raw.replace(/[^\d+]/g, "");
    }
  } catch {
    return raw.replace(/[^\d+]/g, "");
  }
};

  const filteredAgents = agentList
    .filter((a) => a.role === "AGENT")
    .filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.sipIdentity.toLowerCase().includes(search.toLowerCase())
    );
    const phoneNumber = useMemo(() => formatPretty(rawInput), [rawInput]);
  const getStatusIndicator = (agent: Agent) => {
    const isAvailable = agent.isAvailable !== false && 
                       agent.status !== "busy" && 
                       agent.status !== "offline";

    if (!isAvailable) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <PhoneOff size={14} className="text-red-500" />
          <span>Busy</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <UserCheck size={14} />
        <span>Available</span>
      </div>
    );
  };
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (/^[0-9*#+]$/.test(e.key)) {
        setRawInput((prev) => prev + e.key);
      } else if (e.key === "Backspace") {
        setRawInput((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter" && rawInput) {
        // startCall(rawInput);
      }
    },
    [rawInput]
  );

  useEffect(() => {
    if (!show) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey, show]);
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 0", border: "none", background: "none",
    cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 500,
    color: active ? "#5B5BD6" : "#6B6B7B",
    borderBottom: active ? "2px solid #5B5BD6" : "2px solid transparent",
    marginBottom: -1, transition: "all 0.15s", fontFamily: "inherit",
  });

  const footerBtnBase: React.CSSProperties = {
    padding: "9px 18px", borderRadius: 10, fontSize: 13,
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 6,
  };

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.38)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            padding: 16,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{
              width: "100%", maxWidth: 480, overflow: "hidden",
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.60)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0D0D12", letterSpacing: "-0.02em" }}>
                  {type === "blind" ? "Blind" : "Supervised"} Transfer
                </div>
                <div style={{ fontSize: 12, color: "#9E9EAD", marginTop: 2 }}>
                  Choose an agent to transfer the call
                </div>
              </div>
              <button
                onClick={onCancel}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.07)", background: "#F6F7F9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#6B6B7B",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "0 12px" }}>
              {(["agents", "contacts", "dialpad"] as const).map((id) => (
                <button key={id} onClick={() => setActiveTab(id)} style={tabStyle(activeTab === id)}>
                  {id === "agents" ? "Agents" : id === "contacts" ? "Contacts" : "Dial Pad"}
                </button>
              ))}
            </div>

            {/* ── Agents tab ── */}
            {activeTab === "agents" && (
              <>
                <div style={{ maxHeight: 340, overflowY: "auto", padding: "10px 12px 4px" }}>
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9E9EAD" }} />
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "9px 12px 9px 36px", borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.09)", background: "#F6F7F9",
                        fontSize: 13, color: "#0D0D12", outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>

                  {filteredAgents.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "#9E9EAD", fontSize: 13 }}>
                      No agents matching your search
                    </div>
                  ) : filteredAgents.map((agent) => {
                    const isSelected = selectedAgent?.sipIdentity === agent.sipIdentity;
                    const isAvailable = agent.isAvailable !== false && agent.status !== "busy" && agent.status !== "offline";
                    const dotColor = isAvailable ? "#17A363" : agent.status === "busy" ? "#D38A00" : "#9E9EAD";

                    return (
                      <motion.button
                        key={agent.sipIdentity}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setAgent(agent)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 12px", borderRadius: 12, marginBottom: 4,
                          border: `1px solid ${isSelected ? "rgba(91,91,214,0.30)" : "rgba(0,0,0,0.06)"}`,
                          background: isSelected ? "rgba(91,91,214,0.07)" : "#fff",
                          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                          transition: "all 0.12s",
                        }}
                      >
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%",
                            background: "linear-gradient(135deg, #EDEDFB, #C7C7F5)",
                            border: "1.5px solid rgba(91,91,214,0.20)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 700, color: "#5B5BD6",
                          }}>
                            {agent.name?.charAt(0) || "?"}
                          </div>
                          <span style={{
                            position: "absolute", bottom: 0, right: 0,
                            width: 11, height: 11, borderRadius: "50%",
                            background: dotColor, border: "2px solid #fff",
                          }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0D0D12", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {agent.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#9E9EAD", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {agent.sipIdentity}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: isAvailable ? "#17A363" : "#9E9EAD", fontWeight: 500 }}>
                            {isAvailable ? "Available" : "Busy"}
                          </span>
                          {isSelected && <CheckCircle2 size={18} style={{ color: "#5B5BD6", flexShrink: 0 }} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{
                  padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.06)",
                  display: "flex", justifyContent: "flex-end", gap: 8,
                }}>
                  <button
                    onClick={onCancel}
                    style={{ ...footerBtnBase, background: "#F6F7F9", border: "1px solid rgba(0,0,0,0.08)", color: "#6B6B7B" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onTransfer({ mode: "agent", target: selectedAgent })}
                    disabled={!selectedAgent}
                    style={{
                      ...footerBtnBase,
                      background: selectedAgent ? "#5B5BD6" : "rgba(0,0,0,0.08)",
                      color: selectedAgent ? "#fff" : "#9E9EAD",
                      border: "none",
                      cursor: selectedAgent ? "pointer" : "not-allowed",
                      boxShadow: selectedAgent ? "0 4px 14px rgba(91,91,214,0.28)" : "none",
                    }}
                  >
                    <Phone size={14} /> Transfer
                  </button>
                </div>
              </>
            )}

            {/* ── Contacts tab ── */}
            {activeTab === "contacts" && (
              <div style={{ padding: "10px 12px", maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onTransfer({ mode: "contact", number: c?.phones[0]?.numberE164 })}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.07)", background: "#fff",
                      textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(91,91,214,0.05)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0D0D12" }}>
                      {c.firstName + " " + c?.lastName}
                    </div>
                    <div style={{ fontSize: 11, color: "#9E9EAD", fontFamily: "monospace", marginTop: 2 }}>
                      {c?.phones[0]?.numberE164}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Dialpad tab ── */}
            {activeTab === "dialpad" && (
              <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="text"
                    value={phoneNumber}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData || (window as any).clipboardData).getData("text");
                      setRawInput(pasted.replace(/[^\d+*#]/g, ""));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") { e.preventDefault(); setRawInput((p) => p.slice(0, -1)); }
                    }}
                    placeholder="Enter or paste number"
                    autoFocus
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "13px 44px 13px 16px", borderRadius: 14,
                      border: "1.5px solid rgba(0,0,0,0.08)", background: "#F6F7F9",
                      fontSize: 18, fontWeight: 600, color: "#0D0D12", outline: "none",
                      textAlign: "center", fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  {rawInput && (
                    <button
                      onClick={() => setRawInput((p) => p.slice(0, -1))}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                        display: "flex", alignItems: "center", color: "#9E9EAD",
                      }}
                    >
                      <Delete size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, justifyItems: "center" }}>
                  {dialPadButtons.map(([d, letters]) => (
                    <motion.button
                      key={d}
                      whileHover={{ scale: 1.08, background: "rgba(91,91,214,0.07)" }}
                      whileTap={{ scale: 0.90 }}
                      onClick={() => setRawInput((p) => p + d)}
                      style={{
                        width: 58, height: 58, borderRadius: "50%",
                        border: "1.5px solid rgba(0,0,0,0.08)", background: "#fff",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      <span style={{ fontSize: 18, fontWeight: 600, color: "#0D0D12", lineHeight: 1 }}>{d}</span>
                      {letters && <span style={{ fontSize: 7, color: "#9E9EAD", letterSpacing: "0.1em", marginTop: 1, fontWeight: 600 }}>{letters}</span>}
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  onClick={() => onTransfer({ mode: "dialpad", number: rawInput })}
                  disabled={!toE164(rawInput)}
                  whileHover={toE164(rawInput) ? { scale: 1.08 } : {}}
                  whileTap={toE164(rawInput) ? { scale: 0.93 } : {}}
                  style={{
                    width: 58, height: 58, borderRadius: "50%", border: "none",
                    background: toE164(rawInput) ? "linear-gradient(135deg, #5B5BD6, #4747C2)" : "#EBEBEB",
                    color: toE164(rawInput) ? "#fff" : "#BBBBC8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: toE164(rawInput) ? "pointer" : "not-allowed",
                    boxShadow: toE164(rawInput) ? "0 6px 20px rgba(91,91,214,0.38)" : "none",
                  }}
                >
                  <Phone size={22} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}