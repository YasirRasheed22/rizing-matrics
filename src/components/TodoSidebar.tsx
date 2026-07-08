//@ts-nocheck
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { PhoneCall, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCall } from "../context/CallContext";

export default function TodoSidebar({ isOpen, onClose }) {
    const {startCall} = useCall();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("today");
  const [data, setData] = useState({
    today: [],
    missed: [],
    upcoming: [],
  });

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    if (!isOpen) return;

    const fetchTodos = async () => {
      try {
        const res = await api.get("/voice/leads/followups/todo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data.data);
      } catch (err) {
        console.error("Todo fetch error:", err);
      }
    };

    fetchTodos();
  }, [isOpen]);

  /* ---------------- ESC CLOSE ---------------- */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const currentData = data[activeTab] || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex">
          
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 bg-black"
            onClick={onClose}
          />

          {/* Offcanvas */}
          <motion.div
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            transition={{ duration: 0.3 }}
            className="w-[520px] bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-3 py-4 border-b">
              <h2 className="text-xl font-bold text-black">Todo Followups</h2>
              <button
                onClick={onClose}
                className="p-2 text-black rounded-lg hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 px-3 py-4 border-b">
              {["today", "missed", "upcoming"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    activeTab === tab
                      ? "bg-orange  text-white shadow"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Table Section */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <table className="w-full text-sm text-black">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2">Client</th>
                    <th className="text-left py-2">Disposition</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-5 text-gray-400"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    currentData.map((lead) => (
                      <tr
                        key={lead.id}
                        // onClick={() =>
                        //   navigate(`/lead/single/${lead.id}`)
                        // }
                        className="border-b hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="py-3 font-medium">
                          {lead.clientName}
                        </td>

                        <td className="py-3">
                          <span
                            className="px-2 py-1 rounded text-xs text-white"
                            style={{
                              backgroundColor:
                                lead.disposition?.color || "#999",
                            }}
                          >
                            {lead.disposition?.name}
                          </span>
                        </td>

                        <td className="py-3 text-gray-600">
                          {new Date(
                            lead.nextFollowupDate
                          ).toLocaleString()}
                        </td>

                        <td className="py-3 text-gray-600" onClick={()=>{
                            console.log(lead)
                            startCall(lead?.clientPhone)
                        }}>
                                <PhoneCall/>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}