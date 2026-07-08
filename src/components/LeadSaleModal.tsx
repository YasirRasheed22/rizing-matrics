//@ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import {
  X,
  User,
  Phone,
  MapPin,
  DollarSign,
  Building,
  Calendar,
  Briefcase,
  CheckSquare,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { DateInput, DateTimeInput } from "./ui/AppDatePicker";

interface CallLeadSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerNumber: string;
  contactInfo: { name?: string; address?: string } | null;
  fetchContactInfo: (number: string) => Promise<void>;
}

const minDateTime = new Date().toISOString().slice(0, 16);

const servicesList = [
  "Website Design & Development",
  "Mobile Application Development",
  "Full Stack Development Services",
  "Search Engine Optimization",
  "UI/UX Design And Animation",
  "Website Revamping",
  "Website Support & Maintenance",
  "Social Media Marketing (Paid)",
  "Local SEO/ Google My Business",
  "Pay Per Click (SEM)",
  "Social Media Management",
  "Email Marketing",
  "SMS Marketing",
  "Video Marketing",
  "App Store Optimization (ASO)",
  "CRM Software",
  "Calligraphy Course",
  "Calligraphy Workshop",
];

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "PKR", label: "PKR - Pakistani Rupee" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
];

const niches = [
  { value: "tech", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "education", label: "Education" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

export default function CallLeadSaleModal({
  isOpen,
  onClose,
  customerName,
  customerNumber,
  contactInfo,
  fetchContactInfo,
  isDark
}: CallLeadSaleModalProps) {
  

  // Theme Colors
  const textPrimary = isDark ? "#F0F0F5" : "#111827";
  const textMuted = isDark ? "#68687A" : "#6b7280";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const accentMain = isDark ? "#7C7CF0" : "#2563eb";
  const successColor = isDark ? "#4ADE80" : "#16a34a";

  const [type, setType] = useState<"sale" | "lead">("lead");
  const [clientName, setClientName] = useState(customerName || "");
  const [clientAddress, setClientAddress] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<any>(currencies[1]);
  const [paymentType, setPaymentType] = useState<"one-time" | "recurring">("one-time");
  const [billingDate, setBillingDate] = useState("");

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessNiche, setBusinessNiche] = useState<any>(null);

  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState<any[]>([]);

  const [disposition, setDisposition] = useState<any>(null);
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [comments, setComments] = useState("");
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [addToContacts, setAddToContacts] = useState(false);
  const fetchedContactForRef = useRef<string | null>(null);

  // Dynamic Select Styles
  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: `2px solid ${state.isFocused ? accentMain : cardBorder}`,
      borderRadius: "16px",
      minHeight: "50px",
      boxShadow: state.isFocused ? `0 0 0 4px ${isDark ? "rgba(124,124,240,0.2)" : "rgba(59,130,246,0.12)"}` : "none",
      padding: "4px 6px",
      background: cardBg,
      color: textPrimary,
      "&:hover": { borderColor: accentMain },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.16)",
      background: cardBg,
      zIndex: 999999,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? accentMain : state.isFocused ? (isDark ? "rgba(124,124,240,0.15)" : "#eff6ff") : cardBg,
      color: state.isSelected ? "#fff" : textPrimary,
      padding: "12px 16px",
      fontSize: "14px",
    }),
    placeholder: (provided: any) => ({ ...provided, color: textMuted, fontSize: "14px" }),
    singleValue: (provided: any) => ({ ...provided, color: textPrimary, fontSize: "14px" }),
    multiValue: (provided: any) => ({ ...provided, backgroundColor: accentMain, borderRadius: "10px", color: "#fff" }),
    multiValueLabel: (provided: any) => ({ ...provided, color: "#fff" }),
  };

  // Existing useEffects (unchanged)
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.post("/voice/leads/phone", { phone: customerNumber });
        setAddToContacts(res.data?.isContact || false);
        if (res.data?.isContact) {
          setClientAddress(res.data?.contact?.addresses?.[0]?.address || "");
        }
      } catch (err) {
        console.error("Failed to fetch phone info", err);
      }
    };
    if (isOpen && customerNumber) fetchInfo();
  }, [customerNumber, isOpen]);

  useEffect(() => {
    const fetchDispositions = async () => {
      try {
        const res = await api.get("/voice/dispositions/all");
        setDispositions(
          (res.data || [])
            .filter((d: any) => d.status !== false)
            .sort((a: any, b: any) => a.sequence - b.sequence)
            .map((d: any) => ({
              value: d.id,
              label: d.name,
              color: d.color,
            }))
        );
      } catch (err) {
        console.error("Failed to load dispositions", err);
      }
    };
    fetchDispositions();
  }, []);

  useEffect(() => {
    if (!isOpen || !customerNumber) return;
    if (fetchedContactForRef.current === customerNumber) return;
    fetchedContactForRef.current = customerNumber;
    fetchContactInfo(customerNumber);
  }, [isOpen, customerNumber, fetchContactInfo]);

  useEffect(() => {
    if (contactInfo) {
      setClientName(contactInfo.name || customerName || "");
      if (contactInfo.address) setClientAddress(contactInfo.address);
    }
  }, [contactInfo, customerName]);

  useEffect(() => {
    if (!isOpen) {
      setType("lead");
      setClientName(customerName || "");
      setClientAddress("");
      setSelectedServices([]);
      setAmount("");
      setCurrency(currencies[1]);
      setPaymentType("one-time");
      setBillingDate("");
      setShowBusinessDetails(false);
      setBusinessName("");
      setBusinessAddress("");
      setBusinessDescription("");
      setBusinessNiche(null);
      setShowTags(false);
      setTags([]);
      setDisposition(null);
      setNextFollowupDate("");
      setAlternatePhone("");
      setComments("");
      setAddToContacts(false);
      fetchedContactForRef.current = null;
    }
  }, [isOpen, customerName]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async () => {
    try {
      if (type === "sale") {
        const payload = {
          type: "sale",
          client: { name: clientName, phone: customerNumber, address: clientAddress },
          services: selectedServices,
          amount: Number(amount || 0),
          currency: currency?.value,
          paymentType,
          billingDate: paymentType === "recurring" ? billingDate : undefined,
          business: showBusinessDetails ? {
            name: businessName,
            address: businessAddress,
            description: businessDescription,
            niche: businessNiche?.value,
          } : undefined,
          tags: tags.map((t) => t.value),
        };

        await api.post("/voice/leads/sale", payload);
        toast.success("Sale created successfully");
      } else {
        const payload = {
          type: "lead",
          client: { name: clientName, phone: customerNumber, address: clientAddress },
          dispositionId: disposition?.value || null,
          nextFollowupDate: nextFollowupDate || null,
          alternatePhone: alternatePhone || null,
          comments: comments || null,
          tags: tags.map((t) => t.value),
          addToContacts,
        };

        await api.post("/voice/leads/create", payload);
        toast.success("Lead created successfully");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "stretch",
        }}
        onClick={onClose}
      >
        <motion.div
          style={{
            width: "100%",
            maxWidth: 780,
            height: "100vh",
            background: cardBg,
            boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.6)" : "0 20px 50px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 180 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ height: 72, background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
              {type === "sale" ? "Create Sale" : "Create Lead"}
            </div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", width: 40, height: 40, borderRadius: 999, cursor: "pointer" }}>
              <X size={22} color={textMuted} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Type Toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: cardBg, border: `2px solid ${type === "lead" ? successColor : cardBorder}`, borderRadius: 18, cursor: "pointer" }}>
                  <input type="radio" name="type" checked={type === "lead"} onChange={() => setType("lead")} style={{ display: "none" }} />
                  <div style={{ width: 46, height: 46, borderRadius: 999, background: successColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={20} color="#fff" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>Create Lead</div>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: cardBg, border: `2px solid ${type === "sale" ? accentMain : cardBorder}`, borderRadius: 18, cursor: "pointer" }}>
                  <input type="radio" name="type" checked={type === "sale"} onChange={() => setType("sale")} style={{ display: "none" }} />
                  <div style={{ width: 46, height: 46, borderRadius: 999, background: accentMain, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <DollarSign size={20} color="#fff" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>Create Sale</div>
                </label>
              </div>

              {/* Contact Information */}
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 18 }}>
                  <User size={20} color={textMuted} />
                  <span>Contact Information</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Field isDark={isDark} icon={<User size={18} color={textMuted} />} label="Full Name" value={clientName} onChange={(e: any) => setClientName(e.target.value)} />
                  <Field isDark={isDark} icon={<Phone size={18} color={textMuted} />} label="Phone Number" value={customerNumber} disabled />
                  <Field isDark={isDark} icon={<MapPin size={18} color={textMuted} />} label="Address (Optional)" value={clientAddress} onChange={(e: any) => setClientAddress(e.target.value)} full />
                </div>

                <div style={{ marginTop: 18, background: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>Save to Contacts</span>
                  <button type="button" onClick={() => setAddToContacts(!addToContacts)} style={{ width: 52, height: 28, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", background: addToContacts ? accentMain : cardBorder }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: "#fff", display: "block", transform: addToContacts ? "translateX(24px)" : "translateX(0)", transition: "all 0.2s ease" }} />
                  </button>
                </div>
              </div>

              {/* SALE MODE */}
              {type === "sale" ? (
                <>
                  {/* Services Sold */}
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 18 }}>
                      <CheckSquare size={20} color={accentMain} />
                      <span>Services Sold</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {servicesList.map((service) => (
                        <label key={service} onClick={() => toggleService(service)} style={{ display: "flex", alignItems: "center", gap: 10, background: selectedServices.includes(service) ? (isDark ? "rgba(124,58,237,0.15)" : "#f3e8ff") : cardBg, border: `1px solid ${selectedServices.includes(service) ? accentMain : cardBorder}`, borderRadius: 14, padding: 12, cursor: "pointer" }}>
                          <input type="checkbox" checked={selectedServices.includes(service)} onChange={() => toggleService(service)} style={{ display: "none" }} />
                          <span style={{ fontSize: 14, color: textPrimary }}>{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Business Details */}
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: textPrimary, cursor: "pointer" }}>
                      <input type="checkbox" checked={showBusinessDetails} onChange={(e) => setShowBusinessDetails(e.target.checked)} />
                      <span>Add Business Details</span>
                    </label>

                    {showBusinessDetails && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                          <Field isDark={isDark} icon={<Building size={18} color={textMuted} />} label="Business Name" value={businessName} onChange={(e: any) => setBusinessName(e.target.value)} />
                          <div>
                            <Select options={niches} value={businessNiche} onChange={setBusinessNiche} styles={selectStyles} placeholder="Business Niche" menuPosition="fixed" />
                          </div>
                          <Field  isDark={isDark} icon={<MapPin size={18} color={textMuted} />} label="Business Address" value={businessAddress} onChange={(e: any) => setBusinessAddress(e.target.value)} full />
                          <TextAreaField isDark={isDark} icon={<Briefcase size={18} color={textMuted} />} label="Business Description" value={businessDescription} onChange={(e: any) => setBusinessDescription(e.target.value)} full />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 18 }}>
                      <DollarSign size={20} color={successColor} />
                      <span>Payment Details</span>
                    </div>
                    {/* Payment fields... (kept same as before with theme) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 18 }}>
                      <Field isDark={isDark} icon={<DollarSign size={18} color={textMuted} />} label="Amount" value={amount} onChange={(e: any) => setAmount(e.target.value)} type="number" />
                      <div style={{ gridColumn: "span 2" }}>
                        <Select options={currencies} value={currency} onChange={setCurrency} styles={selectStyles} placeholder="Select Currency" menuPosition="fixed" />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 24 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: textPrimary }}>
                        <input type="radio" checked={paymentType === "one-time"} onChange={() => setPaymentType("one-time")} /> One-Time
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: textPrimary }}>
                        <input type="radio" checked={paymentType === "recurring"} onChange={() => setPaymentType("recurring")} /> Recurring
                      </label>
                    </div>

                    {paymentType === "recurring" && (
                      <div style={{ marginTop: 18, maxWidth: 280 }}>
                        <DateInput value={billingDate} onChange={setBillingDate} style={{ width: "100%" }} />
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, color: textPrimary, cursor: "pointer" }}>
                      <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} />
                      <span>Add Tags</span>
                    </label>

                    {showTags && (
                      <div style={{ marginTop: 18 }}>
                        <CreatableSelect isMulti value={tags} onChange={setTags} styles={selectStyles} placeholder="Type tag and press Enter..." menuPosition="fixed" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* LEAD MODE */
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 18 }}>
                    <Plus size={20} color={successColor} />
                    <span>Lead Details</span>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", marginBottom: 10, fontSize: 15, fontWeight: 700, color: textPrimary }}>Lead Disposition</label>
                    <Select options={dispositions} value={disposition} onChange={setDisposition} styles={selectStyles} placeholder="Select disposition" menuPosition="fixed" />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    <DateTimeInput value={nextFollowupDate} onChange={setNextFollowupDate} min={minDateTime} />
                    <Field isDark={isDark} icon={<Phone size={18} color={textMuted} />} label="Alternate Phone (Optional)" value={alternatePhone} onChange={(e: any) => setAlternatePhone(e.target.value)} full />
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <CreatableSelect isMulti value={tags} onChange={setTags} styles={selectStyles} placeholder="Add relevant tags..." menuPosition="fixed" />
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <TextAreaField  isDark={isDark} label="Comments / Notes" value={comments} onChange={(e: any) => setComments(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: cardBg, borderTop: `1px solid ${cardBorder}`, padding: 16, display: "flex", gap: 12, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 14, border: `2px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSubmit} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: type === "sale" ? accentMain : successColor }}>
              <Plus size={18} color="#fff" />
              <span>{type === "sale" ? "Create Sale" : "Create Lead"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* Reusable Themed Components */
function Field({ icon, label, value, onChange, type = "text", disabled = false, full = false , isDark }: any) {
  // const { theme } = useTheme();
  
  const textPrimary = isDark ? "#F0F0F5" : "#111827";
  const textMuted = isDark ? "#68687A" : "#6b7280";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return (
    <div style={{ ...(full ? { gridColumn: "1 / -1" } : {}), minWidth: 0 }}>
      <div style={{ position: "relative" }}>
        {icon && <div style={{ position: "absolute", left: 14, top: 16, zIndex: 2 }}>{icon}</div>}
        <input
          style={{
            width: "100%",
            height: 54,
            borderRadius: 16,
            border: `2px solid ${cardBorder}`,
            outline: "none",
            padding: icon ? "18px 14px 0 44px" : "18px 14px 0 14px",
            fontSize: 14,
            color: textPrimary,
            background: isDark ? "rgba(20,20,28,0.98)" : "#fff",
          }}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <label style={{ position: "absolute", top: 8, left: icon ? 42 : 14, fontSize: 12, color: textMuted, pointerEvents: "none" }}>
          {label}
        </label>
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, isDark }: any) {

  const textPrimary = isDark ? "#F0F0F5" : "#111827";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return (
    <div>
      <label style={{ display: "block", marginBottom: 8, fontSize: 15, fontWeight: 700, color: textPrimary }}>{label}</label>
      <textarea
        rows={5}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          borderRadius: 16,
          border: `2px solid ${cardBorder}`,
          outline: "none",
          padding: 14,
          fontSize: 14,
          color: textPrimary,
          background: isDark ? "rgba(20,20,28,0.98)" : "#fff",
          resize: "vertical",
        }}
      />
    </div>
  );
}