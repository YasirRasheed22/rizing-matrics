// FloatingChatContext.tsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

type FloatingChatContextType = {
  open: boolean;
  phoneNumber: string | null;
  contactName: string | null;
  openChat: (number: string, name: string) => void;
  closeChat: () => void;
  user: object;
  socket: Socket | null;
};

const FloatingChatContext = createContext<FloatingChatContextType | null>(null);

export function FloatingChatProvider({ children }: { children: React.ReactNode }) {
  const { token , user } = useAuth();

  const [open, setOpen]       = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Single socket connection – lives as long as provider is mounted
  useEffect(() => {
    if (!token) return;

    socketRef.current = io("https://api.rizingmatrics.com", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const openChat = (number: string, name: string) => {
    setPhoneNumber(number);
    setContactName(name || "Unknown");
    setOpen(true);
  };

  const closeChat = () => {
    setOpen(false);
    setPhoneNumber(null);
    // We do NOT disconnect socket here — keep listening globally
  };

  return (
    <FloatingChatContext.Provider
      value={{
        open,
        phoneNumber,
        contactName,
        openChat,
        closeChat,
        user,
        socket: socketRef.current,
      }}
    >
      {children}
    </FloatingChatContext.Provider>
  );
}

export const useFloatingChat = () => {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) throw new Error("useFloatingChat must be used inside FloatingChatProvider");
  return ctx;
};