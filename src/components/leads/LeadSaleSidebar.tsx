//@ts-nocheck
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  X, User, Phone, MapPin, DollarSign, Building, Tag,
  Calendar, Briefcase, CheckSquare, Plus, Trash2, ChevronDown,
} from "lucide-react";
import api from "../../api";
import { Toaster, toast } from "react-hot-toast";
import { DateInput, DateTimeInput } from "../ui/AppDatePicker";

const servicesList = [
  "Website Design & Development", "Mobile Application Development", "Full Stack Development Services",
  "Search Engine Optimization", "UI/UX Design And Animation", "Website Revamping",
  "Website Support & Maintenance", "Social Media Marketing (Paid)", "Local SEO/ Google My Business",
  "Pay Per Click (SEM)", "Social Media Management", "Email Marketing", "SMS Marketing",
  "Video Marketing", "App Store Optimization (ASO)", "CRM Software", "Calligraphy Course", "Calligraphy Workshop",
];

const currencies = [
  { value: "USD", label: "USD — US Dollar" }, { value: "PKR", label: "PKR — Pakistani Rupee" },
  { value: "GBP", label: "GBP — British Pound" }, { value: "EUR", label: "EUR — Euro" },
  { value: "AED", label: "AED — UAE Dirham" }, { value: "SAR", label: "SAR — Saudi Riyal" },
];

const niches = [
  { value: "tech", label: "Technology" }, { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" }, { value: "ecommerce", label: "E-commerce" },
  { value: "education", label: "Education" }, { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const selectStyles = {
  control: (p, s) => ({
    ...p,
    border: `1px solid ${s.isFocused ? "#5B5BD6" : "#D0D5DD"}`,
    borderRadius: 8, padding: "1px 4px",
    boxShadow: s.isFocused ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
    "&:hover": { borderColor: "#5B5BD6" },
    minHeight: 38, background: "#fff", transition: "all 0.15s",
  }),
  menu: (p) => ({ ...p, borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 99999 }),
  option: (p, s) => ({ ...p, background: s.isSelected ? "#5B5BD6" : s.isFocused ? "#EFF6FF" : "#fff", color: s.isSelected ? "#fff" : "#344054", padding: "9px 14px", fontSize: 13 }),
  placeholder: (p) => ({ ...p, color: "#98A2B3", fontSize: 13 }),
  singleValue: (p) => ({ ...p, color: "#101828", fontSize: 13 }),
  multiValue: (p) => ({ ...p, background: "#EFF6FF", borderRadius: 6 }),
  multiValueLabel: (p) => ({ ...p, color: "#4747C2", fontSize: 12, fontWeight: 600 }),
  multiValueRemove: (p) => ({ ...p, color: "#3B82F6", "&:hover": { background: "#DBEAFE", color: "#4747C2" } }),
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, iconBg, iconColor, collapsible = false, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12 }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{
          padding: "11px 16px", borderBottom: open ? "1px solid #EAECF0" : "none",
          display: "flex", alignItems: "center", gap: 10,
          cursor: collapsible ? "pointer" : "default",
        }}
        onMouseEnter={e => { if (collapsible) e.currentTarget.style.background = "#F9FAFB"; }}
        onMouseLeave={e => { if (collapsible) e.currentTarget.style.background = "#fff"; }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} style={{ color: iconColor }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#344054", textTransform: "uppercase", letterSpacing: "0.06em", flex: 1 }}>{title}</span>
        {collapsible && (
          <ChevronDown size={13} style={{ color: "#98A2B3", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "16px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase = {
  width: "100%", padding: "8px 11px", fontSize: 13, color: "#101828",
  border: "1px solid #D0D5DD", borderRadius: 8, outline: "none",
  background: "#fff", transition: "border 0.15s, box-shadow 0.15s", boxSizing: "border-box",
};

function TInput({ value, onChange, placeholder, type = "text" }) {
  const [f, setF] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ ...inputBase, borderColor: f ? "#5B5BD6" : "#D0D5DD", boxShadow: f ? "0 0 0 3px rgba(37,99,235,0.10)" : "none" }}
      onFocus={() => setF(true)} onBlur={() => setF(false)} />
  );
}

function TArea({ value, onChange, placeholder, rows = 3 }) {
  const [f, setF] = useState(false);
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ ...inputBase, resize: "none", borderColor: f ? "#5B5BD6" : "#D0D5DD", boxShadow: f ? "0 0 0 3px rgba(37,99,235,0.10)" : "none" }}
      onFocus={() => setF(true)} onBlur={() => setF(false)} />
  );
}

function PillToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: "#F2F4F7", borderRadius: 8, padding: 3, width: "fit-content" }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? "#fff" : "transparent",
            color: value === opt.value ? "#101828" : "#667085",
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
            transition: "all 0.15s",
          }}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LeadSaleSidebar({ isOpen, onClose, item, itemType, onSaveSuccess }) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [disposition, setDisposition] = useState(null);
  const [dispositions, setDispositions] = useState([]);
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [comments, setComments] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(null);
  const [paymentType, setPaymentType] = useState("one-time");
  const [billingDate, setBillingDate] = useState("");
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessNiche, setBusinessNiche] = useState(null);
  const [showTags, setShowTags] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/voice/dispositions/all").then(res => {
      setDispositions(
        (res.data || []).filter(d => d.status !== false)
          .sort((a, b) => a.sequence - b.sequence)
          .map(d => ({ value: d.id, label: d.name, color: d.color }))
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen || !item) {
      setClientName(""); setClientPhone(""); setClientAddress("");
      setDisposition(null); setNextFollowupDate(""); setAlternatePhone(""); setComments(""); setTags([]);
      setSelectedServices([]); setAmount(""); setCurrency(null); setPaymentType("one-time"); setBillingDate("");
      setShowBusinessDetails(false); setBusinessName(""); setBusinessAddress(""); setBusinessDescription(""); setBusinessNiche(null); setShowTags(false);
      return;
    }
    setClientName(item.clientName || "");
    setClientPhone(item.clientPhone || "");
    setClientAddress(item.clientAddress || "");

    if (itemType === "leads") {
      if (item.disposition) {
        setDisposition({ value: item.disposition.id || item.disposition, label: item.disposition.name || item.disposition });
      }
      if (item.nextFollowupDate) {
        const d = new Date(item.nextFollowupDate);
        if (!isNaN(d.getTime())) setNextFollowupDate(d.toISOString().slice(0, 16));
      }
      setAlternatePhone(item.alternatePhone || "");
      setComments(item.comments || "");
      const t = (item.tags || []).map(t => ({ value: t, label: t }));
      setTags(t); setShowTags(t.length > 0);
    } else if (itemType === "sales") {
      setSelectedServices(item.services || []);
      setAmount(item.amount?.toString() || "");
      setCurrency(currencies.find(c => c.value === item.currency) || null);
      setPaymentType(item.paymentType || "one-time");
      if (item.billingDate) {
        const d = new Date(item.billingDate);
        if (!isNaN(d.getTime())) setBillingDate(d.toISOString().split("T")[0]);
      }
      if (item.businessName || item.businessAddress || item.businessDescription || item.businessNiche) {
        setShowBusinessDetails(true);
        setBusinessName(item.businessName || ""); setBusinessAddress(item.businessAddress || "");
        setBusinessDescription(item.businessDescription || "");
        setBusinessNiche(niches.find(n => n.value === item.businessNiche) || null);
      }
      const t = (item.tags || []).map(t => ({ value: t, label: t }));
      setTags(t); setShowTags(t.length > 0);
    }
  }, [item, itemType, isOpen]);

  const toggleService = s => setSelectedServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSave = async () => {
    if (!clientName.trim() || !clientPhone.trim()) { toast.error("Name and phone are required."); return; }
    setSaving(true);
    try {
      const base = {
        client: { name: clientName.trim(), phone: clientPhone.trim(), address: clientAddress.trim() || undefined },
        tags: tags.map(t => t.value),
      };
      if (itemType === "leads") {
        await api.put(`/voice/leads/update/${item.id}`, {
          ...base, dispositionId: disposition?.value,
          nextFollowupDate: nextFollowupDate || null,
          alternatePhone: alternatePhone.trim() || undefined,
          comments: comments.trim() || undefined,
        });
      } else {
        await api.put(`/voice/sales/update/${item.id}`, {
          ...base, services: selectedServices, amount: Number(amount) || 0,
          currency: currency?.value, paymentType,
          billingDate: paymentType === "recurring" && billingDate ? billingDate : undefined,
          ...(showBusinessDetails ? {
            businessName: businessName.trim(), businessAddress: businessAddress.trim(),
            businessDescription: businessDescription.trim(), businessNiche: businessNiche?.value,
          } : {}),
        });
      }
      toast.success("Changes saved!");
      onSaveSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Update failed: " + (err?.response?.data?.message || err.message));
    } finally { setSaving(false); }
  };

  const deleteSingle = () => {
    toast(t => (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#101828" }}>
          Delete this {itemType === "sales" ? "sale" : "lead"}?
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#667085" }}>This action cannot be undone.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => toast.dismiss(t.id)}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #D0D5DD", background: "#fff", fontSize: 13, fontWeight: 500, color: "#344054", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const loadId = toast.loading("Deleting...");
              try {
                const url = itemType === "sales" ? `/voice/sales/delete/${item.id}` : `/voice/leads/delete/${item.id}`;
                const res = await api.delete(url);
                if (res.status === 200) {
                  toast.success("Deleted successfully", { id: loadId });
                  onClose?.(); onSaveSuccess?.();
                } else {
                  toast.error("Failed to delete", { id: loadId });
                }
              } catch (error) {
                toast.error("Error: " + error.message, { id: loadId });
              }
            }}
            style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: Infinity, position: "top-center",
      style: { border: "1px solid #EAECF0", borderRadius: 12, padding: "16px", background: "#fff", maxWidth: 360 },
    });
  };

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1, transition: { type: "spring", damping: 26, stiffness: 200 } }}
            exit={{ x: "100%", opacity: 0, transition: { duration: 0.22 } }}
            style={{
              position: "fixed", top: 0, right: 0, height: "100%",
              width: 560, background: "#F8F9FC", zIndex: 50,
              display: "flex", flexDirection: "column",
              fontFamily: "'Inter', -apple-system, sans-serif",
              borderLeft: "1px solid #EAECF0",
            }}
          >
            {/* ── Header ── */}
            <div style={{
              background: "#fff", borderBottom: "1px solid #EAECF0",
              padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#101828", margin: 0, letterSpacing: "-0.02em" }}>
                  Edit {itemType === "sales" ? "Sale" : "Lead"}
                </h2>
                {item && (
                  <p style={{ fontSize: 12, color: "#667085", margin: 0 }}>{item.clientName}</p>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={deleteSingle}
                  title="Delete"
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: "1px solid #FECACA",
                    background: "#FEF2F2", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FEE2E2"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; }}
                >
                  <Trash2 size={14} style={{ color: "#DC2626" }} />
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: "1px solid #EAECF0",
                    background: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                >
                  <X size={15} style={{ color: "#667085" }} />
                </button>
              </div>
            </div>

            {/* ── Scrollable Content ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Client Info */}
              <SectionCard title="Client Information" icon={User} iconBg="#EFF6FF" iconColor="#5B5BD6">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={grid2}>
                    <Field label="Full Name" required><TInput value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Doe" /></Field>
                    <Field label="Phone Number" required><TInput value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+92 300 0000000" /></Field>
                  </div>
                  <Field label="Address (Optional)"><TInput value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="City, Country" /></Field>
                </div>
              </SectionCard>

              {/* ── LEAD fields ── */}
              {itemType === "leads" && (
                <SectionCard title="Lead Details" icon={CheckSquare} iconBg="#EFF6FF" iconColor="#5B5BD6">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Disposition">
                      <Select options={dispositions} value={disposition} onChange={setDisposition} styles={selectStyles} placeholder="Select disposition..." isClearable />
                    </Field>
                    <div style={grid2}>
                      <Field label="Next Follow-up Date">
                        <DateTimeInput value={nextFollowupDate} onChange={(val) => setNextFollowupDate(val)}
                          style={{ ...inputBase }} />
                      </Field>
                      <Field label="Alternate Phone">
                        <TInput value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} placeholder="+92 321 0000000" />
                      </Field>
                    </div>
                    <Field label="Comments / Notes">
                      <TArea value={comments} onChange={e => setComments(e.target.value)} placeholder="Any notes about this lead..." rows={3} />
                    </Field>
                    <Field label="Tags">
                      <CreatableSelect isMulti value={tags} onChange={setTags} styles={selectStyles} placeholder="Type and press Enter..." />
                    </Field>
                  </div>
                </SectionCard>
              )}

              {/* ── SALE fields ── */}
              {itemType === "sales" && (
                <>
                  {/* Services */}
                  <SectionCard title="Services Sold" icon={CheckSquare} iconBg="#F5F3FF" iconColor="#7C3AED">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {servicesList.map(s => (
                        <label key={s} onClick={() => toggleService(s)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                            borderRadius: 8, cursor: "pointer", fontSize: 12, transition: "all 0.12s",
                            border: `1px solid ${selectedServices.includes(s) ? "#7C3AED" : "#EAECF0"}`,
                            background: selectedServices.includes(s) ? "#F5F3FF" : "#FAFAFA",
                            color: selectedServices.includes(s) ? "#5B21B6" : "#344054",
                            fontWeight: selectedServices.includes(s) ? 600 : 400,
                          }}
                        >
                          <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${selectedServices.includes(s) ? "#7C3AED" : "#D0D5DD"}`, background: selectedServices.includes(s) ? "#7C3AED" : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {selectedServices.includes(s) && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: 2 }} />}
                          </div>
                          {s}
                        </label>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Payment */}
                  <SectionCard title="Payment Details" icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A">
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={grid2}>
                        <Field label="Amount" required><TInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
                        <Field label="Currency"><Select options={currencies} value={currency} onChange={setCurrency} styles={selectStyles} menuPosition="fixed" /></Field>
                      </div>
                      <Field label="Payment Type">
                        <PillToggle
                          options={[{ value: "one-time", label: "One-Time" }, { value: "recurring", label: "Recurring" }]}
                          value={paymentType} onChange={setPaymentType}
                        />
                      </Field>
                      <AnimatePresence>
                        {paymentType === "recurring" && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                            <Field label="Next Billing Date">
                              <DateInput value={billingDate} onChange={(val) => setBillingDate(val)} style={{ ...inputBase, maxWidth: 200 }} />
                            </Field>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </SectionCard>

                  {/* Business Details - collapsible */}
                  <SectionCard title="Business Details" icon={Building} iconBg="#EFF6FF" iconColor="#5B5BD6" collapsible defaultOpen={showBusinessDetails}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={grid2}>
                        <Field label="Business Name"><TInput value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Corp" /></Field>
                        <Field label="Niche"><Select options={niches} value={businessNiche} onChange={setBusinessNiche} styles={selectStyles} menuPosition="fixed" placeholder="Select..." /></Field>
                      </div>
                      <Field label="Business Address"><TInput value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="City, Country" /></Field>
                      <Field label="Description"><TArea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="Brief description..." rows={3} /></Field>
                    </div>
                  </SectionCard>

                  {/* Tags - collapsible */}
                  <SectionCard title="Tags" icon={Tag} iconBg="#F5F3FF" iconColor="#7C3AED" collapsible defaultOpen={showTags}>
                    <CreatableSelect isMulti value={tags} onChange={setTags} styles={selectStyles} placeholder="Type and press Enter..." />
                  </SectionCard>
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              background: "#fff", borderTop: "1px solid #EAECF0",
              padding: "12px 16px", display: "flex", gap: 10, flexShrink: 0,
            }}>
              <button onClick={onClose}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #D0D5DD",
                  background: "#fff", fontSize: 13, fontWeight: 500, color: "#344054", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{
                  flex: 2, padding: "9px 0", borderRadius: 8, border: "none",
                  background: saving ? "#93C5FD" : "#5B5BD6", fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#4747C2"; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#5B5BD6"; }}
              >
                {saving ? (
                  <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  Saving...</>
                ) : (
                  <><Plus size={14} /> Save Changes</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
      {/* <Toaster position="top-right" /> */}
    </AnimatePresence>
  );
}