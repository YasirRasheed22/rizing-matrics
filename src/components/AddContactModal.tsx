// components/AddContactModal.tsx
// @ts-nocheck

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateInput } from "./ui/AppDatePicker";
import {
  X, Plus, Trash2, Phone, Mail, Building,
  Calendar, Link, MessageSquare, MapPin, User,
  Briefcase, TrendingDown, ChevronDown,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

type PhoneEntry = { number: string; type: string };
type Address = { address: string; city: string; state: string; zip: string; label: string };

export type ContactFormData = {
  firstName: string;
  lastName?: string;
  nickName?: string;
  company?: string;
  title?: string;
  email?: string;
  source: string;
  phones: PhoneEntry[];
  addresses: Address[];
  birthdate?: string;
  website?: string;
  notes?: string;
  added_by?: string | number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  currentUserId?: string | number;
  defaultPhone?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field = ({ label, required = false, children, half = false, labelStyle }: any) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
    <label style={labelStyle}>
      {label}{required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

const StyledInput = ({ value, onChange, type = "text", placeholder = "", inputStyle, isDark }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={inputStyle}
    onFocus={(e) => {
      e.target.style.borderColor = isDark ? "rgba(124,124,240,0.6)" : "#5B5BD6";
      e.target.style.boxShadow = isDark ? "0 0 0 3px rgba(124,124,240,0.12)" : "0 0 0 3px rgba(37,99,235,0.1)";
    }}
    onBlur={(e) => {
      e.target.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#D0D5DD";
      e.target.style.boxShadow = "none";
    }}
  />
);

const StyledSelect = ({ value, onChange, children, inputStyle, isDark }: any) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, appearance: "none", paddingRight: 32, cursor: "pointer" }}
      onFocus={(e) => {
        e.target.style.borderColor = isDark ? "rgba(124,124,240,0.6)" : "#5B5BD6";
        e.target.style.boxShadow = isDark ? "0 0 0 3px rgba(124,124,240,0.12)" : "0 0 0 3px rgba(37,99,235,0.1)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#D0D5DD";
        e.target.style.boxShadow = "none";
      }}
    >
      {children}
    </select>
    <ChevronDown size={13} style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      color: isDark ? "#68687A" : "#9CA3AF", pointerEvents: "none",
    }} />
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const AddContactModal: React.FC<Props> = ({ open, onClose, onSubmit, currentUserId, defaultPhone }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const modalBg       = isDark ? "#17171F" : "#fff";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)" : "#EAECF0";
  const textPrimary   = isDark ? "#F0F0F5" : "#101828";
  const textSecondary = isDark ? "#68687A" : "#9CA3AF";
  const textLabel     = isDark ? "#C0C0D0" : "#374151";
  const sectionColor  = isDark ? "#68687A" : "#6B7280";
  const sectionBorder = isDark ? "rgba(255,255,255,0.06)" : "#F2F4F7";
  const inputBg       = isDark ? "#1E1E28" : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.10)" : "#D0D5DD";
  const inputColor    = isDark ? "#F0F0F5" : "#344054";
  const addrBlockBg   = isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB";
  const addrBlockBorder = isDark ? "rgba(255,255,255,0.07)" : "#EAECF0";
  const cancelBg      = isDark ? "#1E1E28" : "#fff";
  const cancelBorder  = isDark ? "rgba(255,255,255,0.10)" : "#D0D5DD";
  const cancelColor   = isDark ? "#C0C0D0" : "#344054";
  const accentMain    = isDark ? "#7C7CF0" : "#5B5BD6";
  const addBtnColor   = isDark ? "#A0A0B0" : "#667085";
  const addBtnBorder  = isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD";

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", border: `1px solid ${inputBorder}`, borderRadius: 9,
    fontSize: 13, color: inputColor, background: inputBg, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: textLabel, marginBottom: 5, letterSpacing: "0.01em",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: sectionColor,
    textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 14, paddingBottom: 10,
    borderBottom: `1px solid ${sectionBorder}`,
  };

  const [form, setForm] = useState<ContactFormData>({
    firstName: "", lastName: "", nickName: "", company: "",
    title: "", email: "", source: "other",
    phones: [{ number: defaultPhone || "", type: "mobile" }],
    addresses: [], birthdate: "", website: "", notes: "",
    added_by: currentUserId,
  });

  // Re-seed the phone field whenever the modal opens with a new defaultPhone
  React.useEffect(() => {
    if (open) {
      setForm(prev => ({
        ...prev,
        firstName: "", lastName: "", nickName: "", company: "",
        title: "", email: "", source: "other",
        phones: [{ number: defaultPhone || "", type: "mobile" }],
        addresses: [], birthdate: "", website: "", notes: "",
      }));
    }
  }, [open, defaultPhone]);

  const set = (field: keyof ContactFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updatePhone = (i: number, field: "number" | "type", value: string) =>
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((p, idx) => idx === i ? { ...p, [field]: value } : p),
    }));

  const updateAddress = (i: number, field: keyof Address, value: string) =>
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a, idx) => idx === i ? { ...a, [field]: value } : a),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) return alert("First name is required");
    if (!form.phones[0]?.number.trim()) return alert("At least one phone number is required");
    onSubmit({
      ...form,
      phones: form.phones.filter((p) => p.number.trim()),
      addresses: form.addresses.filter((a) => a.address.trim() || a.city.trim()),
      email: form.email?.trim() || undefined,
      website: form.website?.trim() || undefined,
      birthdate: form.birthdate || undefined,
      notes: form.notes?.trim() || undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0,
              background: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
              zIndex: 1040, backdropFilter: "blur(3px)",
            }}
          />

          {/* Centering wrapper */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 1050,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            pointerEvents: "none",
          }}>
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(640px, 100%)", maxHeight: "90vh",
              background: modalBg, borderRadius: 16,
              display: "flex", flexDirection: "column",
              fontFamily: "'Inter', -apple-system, sans-serif",
              boxShadow: isDark
                ? "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
                : "0 24px 64px rgba(0,0,0,0.18)",
              overflow: "hidden",
              pointerEvents: "all",
            }}
          >
            {/* ── Modal Header ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: `1px solid ${headerBorder}`, flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
                  Add New Contact
                </h2>
                <p style={{ fontSize: 12, color: textSecondary, margin: "2px 0 0" }}>
                  Fill in the details below
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: `1px solid ${headerBorder}`,
                  background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={15} style={{ color: isDark ? "#A0A0B0" : "#667085" }} />
              </motion.button>
            </div>

            {/* ── Scrollable Body ── */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "24px",
              background: modalBg,
            }}>
              <form onSubmit={handleSubmit}>

                {/* Personal Info */}
                <div style={sectionTitle}>Personal Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
                  <Field label="First Name" required half labelStyle={labelStyle}>
                    <StyledInput value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="John" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Last Name" half labelStyle={labelStyle}>
                    <StyledInput value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Nickname" half labelStyle={labelStyle}>
                    <StyledInput value={form.nickName} onChange={(e) => set("nickName", e.target.value)} placeholder="Johnny" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Email" half labelStyle={labelStyle}>
                    <StyledInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Company" labelStyle={labelStyle}>
                    <StyledInput value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Job Title" half labelStyle={labelStyle}>
                    <StyledInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sales Manager" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                  <Field label="Birthdate" half labelStyle={labelStyle}>
                    <DateInput value={form.birthdate} onChange={(val) => set("birthdate", val)} />
                  </Field>
                  <Field label="Website" labelStyle={labelStyle}>
                    <StyledInput type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" inputStyle={inputStyle} isDark={isDark} />
                  </Field>
                </div>

                {/* Phone Numbers */}
                <div style={sectionTitle}>Phone Numbers <span style={{ color: "#EF4444" }}>*</span></div>
                <div style={{ marginBottom: 28 }}>
                  <AnimatePresence>
                    {form.phones.map((phone, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ display: "flex", gap: 10, marginBottom: 10, overflow: "hidden" }}
                      >
                        <div style={{ flex: 1 }}>
                          <StyledInput
                            value={phone.number}
                            onChange={(e) => updatePhone(i, "number", e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            inputStyle={inputStyle}
                            isDark={isDark}
                          />
                        </div>
                        <div style={{ width: 110 }}>
                          <StyledSelect value={phone.type} onChange={(e) => updatePhone(i, "type", e.target.value)} inputStyle={inputStyle} isDark={isDark}>
                            <option value="mobile">Mobile</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </StyledSelect>
                        </div>
                        {form.phones.length > 1 && (
                          <motion.button
                            type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== i) }))}
                            style={{
                              width: 38, height: 38, borderRadius: 9,
                              border: isDark ? "1px solid rgba(220,38,38,0.25)" : "1px solid #FEE2E2",
                              background: isDark ? "rgba(220,38,38,0.10)" : "#FEF2F2",
                              display: "flex", alignItems: "center",
                              justifyContent: "center", cursor: "pointer", flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} style={{ color: "#DC2626" }} />
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, { number: "", type: "mobile" }] }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", background: "none",
                      border: `1px dashed ${addBtnBorder}`, borderRadius: 9,
                      cursor: "pointer", fontSize: 12, color: addBtnColor,
                      fontWeight: 500, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentMain; e.currentTarget.style.color = accentMain; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = addBtnBorder; e.currentTarget.style.color = addBtnColor; }}
                  >
                    <Plus size={13} /> Add another number
                  </button>
                </div>

                {/* Addresses */}
                <div style={sectionTitle}>Addresses</div>
                <div style={{ marginBottom: 28 }}>
                  <AnimatePresence>
                    {form.addresses.map((addr, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden", marginBottom: 16 }}
                      >
                        <div style={{
                          background: addrBlockBg,
                          border: `1px solid ${addrBlockBorder}`,
                          borderRadius: 10, padding: "14px 14px 10px",
                        }}>
                          {/* Label + Delete row */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ width: 130 }}>
                              <StyledSelect
                                value={addr.label}
                                onChange={(e) => updateAddress(i, "label", e.target.value)}
                                inputStyle={inputStyle}
                                isDark={isDark}
                              >
                                <option value="home">Home</option>
                                <option value="work">Work</option>
                                <option value="billing">Billing</option>
                                <option value="other">Other</option>
                              </StyledSelect>
                            </div>
                            <motion.button
                              type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                              onClick={() => setForm((prev) => ({ ...prev, addresses: prev.addresses.filter((_, idx) => idx !== i) }))}
                              style={{
                                width: 30, height: 30, borderRadius: 8,
                                border: isDark ? "1px solid rgba(220,38,38,0.25)" : "1px solid #FEE2E2",
                                background: isDark ? "rgba(220,38,38,0.10)" : "#FEF2F2",
                                display: "flex", alignItems: "center",
                                justifyContent: "center", cursor: "pointer", flexShrink: 0,
                              }}
                            >
                              <Trash2 size={13} style={{ color: "#DC2626" }} />
                            </motion.button>
                          </div>

                          {/* Street */}
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Street Address</label>
                            <StyledInput
                              value={addr.address}
                              onChange={(e) => updateAddress(i, "address", e.target.value)}
                              placeholder="123 Main St"
                              inputStyle={inputStyle}
                              isDark={isDark}
                            />
                          </div>

                          {/* City / State / Zip in a row */}
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>City</label>
                              <StyledInput
                                value={addr.city}
                                onChange={(e) => updateAddress(i, "city", e.target.value)}
                                placeholder="New York"
                                inputStyle={inputStyle}
                                isDark={isDark}
                              />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>State</label>
                              <StyledInput
                                value={addr.state}
                                onChange={(e) => updateAddress(i, "state", e.target.value)}
                                placeholder="NY"
                                inputStyle={inputStyle}
                                isDark={isDark}
                              />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>ZIP</label>
                              <StyledInput
                                value={addr.zip}
                                onChange={(e) => updateAddress(i, "zip", e.target.value)}
                                placeholder="10001"
                                inputStyle={inputStyle}
                                isDark={isDark}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      addresses: [...prev.addresses, { address: "", city: "", state: "", zip: "", label: "home" }],
                    }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", background: "none",
                      border: `1px dashed ${addBtnBorder}`, borderRadius: 9,
                      cursor: "pointer", fontSize: 12, color: addBtnColor,
                      fontWeight: 500, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentMain; e.currentTarget.style.color = accentMain; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = addBtnBorder; e.currentTarget.style.color = addBtnColor; }}
                  >
                    <MapPin size={13} /> Add address
                  </button>
                </div>

                {/* Source */}
                <div style={sectionTitle}>Source</div>
                <div style={{ marginBottom: 28 }}>
                  <StyledSelect value={form.source} onChange={(e) => set("source", e.target.value)} inputStyle={inputStyle} isDark={isDark}>
                    <option value="" disabled>Select source</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="website">Website Form</option>
                    <option value="referral">Referral</option>
                    <option value="other">Other</option>
                  </StyledSelect>
                </div>

                {/* Notes */}
                <div style={sectionTitle}>Notes</div>
                <div>
                  <textarea
                    rows={3}
                    value={form.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Any additional notes..."
                    style={{
                      ...inputStyle, resize: "vertical", minHeight: 80,
                      lineHeight: 1.6,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = isDark ? "rgba(124,124,240,0.6)" : "#5B5BD6";
                      e.target.style.boxShadow = isDark ? "0 0 0 3px rgba(124,124,240,0.12)" : "0 0 0 3px rgba(37,99,235,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDark ? "rgba(255,255,255,0.10)" : "#D0D5DD";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </form>
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: "16px 24px", borderTop: `1px solid ${headerBorder}`,
              display: "flex", gap: 10, flexShrink: 0, background: modalBg,
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: "10px", borderRadius: 9,
                  border: `1px solid ${cancelBorder}`, background: cancelBg,
                  fontSize: 13, fontWeight: 600, color: cancelColor, cursor: "pointer",
                }}
              >
                Cancel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: isDark ? "0 4px 16px rgba(124,124,240,0.35)" : "0 4px 16px rgba(37,99,235,0.3)" }}
                whileTap={{ scale: 0.97 }}
                type="button" onClick={handleSubmit}
                style={{
                  flex: 2, padding: "10px", borderRadius: 9,
                  border: "none", background: accentMain,
                  fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: isDark ? "0 1px 3px rgba(124,124,240,0.40)" : "0 1px 3px rgba(37,99,235,0.35)",
                }}
              >
                <Plus size={15} /> Save Contact
              </motion.button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
