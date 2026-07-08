//@ts-nocheck
import { useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  User,
  DollarSign,
  Building,
  Tag,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  ChevronDown,
  CheckSquare,
  Plus,
} from "lucide-react";
import api from "../api";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DateInput, DateTimeInput } from "../components/ui/AppDatePicker";
import { useTheme } from "../context/ThemeContext";

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
  { value: "USD", label: "USD — US Dollar" },
  { value: "PKR", label: "PKR — Pakistani Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
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

export default function NewLead({
  initialCustomerName = "",
  initialCustomerNumber = "",
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Theme Colors ──
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A3A3B0" : "#344054";
  const textMuted = isDark ? "#68687A" : "#667085";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const headerBorder = isDark ? "rgba(255,255,255,0.06)" : "#EAECF0";
  const bgPage = isDark ? "#0A0A0F" : "#F8F9FC";
  const inputBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";

  // Dynamic Select Styles
  const selectStyles = {
    control: (p, s) => ({
      ...p,
      border: `1px solid ${s.isFocused ? accentMain : cardBorder}`,
      borderRadius: 8,
      padding: "2px 4px",
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.2)" : "rgba(37,99,235,0.12)"}` : "none",
      "&:hover": { borderColor: accentMain },
      minHeight: 40,
      background: inputBg,
      color: textPrimary,
      transition: "all 0.15s",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 999999 }),
    menu: (p) => ({
      ...p,
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.10)",
      background: cardBg,
      zIndex: 999999,
    }),
    option: (p, s) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF") : cardBg,
      color: s.isSelected ? "#fff" : textPrimary,
      padding: "9px 14px",
      fontSize: 13,
    }),
    placeholder: (p) => ({ ...p, color: textMuted, fontSize: 13 }),
    singleValue: (p) => ({ ...p, color: textPrimary, fontSize: 13 }),
    multiValue: (p) => ({ ...p, background: isDark ? "rgba(124,124,240,0.25)" : "#EFF6FF", borderRadius: 6 }),
    multiValueLabel: (p) => ({ ...p, color: isDark ? "#C4C4FF" : "#4747C2", fontSize: 12, fontWeight: 600 }),
    multiValueRemove: (p) => ({
      ...p,
      color: isDark ? "#A5A5FF" : "#3B82F6",
      "&:hover": { background: isDark ? "rgba(124,124,240,0.3)" : "#DBEAFE", color: accentMain },
    }),
  };

  const [type, setType] = useState("lead");
  const [clientName, setClientName] = useState(initialCustomerName);
  const [clientPhone, setClientPhone] = useState(initialCustomerNumber);
  const [clientAddress, setClientAddress] = useState("");
  const [dispositions, setDispositions] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[1]);
  const [paymentType, setPaymentType] = useState("one-time");
  const [billingDate, setBillingDate] = useState("");
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessNiche, setBusinessNiche] = useState(null);
  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState([]);
  const [disposition, setDisposition] = useState(null);
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [comments, setComments] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [clientType, setClientType] = useState("new");
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (s) =>
    setSelectedServices((p) =>
      p.includes(s) ? p.filter((x) => x !== s) : [...p, s]
    );

  useEffect(() => {
    api
      .get("/voice/dispositions/all")
      .then((res) => {
        setDispositions(
          (res.data || [])
            .filter((d) => d.status !== false)
            .sort((a, b) => a.sequence - b.sequence)
            .map((d) => ({
              value: d.id,
              label: d.name,
              color: d.color,
            }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingContacts(true);
    const token = localStorage.getItem("token");
    api
      .get("/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setContacts(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setClientName(
        [selectedContact.firstName, selectedContact.lastName]
          .filter(Boolean)
          .join(" ")
      );
      setClientPhone(selectedContact.phones?.[0]?.numberE164 || "");
      setClientAddress(selectedContact.addresses?.[0]?.address || "");
    } else if (clientType === "new") {
      setClientName(initialCustomerName);
      setClientPhone(initialCustomerNumber);
      setClientAddress("");
    }
  }, [selectedContact, clientType, initialCustomerName, initialCustomerNumber]);

  const contactOptions = contacts?.map((c) => ({
    value: c.id,
    label: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed",
    contact: c,
  }));

  const resetForm = () => {
    setClientName("");
    setClientPhone("");
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
    setSelectedContact(null);
    setClientType("new");
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("Client name and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (type === "sale") {
        await api.post("/voice/leads/sale", {
          type: "sale",
          client: {
            name: clientName,
            phone: clientPhone,
            address: clientAddress,
          },
          services: selectedServices,
          amount: Number(amount || 0),
          currency: currency?.value,
          paymentType,
          billingDate: paymentType === "recurring" ? billingDate : undefined,
          business: showBusinessDetails
            ? {
                name: businessName,
                address: businessAddress,
                description: businessDescription,
                niche: businessNiche?.value,
              }
            : undefined,
          tags: tags.map((t) => t.value),
        });
        toast.success("Sale created! 🎉");
      } else {
        await api.post("/voice/leads/create", {
          type: "lead",
          client: {
            name: clientName,
            phone: clientPhone,
            address: clientAddress,
          },
          dispositionId: disposition?.value || null,
          nextFollowupDate: nextFollowupDate || null,
          alternatePhone: alternatePhone || null,
          comments: comments || null,
          tags: tags.map((t) => t.value),
          addToContacts: false,
        });
        toast.success("Lead created! ✅");
      }

      resetForm();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgPage,
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: textPrimary,
        paddingBottom: 80,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: cardBg,
          borderBottom: `1px solid ${headerBorder}`,
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: textMuted,
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            New Lead / Sale
          </h1>
          <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
            Fill in the details below
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "24px 28px",
          maxWidth: 860,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Type Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            {
              id: "lead",
              label: "Create Lead",
              sub: "Capture a prospect for follow-up",
              icon: Sparkles,
              activeBorder: accentMain,
              activeBg: isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF",
              iconBg: isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF",
              iconColor: accentMain,
            },
            {
              id: "sale",
              label: "New Sale",
              sub: "Record a successfully closed deal",
              icon: TrendingUp,
              activeBorder: "#16A34A",
              activeBg: isDark ? "rgba(22,163,74,0.15)" : "#F0FDF4",
              iconBg: isDark ? "rgba(22,163,74,0.15)" : "#F0FDF4",
              iconColor: "#16A34A",
            },
          ].map((opt) => (
            <div
              key={opt.id}
              onClick={() => setType(opt.id)}
              style={{
                padding: "16px 18px",
                borderRadius: 12,
                cursor: "pointer",
                border: `1.5px solid ${type === opt.id ? opt.activeBorder : cardBorder}`,
                background: type === opt.id ? opt.activeBg : cardBg,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: opt.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <opt.icon size={18} style={{ color: opt.iconColor }} />
              </div>

              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: 0 }}>
                  {opt.label}
                </p>
                <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>
                  {opt.sub}
                </p>
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${type === opt.id ? opt.activeBorder : cardBorder}`,
                  background: type === opt.id ? opt.activeBorder : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {type === opt.id && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Client Information */}
        <SectionCard title="Client Information" icon={User} iconBg={isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF"} iconColor={accentMain}>
          {/* ... Full content with themed components ... */}
          <div style={{ marginBottom: 16 }}>
            <PillToggle
              options={[
                { value: "new", label: "New Client" },
                { value: "existing", label: "Existing Client" },
              ]}
              value={clientType}
              onChange={(v) => {
                setClientType(v);
                setSelectedContact(null);
              }}
            />
          </div>

          <AnimatePresence>
            {clientType === "existing" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "visible", marginBottom: 16, position: "relative", zIndex: 30 }}
              >
                <Field label="Select Existing Client">
                  <Select
                    instanceId="existing-client-select"
                    options={contactOptions}
                    value={selectedContact ? contactOptions.find((opt) => opt.value === selectedContact.id) : null}
                    onChange={(option) => setSelectedContact(option ? option.contact : null)}
                    placeholder={loadingContacts ? "Loading contacts..." : "Search or select client..."}
                    isLoading={loadingContacts}
                    isClearable
                    isSearchable
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    menuPosition="fixed"
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={grid2}>
            <Field label="Full Name" required>
              <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Doe" />
            </Field>
            <Field label="Phone Number" required>
              <TextInput value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+92 300 0000000" />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field label="Address (Optional)">
              <TextInput value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="City, Country" />
            </Field>
          </div>
        </SectionCard>

        <AnimatePresence mode="wait">
          {type === "lead" ? (
            <motion.div key="lead" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SectionCard title="Lead Details" icon={Sparkles} iconBg={isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF"} iconColor={accentMain}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Disposition">
                    <Select
                      instanceId="disposition-select"
                      options={dispositions}
                      value={disposition}
                      onChange={setDisposition}
                      styles={selectStyles}
                      placeholder="Select disposition..."
                      isClearable
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                    />
                  </Field>

                  <div style={grid2}>
                    <Field label="Next Follow-up Date">
                      <DateTimeInput value={nextFollowupDate} onChange={setNextFollowupDate} style={{ width: "100%" }} />
                    </Field>
                    <Field label="Alternate Phone (Optional)">
                      <TextInput value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} placeholder="+92 321 0000000" />
                    </Field>
                  </div>

                  <Field label="Tags">
                    <CreatableSelect
                      instanceId="lead-tags-select"
                      isMulti
                      value={tags}
                      onChange={setTags}
                      styles={selectStyles}
                      placeholder="Type and press Enter..."
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                    />
                  </Field>

                  <Field label="Comments / Notes">
                    <TextArea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Any relevant notes about this lead..." rows={4} />
                  </Field>
                </div>
              </SectionCard>
            </motion.div>
          ) : (
            <motion.div key="sale" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Services Sold */}
              <SectionCard title="Services Sold" icon={CheckSquare} iconBg={isDark ? "rgba(124,58,237,0.15)" : "#F5F3FF"} iconColor={isDark ? "#A78BFA" : "#7C3AED"}>
                <div style={grid3}>
                  {servicesList.map((s) => (
                    <label
                      key={s}
                      onClick={() => toggleService(s)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 0.12s",
                        border: `1px solid ${selectedServices.includes(s) ? (isDark ? "#A78BFA" : "#7C3AED") : cardBorder}`,
                        background: selectedServices.includes(s) ? (isDark ? "rgba(124,58,237,0.15)" : "#F5F3FF") : cardBg,
                        color: selectedServices.includes(s) ? (isDark ? "#C4C4FF" : "#5B21B6") : textPrimary,
                        fontWeight: selectedServices.includes(s) ? 600 : 400,
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: 4,
                        border: `1.5px solid ${selectedServices.includes(s) ? (isDark ? "#A78BFA" : "#7C3AED") : cardBorder}`,
                        background: selectedServices.includes(s) ? (isDark ? "#A78BFA" : "#7C3AED") : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {selectedServices.includes(s) && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: 2 }} />}
                      </div>
                      {s}
                    </label>
                  ))}
                </div>
              </SectionCard>

              {/* Payment Details */}
              <SectionCard title="Payment Details" icon={DollarSign} iconBg={isDark ? "rgba(22,163,74,0.15)" : "#F0FDF4"} iconColor="#16A34A">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={grid2}>
                    <Field label="Amount" required>
                      <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </Field>
                    <Field label="Currency">
                      <Select options={currencies} value={currency} onChange={setCurrency} styles={selectStyles} menuPortalTarget={typeof document !== "undefined" ? document.body : null} menuPosition="fixed" />
                    </Field>
                  </div>

                  <Field label="Payment Type">
                    <PillToggle
                      options={[
                        { value: "one-time", label: "One-Time" },
                        { value: "recurring", label: "Recurring" },
                      ]}
                      value={paymentType}
                      onChange={setPaymentType}
                    />
                  </Field>

                  <AnimatePresence>
                    {paymentType === "recurring" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                        <Field label="Next Billing Date">
                          <DateInput value={billingDate} onChange={setBillingDate} style={{ width: "100%" }} />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SectionCard>

              {/* Business Details */}
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setShowBusinessDetails(!showBusinessDetails)}
                  style={{
                    width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10,
                    background: "none", border: "none", cursor: "pointer", borderBottom: showBusinessDetails ? `1px solid ${headerBorder}` : "none",
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: isDark ? "rgba(124,124,240,0.15)" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building size={15} style={{ color: accentMain }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", flex: 1, textAlign: "left" }}>
                    Business Details
                  </span>
                  <span style={{ fontSize: 12, color: textMuted, marginRight: 8 }}>
                    {showBusinessDetails ? "Hide" : "Optional"}
                  </span>
                  <ChevronDown size={14} style={{ color: textMuted, transform: showBusinessDetails ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                <AnimatePresence>
                  {showBusinessDetails && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={grid2}>
                          <Field label="Business Name">
                            <TextInput value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" />
                          </Field>
                          <Field label="Niche">
                            <Select options={niches} value={businessNiche} onChange={setBusinessNiche} styles={selectStyles} placeholder="Select..." menuPortalTarget={typeof document !== "undefined" ? document.body : null} menuPosition="fixed" />
                          </Field>
                        </div>
                        <Field label="Business Address">
                          <TextInput value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="City, Country" />
                        </Field>
                        <Field label="Description">
                          <TextArea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Brief description..." rows={3} />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tags */}
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setShowTags(!showTags)}
                  style={{
                    width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10,
                    background: "none", border: "none", cursor: "pointer", borderBottom: showTags ? `1px solid ${headerBorder}` : "none",
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: isDark ? "rgba(124,58,237,0.15)" : "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Tag size={15} style={{ color: isDark ? "#A78BFA" : "#7C3AED" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", flex: 1, textAlign: "left" }}>
                    Tags
                  </span>
                  <span style={{ fontSize: 12, color: textMuted, marginRight: 8 }}>
                    {showTags ? "Hide" : "Optional"}
                  </span>
                  <ChevronDown size={14} style={{ color: textMuted, transform: showTags ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                <AnimatePresence>
                  {showTags && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "20px" }}>
                        <CreatableSelect
                          instanceId="sale-tags-select"
                          isMulti
                          value={tags}
                          onChange={setTags}
                          styles={selectStyles}
                          placeholder="Type and press Enter..."
                          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                          menuPosition="fixed"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: cardBg,
          borderTop: `1px solid ${headerBorder}`,
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 50,
        }}
      >
        <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
          {type === "lead"
            ? "Creating a lead record"
            : `Sale · ${selectedServices.length} service${selectedServices.length !== 1 ? "s" : ""} selected`}
        </p>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: submitting ? "#94A3B8" : type === "lead" ? accentMain : "#16A34A",
          }}
        >
          {submitting ? (
            <>Saving...</>
          ) : (
            <>
              <Plus size={15} />
              {type === "sale" ? "Create Sale" : "Create Lead"}
            </>
          )}
        </button>
      </div>

      {/* <Toaster position="top-right" /> */}
    </div>
  );
}

// Helper Components (Themed)
function SectionCard({ title, icon: Icon, iconBg, iconColor, children }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#F0F0F5" : "#344054", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#68687A" : "#667085", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
        {required && <span style={{ color: "#EF4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [focused, setFocused] = useState(false);
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: 13,
        color: isDark ? "#F0F0F5" : "#101828",
        border: `1px solid ${focused ? accentMain : (isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD")}`,
        borderRadius: 8,
        outline: "none",
        background: isDark ? "rgba(20,20,28,0.98)" : "#fff",
        boxShadow: focused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.2)" : "rgba(37,99,235,0.1)"}` : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [focused, setFocused] = useState(false);
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";

  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: 13,
        color: isDark ? "#F0F0F5" : "#101828",
        border: `1px solid ${focused ? accentMain : (isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD")}`,
        borderRadius: 8,
        outline: "none",
        background: isDark ? "rgba(20,20,28,0.98)" : "#fff",
        resize: "vertical",
        boxShadow: focused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.2)" : "rgba(37,99,235,0.1)"}` : "none",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function PillToggle({ options, value, onChange }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";

  return (
    <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.08)" : "#F2F4F7", borderRadius: 8, padding: 3, width: "fit-content" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? (isDark ? accentMain : "#fff") : "transparent",
            color: value === opt.value ? (isDark ? "#fff" : "#101828") : textMuted,
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            transition: "all 0.15s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}