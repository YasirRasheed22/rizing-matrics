// src/pages/admin/SettingsCompany.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Globe, Phone, Mail, MapPin, Save, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import toast, { Toaster } from "react-hot-toast";

/* ─── styles ─────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 13px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "#F6F7F9", fontSize: 13.5,
  color: "#0D0D12", outline: "none", fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 700,
  color: "#6B6B7B", marginBottom: 6, letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "#9E9EAD",
  letterSpacing: "0.08em", textTransform: "uppercase",
  marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
};

function Field({ label, icon: Icon, children }: any) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9E9EAD", pointerEvents: "none", zIndex: 1 }} />
        )}
        {React.cloneElement(children, {
          style: { ...inputStyle, ...(Icon ? { paddingLeft: 34 } : {}), ...children.props.style },
          onFocus: (e: any) => { e.target.style.borderColor = "rgba(91,91,214,0.40)"; children.props.onFocus?.(e); },
          onBlur: (e: any) => { e.target.style.borderColor = "rgba(0,0,0,0.10)"; children.props.onBlur?.(e); },
        })}
      </div>
    </div>
  );
}

export default function SettingsCompany() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    name: "", website: "", phone: "", email: "",
    address: "", city: "", state: "", zip: "", country: "",
    timezone: "", industry: "", description: "",
  });

  useEffect(() => {
    if (!token) return;
    api.get("/auth/company", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.data) setForm((f) => ({ ...f, ...res.data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/auth/company", form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Company settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const timezones = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Phoenix", "Europe/London",
    "Europe/Paris", "Asia/Karachi", "Asia/Dubai", "Asia/Kolkata",
  ];

  const industries = [
    "Technology", "Real Estate", "Healthcare", "Finance",
    "Insurance", "Retail", "Education", "Legal", "Other",
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(91,91,214,0.15)", borderTopColor: "#5B5BD6", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: 800 }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(91,91,214,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={20} color="#5B5BD6" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0D0D12", letterSpacing: "-0.4px" }}>Company Settings</h1>
            <p style={{ margin: 0, fontSize: 12.5, color: "#9E9EAD" }}>Manage your organisation profile and preferences</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
            <div style={sectionTitle}>
              <Building2 size={13} /> Basic Information
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Company Name" icon={Building2}>
                <input type="text" value={form.name} placeholder="Acme Corp" onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Website" icon={Globe}>
                <input type="url" value={form.website} placeholder="https://example.com" onChange={(e) => set("website", e.target.value)} />
              </Field>
              <Field label="Phone Number" icon={Phone}>
                <input type="tel" value={form.phone} placeholder="+1 555 000 0000" onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Contact Email" icon={Mail}>
                <input type="email" value={form.email} placeholder="hello@company.com" onChange={(e) => set("email", e.target.value)} />
              </Field>
              <div>
                <label style={labelStyle}>Industry</label>
                <select value={form.industry} onChange={(e) => set("industry", e.target.value)}
                  style={{ ...inputStyle }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(91,91,214,0.40)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.10)")}
                >
                  <option value="">Select industry…</option>
                  {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Timezone</label>
                <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}
                  style={{ ...inputStyle }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(91,91,214,0.40)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.10)")}
                >
                  <option value="">Select timezone…</option>
                  {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                placeholder="Brief description of your company..."
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(91,91,214,0.40)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.10)")}
              />
            </div>
          </div>

          {/* Address */}
          <div style={{ ...card, padding: "20px 24px", marginBottom: 24 }}>
            <div style={sectionTitle}>
              <MapPin size={13} /> Address
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Street Address" icon={MapPin}>
                  <input type="text" value={form.address} placeholder="123 Main Street" onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
              <Field label="City">
                <input type="text" value={form.city} placeholder="New York" onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="State / Province">
                <input type="text" value={form.state} placeholder="NY" onChange={(e) => set("state", e.target.value)} />
              </Field>
              <Field label="ZIP / Postal Code">
                <input type="text" value={form.zip} placeholder="10001" onChange={(e) => set("zip", e.target.value)} />
              </Field>
              <Field label="Country">
                <input type="text" value={form.country} placeholder="United States" onChange={(e) => set("country", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <motion.button
              type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.reload()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", background: "#F6F7F9", color: "#6B6B7B", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              <RefreshCw size={13} /> Reset
            </motion.button>
            <motion.button
              type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#BBBBC8" : "#5B5BD6", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}
            >
              <Save size={13} /> {saving ? "Saving…" : "Save Changes"}
            </motion.button>
          </div>
        </form>
      </div>
    </>
  );
}
