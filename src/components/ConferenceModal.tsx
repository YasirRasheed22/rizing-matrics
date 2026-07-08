// @ts-nocheck

import React, { useState } from "react";
import Modal from "react-modal";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

Modal.setAppElement("#root");

interface Props {
  isOpen: boolean;
  onClose: () => void;
  callSid: string;
}

export default function ConferenceModal({ isOpen, onClose, callSid }: Props) {
  const [participant, setParticipant] = useState("");
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAddParticipant = async () => {
    try {
      setLoading(true);
      const res = await api.post(
        "/voice/conference",
        { callSid, participant },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("✅ Conference started");
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3 className="text-lg font-semibold mb-2">Add Participant</h3>
      <input
        type="text"
        placeholder="Enter SIP URI or Number"
        className="border p-2 w-full mb-3 rounded"
        value={participant}
        onChange={(e) => setParticipant(e.target.value)}
      />
      <button
        onClick={handleAddParticipant}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        {loading ? "Adding..." : "Add to Conference"}
      </button>
      {message && <p className="text-sm mt-3">{message}</p>}
    </Modal>
  );
}
