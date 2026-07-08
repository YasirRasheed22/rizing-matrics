// components/EditContactModal.tsx
// @ts-nocheck

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateInput } from "./ui/AppDatePicker";
import { useTheme } from "../context/ThemeContext";
import {
  X, Plus, Trash2, MapPin, ChevronDown, Save,
} from "lucide-react";

type PhoneEntry = { number: string; type: string };
type Address = { address: string; city: string; state: string; zip: string; label: string };

export type EditContactFormData = {
  firstName: string; lastName?: string; nickName?: string; company?: string;
  title?: string; email?: string; source: string; phones: PhoneEntry[];
  addresses: Address[]; birthdate?: string; website?: string; notes?: string;
};

interface Props {
  open: boolean; onClose: () => void;
  onSubmit: (data: EditContactFormData) => void; contact: any | null;
}

export const EditContactModal: React.FC<Props> = ({ open, onClose, onSubmit, contact }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const modalBg       = isDark ? "rgba(20,20,28,0.98)"      : "#fff";
  const modalBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.07)";
  const modalShadow   = isDark ? "0 24px 64px rgba(0,0,0,0.70)" : "0 24px 64px rgba(0,0,0,0.18)";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const footerBorder  = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#A0A0B0"                  : "#344054";
  const textMuted     = isDark ? "#68687A"                  : "#667085";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const inputColor    = isDark ? "#F0F0F5"                  : "#344054";
  const sectionBorder = isDark ? "rgba(255,255,255,0.06)"   : "#F2F4F7";
  const addrBg        = isDark ? "rgba(255,255,255,0.04)"   : "#F9FAFB";
  const addrBorder    = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.07)"   : "#F9FAFB";
  const closeBtnBord  = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const cancelBtnBg   = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const cancelBtnBord = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const dashedBtnBord = isDark ? "rgba(255,255,255,0.15)"   : "#D0D5DD";
  const dashedBtnClr  = isDark ? "#68687A"                  : "#667085";
  const delBtnBg      = isDark ? "rgba(239,68,68,0.15)"     : "#FEF2F2";
  const delBtnBord    = isDark ? "rgba(239,68,68,0.30)"     : "#FEE2E2";
  const overlayBg     = isDark ? "rgba(0,0,0,0.70)"         : "rgba(0,0,0,0.35)";
  const focusBorder   = isDark ? "rgba(124,124,240,0.70)"   : "#5B5BD6";
  const focusShadow   = isDark ? "0 0 0 3px rgba(124,124,240,0.18)" : "0 0 0 3px rgba(91,91,214,0.10)";
  const subLabelColor = isDark ? "#A0A0B0"                  : "#374151";

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", border: `1px solid ${inputBorder}`, borderRadius: 9,
    fontSize: 13, color: inputColor, background: inputBg, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: subLabelColor, marginBottom: 5, letterSpacing: "0.01em",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: textMuted,
    textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${sectionBorder}`,
  };

  const Field = ({ label, required = false, children, half = false }: any) => (
    <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );

  const focusHandler = (e: any) => {
    e.target.style.borderColor = focusBorder;
    e.target.style.boxShadow = focusShadow;
  };
  const blurHandler = (e: any) => {
    e.target.style.borderColor = inputBorder;
    e.target.style.boxShadow = "none";
  };

  const StyledInput = ({ value, onChange, type = "text", placeholder = "" }: any) => (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={inputStyle} onFocus={focusHandler} onBlur={blurHandler} />
  );

  const StyledSelect = ({ value, onChange, children }: any) => (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange}
        style={{ ...inputStyle, appearance: "none", paddingRight: 32, cursor: "pointer" }}
        onFocus={focusHandler} onBlur={blurHandler}>
        {children}
      </select>
      <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
    </div>
  );

  const [form, setForm] = useState<EditContactFormData>({
    firstName: "", lastName: "", nickName: "", company: "",
    title: "", email: "", source: "other",
    phones: [{ number: "", type: "mobile" }],
    addresses: [], birthdate: "", website: "", notes: "",
  });

  useEffect(() => {
    if (contact && open) {
      setForm({
        firstName: contact.firstName || "", lastName: contact.lastName || "",
        nickName: contact.nickName || "", company: contact.company || "",
        title: contact.title || "", email: contact.email || "",
        source: contact.source || "other",
        phones: contact.phones?.length
          ? contact.phones.map((p: any) => ({ number: p.numberE164, type: (p.label || "mobile").toLowerCase() }))
          : [{ number: "", type: "mobile" }],
        addresses: contact.addresses?.length
          ? contact.addresses.map((a: any) => ({ address: a.address || "", city: a.city || "", state: a.state || "", zip: a.zip || "", label: a.label || "home" }))
          : [],
        birthdate: contact.birthdate || "", website: contact.website || "", notes: contact.notes || "",
      });
    }
  }, [contact, open]);

  const set = (field: keyof EditContactFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updatePhone = (i: number, field: "number" | "type", value: string) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  const updateAddress = (i: number, field: keyof Address, value: string) =>
    setForm((prev) => ({ ...prev, addresses: prev.addresses.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));

  const handleSubmit = () => {
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

  if (!open || !contact) return null;

  const dashedBtnStyle = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", background: "none",
    border: `1px dashed ${dashedBtnBord}`, borderRadius: 9,
    cursor: "pointer", fontSize: 12, color: dashedBtnClr,
    fontWeight: 500, transition: "all 0.15s",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: overlayBg, zIndex: 1040, backdropFilter: "blur(4px)" }}
          />

          <div style={{ position: "fixed", inset: 0, zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", pointerEvents: "none" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(640px, 100%)", maxHeight: "90vh", background: modalBg, borderRadius: 16, display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", boxShadow: modalShadow, border: `1px solid ${modalBorder}`, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", overflow: "hidden", pointerEvents: "all" }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${headerBorder}`, flexShrink: 0 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>Edit Contact</h2>
                  <p style={{ fontSize: 12, color: textMuted, margin: "2px 0 0" }}>
                    {contact.firstName} {contact.lastName}
                  </p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onClose}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${closeBtnBord}`, background: closeBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={15} style={{ color: textMuted }} />
                </motion.button>
              </div>

              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

                {/* Personal Info */}
                <div style={sectionTitle}>Personal Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px", marginBottom: 28 }}>
                  <Field label="First Name" required half><StyledInput value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="John" /></Field>
                  <Field label="Last Name" half><StyledInput value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Smith" /></Field>
                  <Field label="Nickname" half><StyledInput value={form.nickName} onChange={(e) => set("nickName", e.target.value)} placeholder="Johnny" /></Field>
                  <Field label="Email" half><StyledInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" /></Field>
                  <Field label="Company"><StyledInput value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." /></Field>
                  <Field label="Job Title" half><StyledInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sales Manager" /></Field>
                  <Field label="Birthdate" half>
                    <DateInput value={form.birthdate} onChange={(val) => set("birthdate", val)}
                      style={{ ...inputStyle, padding: "9px 12px 9px 34px" }} />
                  </Field>
                  <Field label="Website"><StyledInput type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" /></Field>
                </div>

                {/* Phone Numbers */}
                <div style={sectionTitle}>Phone Numbers <span style={{ color: "#EF4444" }}>*</span></div>
                <div style={{ marginBottom: 28 }}>
                  <AnimatePresence>
                    {form.phones.map((phone, i) => (
                      <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ display: "flex", gap: 10, marginBottom: 10, overflow: "hidden" }}>
                        <div style={{ flex: 1 }}>
                          <StyledInput value={phone.number} onChange={(e) => updatePhone(i, "number", e.target.value)} placeholder="+1 (555) 000-0000" />
                        </div>
                        <div style={{ width: 110 }}>
                          <StyledSelect value={phone.type} onChange={(e) => updatePhone(i, "type", e.target.value)}>
                            <option value="mobile">Mobile</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="primary">Primary</option>
                            <option value="other">Other</option>
                          </StyledSelect>
                        </div>
                        {form.phones.length > 1 && (
                          <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== i) }))}
                            style={{ width: 38, height: 38, borderRadius: 9, border: `1px solid ${delBtnBord}`, background: delBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            <Trash2 size={14} style={{ color: "#DC2626" }} />
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button"
                    onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, { number: "", type: "mobile" }] }))}
                    style={dashedBtnStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentMain; e.currentTarget.style.color = accentMain; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = dashedBtnBord; e.currentTarget.style.color = dashedBtnClr; }}
                  >
                    <Plus size={13} /> Add another number
                  </button>
                </div>

                {/* Addresses */}
                <div style={sectionTitle}>Addresses</div>
                <div style={{ marginBottom: 28 }}>
                  <AnimatePresence>
                    {form.addresses.map((addr, i) => (
                      <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden", marginBottom: 16 }}>
                        <div style={{ background: addrBg, border: `1px solid ${addrBorder}`, borderRadius: 10, padding: "14px 14px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ width: 130 }}>
                              <StyledSelect value={addr.label} onChange={(e) => updateAddress(i, "label", e.target.value)}>
                                <option value="home">Home</option>
                                <option value="work">Work</option>
                                <option value="billing">Billing</option>
                                <option value="other">Other</option>
                              </StyledSelect>
                            </div>
                            <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                              onClick={() => setForm((prev) => ({ ...prev, addresses: prev.addresses.filter((_, idx) => idx !== i) }))}
                              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${delBtnBord}`, background: delBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                              <Trash2 size={13} style={{ color: "#DC2626" }} />
                            </motion.button>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Street Address</label>
                            <StyledInput value={addr.address} onChange={(e) => updateAddress(i, "address", e.target.value)} placeholder="123 Main St" />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>City</label>
                              <StyledInput value={addr.city} onChange={(e) => updateAddress(i, "city", e.target.value)} placeholder="New York" />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>State</label>
                              <StyledInput value={addr.state} onChange={(e) => updateAddress(i, "state", e.target.value)} placeholder="NY" />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 11 }}>ZIP</label>
                              <StyledInput value={addr.zip} onChange={(e) => updateAddress(i, "zip", e.target.value)} placeholder="10001" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button"
                    onClick={() => setForm((prev) => ({ ...prev, addresses: [...prev.addresses, { address: "", city: "", state: "", zip: "", label: "home" }] }))}
                    style={dashedBtnStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentMain; e.currentTarget.style.color = accentMain; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = dashedBtnBord; e.currentTarget.style.color = dashedBtnClr; }}
                  >
                    <MapPin size={13} /> Add address
                  </button>
                </div>

                {/* Source */}
                <div style={sectionTitle}>Source</div>
                <div style={{ marginBottom: 28 }}>
                  <StyledSelect value={form.source} onChange={(e) => set("source", e.target.value)}>
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
                  <textarea rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}
                    placeholder="Any additional notes..."
                    style={{ ...inputStyle, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
                    onFocus={focusHandler} onBlur={blurHandler}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "16px 24px", borderTop: `1px solid ${footerBorder}`, display: "flex", gap: 10, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.02)" : "#fff" }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  type="button" onClick={onClose}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${cancelBtnBord}`, background: cancelBtnBg, fontSize: 13, fontWeight: 600, color: textSecondary, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: isDark ? "0 4px 16px rgba(124,124,240,0.35)" : "0 4px 16px rgba(91,91,214,0.30)" }}
                  whileTap={{ scale: 0.97 }}
                  type="button" onClick={handleSubmit}
                  style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: accentMain, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 3px rgba(91,91,214,0.35)", fontFamily: "inherit" }}>
                  <Save size={14} /> Save Changes
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};