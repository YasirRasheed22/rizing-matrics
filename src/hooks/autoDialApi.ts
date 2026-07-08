import api from "../api";

export const autoDialApi = {
  // ── Admin: Campaigns ───────────────────────────────────────
  createCampaign(payload: {
    name: string;
    description?: string;
    dialingMode: "preview" | "progressive" | "power";
    assignmentRule: "round_robin" | "equal" | "random";
    agentIds: number[];
    maxRetries: number;
    retryDelayMinutes: number;
    callerId?: string;
  }) {
    return api.post("/voice/autodial/campaigns", payload);
  },

  getCampaigns() {
    return api.get("/voice/autodial/campaigns");
  },

  updateCampaignStatus(campaignId: number, payload: {
    status: "draft" | "active" | "paused" | "completed" | "cancelled";
    enabled: boolean;
  }) {
    return api.patch(`/voice/autodial/campaigns/${campaignId}/status`, payload);
  },

  // ── Admin: Contacts ────────────────────────────────────────
  uploadContacts(campaignId: number, formData: FormData) {
    return api.post(
      `/voice/autodial/campaigns/${campaignId}/upload-contacts`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  addContactsFromList(campaignId: number, payload: {
    contactPhoneIds: number[];
    assignedAgentId?: number;
  }) {
    return api.post(`/voice/autodial/campaigns/${campaignId}/contacts`, payload);
  },

  // ── Admin: Queue ───────────────────────────────────────────
  getQueue(campaignId: number, filters?: { status?: string; assignedAgentId?: number }) {
    return api.get(`/voice/autodial/campaigns/${campaignId}/queue`, { params: filters });
  },

  // ── Agent: Status + Queue ──────────────────────────────────
  /** Quick status check: pendingCount, autoDialEnabled, canDial */
  getAgentStatus() {
    return api.get("/voice/autodial/agent/status");
  },

  /** Agent's full pending queue (active campaigns only) */
  getAgentQueue(filters?: { status?: string }) {
    return api.get("/voice/autodial/agent/queue", { params: filters });
  },

  // ── Agent: Controls ────────────────────────────────────────
  toggleAgentAutoDial(enabled: boolean) {
    return api.patch("/voice/autodial/agent/toggle", { enabled });
  },

  /** Reserve next pending number — returns the queue item */
  reserveNext() {
    return api.post("/voice/autodial/agent/next");
  },

  /** Start Twilio call for a reserved queue item */
  startQueueCall(queueId: number) {
    return api.post(`/voice/autodial/agent/queue/${queueId}/start`);
  },
  updateCampaign: (id: number , data: object) => api.put(`/voice/autodial/${id}`, data),
deleteCampaign: (id:number) => api.delete(`/voice/autodial/${id}`),
updateQueueItem: (id:number , data:object) => api.put(`/voice/autodial/queue/${id}`, data),
deleteQueueItem: (id: number) => api.delete(`/voice/autodial/queue/${id}`),
};