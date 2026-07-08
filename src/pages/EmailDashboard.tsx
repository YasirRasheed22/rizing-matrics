// @ts-nocheck  // remove when types are solid

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Paperclip,
  Mail,
  Inbox,
  Send as SendIcon,
  Plus,
  X,
  Trash2,
  Download,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useSendEmailModal } from "../components/useSendEmailModal";

// React-Bootstrap imports
import Offcanvas from "react-bootstrap/Offcanvas";
import Button from "react-bootstrap/Button";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body?: string; // full HTML body
  preview: string;
  direction: "inbound" | "outbound";
  createdAt: string;
  hasAttachment?: boolean;
  attachments?: Array<{ filename: string; path: string; contentType: string }>;
}

interface Stats {
  total: number;
  inbound: number;
  outbound: number;
}

// API Helpers (same as before)
const fetchEmails = async (tab: "all" | "inbox" | "sent"): Promise<Email[]> => {
  const { data } = await api.get(`/voice/email/list?tab=${tab}`);
  return data.success ? data.emails : [];
};

const fetchEmailStats = async (): Promise<Stats> => {
  const { data } = await api.get("/voice/email/stats");
  return data.success ? data.stats : { total: 0, inbound: 0, outbound: 0 };
};

const deleteEmailsAPI = async (ids: string[]): Promise<boolean> => {
  const { data } = await api.post("/voice/email/delete", { ids });
  return data.success;
};

export default function EmailDashboard() {
  const { user, token } = useAuth();
  const { openSendEmailModal, SendEmailModal } = useSendEmailModal();

  const [emails, setEmails] = useState<Email[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "inbox" | "sent">("all");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Socket setup (same)
  useEffect(() => {
    if (!token) return;
    socketRef.current = io("https://api.rizingmatrics.com", {
      auth: { token },
      transports: ["websocket"],
    });
    return () => socketRef.current?.disconnect();
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?.id) return;
    socket.emit("join-user-room", { userId: user.id });
    return () => socket.emit("leave-user-room", { userId: user.id });
  }, [user?.id]);

  // Load emails
  useEffect(() => {
    const loadData = async () => {
      const [emailList] = await Promise.all([fetchEmails(activeTab), fetchEmailStats()]);
      setEmails(emailList);
      setSelectedIds([]);
      setSelectedEmail(null);
    };
    loadData();
  }, [activeTab]);

  // Realtime new email
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("new-email", (email: Email) => {
      if (
        activeTab === "all" ||
        (activeTab === "inbox" && email.direction === "inbound") ||
        (activeTab === "sent" && email.direction === "outbound")
      ) {
        setEmails((prev) => [email, ...prev]);
      }
    });

    return () => socket.off("new-email");
  }, [activeTab]);

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.from.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasSelection = selectedIds.length > 0;
  const isAllSelected = selectedIds.length === filteredEmails.length && filteredEmails.length > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredEmails.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map((e) => e.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} email(s)?`)) return;

    try {
      const success = await deleteEmailsAPI(selectedIds);
      if (success) {
        setEmails((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
        setSelectedIds([]);
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Delete this email?")) return;
    try {
      const success = await deleteEmailsAPI([id]);
      if (success) {
        setEmails((prev) => prev.filter((e) => e.id !== id));
        setSelectedEmail(null);
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDownload = (attachment: { filename: string; path: string }) => {
    const link = document.createElement("a");
    link.href = attachment.path;
    link.download = attachment.filename;
    link.click();
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {SendEmailModal}

      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-black">Emails</h2>
        </div>

        <div className="p-4">
          <button
            onClick={() => openSendEmailModal([])}
            className="w-full py-3 text-white rounded flex items-center justify-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 bg-orange hover:bg-orange"
          >
            <Plus size={18} /> Compose
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {["all", "inbox", "sent"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                activeTab === tab ? "bg-blue-50 text-blue-600 font-medium" : " text-black hover:bg-gray-100"
              }`}
            >
              {tab === "all" && <Mail size={18} />}
              {tab === "inbox" && <Inbox size={18} />}
              {tab === "sent" && <SendIcon size={18} />}
              {tab === "all" ? "All Mail" : tab === "inbox" ? "Inbox" : "Sent"}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content - Email List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* List Header */}
        <div className="p-3 border-b bg-white sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="ringnex-checkbox h-5 w-5 rounded border-gray-300"
            />
            {hasSelection && (
              <span className="font-medium whitespace-nowrap">{selectedIds.length} selected</span>
            )}
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-2 rounded-lg bg-gray-100 focus:bg-white border focus:border-blue-500 focus:outline-none"
            />
          </div>

          {hasSelection && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 text-red-600 hover:bg-red-50 rounded-full shrink-0"
              title="Delete selected"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredEmails.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Mail size={64} className="mb-4 opacity-40" />
              <p>No emails found</p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isSelected = selectedIds.includes(email.id);
              return (
                <div
                  key={email.id}
                  className={`group flex items-start px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${
                    isSelected ? "bg-blue-100" : ""
                  }`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="mr-4 pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(email.id);
                      }}
                      className="ringnex-checkbox h-4 w-4 rounded border-gray-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span
                        className={`font-medium truncate ${
                          email.direction === "inbound" ? "text-gray-900" : "text-blue-700"
                        }`}
                      >
                        {email.direction === "inbound" ? email.from : "Me"}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {new Date(email.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h6 className="font-medium text-gray-800 truncate mt-1 text-black">
                      {email.subject || "(No Subject)"}
                    </h6>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Email Detail - Offcanvas (Right side slide-in) */}
      <Offcanvas
        show={!!selectedEmail}
        onHide={() => setSelectedEmail(null)}
        placement="end"
        style={{ width: "45vw", maxWidth: "800px" }} // adjustable width
      >
        <Offcanvas.Header closeButton className="border-b">
          <Offcanvas.Title className="text-xl font-semibold">
            {selectedEmail?.subject || "(No Subject)"}
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="p-0 flex flex-col">
          {/* From / To / Date */}
          <div className="p-4 border-b bg-gray-50">
            <div className="text-sm">
              <strong>
                {selectedEmail?.direction === "inbound" ? selectedEmail.from : "Me"}
              </strong>{" "}
              → <span>{selectedEmail?.to}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedEmail && new Date(selectedEmail.createdAt).toLocaleString()}
            </div>

            <Button
              variant="outline-danger"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (selectedEmail) handleDeleteSingle(selectedEmail.id);
              }}
            >
              <Trash2 size={16} className="mr-1" /> 
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: selectedEmail?.html || "" }} />

            {selectedEmail?.attachments && selectedEmail.attachments.length > 0 && (
              <div className="mt-10 border-t pt-4">
                <h4 className="font-medium text-lg mb-4">Attachments</h4>
                <div className="space-y-3">
                  {selectedEmail.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-100 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Paperclip size={20} className="text-gray-600" />
                        <div>
                          <p className="font-medium truncate max-w-[300px]">{att.filename}</p>
                          <p className="text-xs text-gray-500">{att.contentType}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleDownload(att)}
                      >
                        <Download size={16} className="mr-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}