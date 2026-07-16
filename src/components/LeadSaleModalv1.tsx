// src/components/LeadSaleModal.tsx
//@ts-nocheck
import { useEffect, useState } from "react";
import Select from "react-select";
import { motion, AnimatePresence } from "framer-motion";
import CreatableSelect from "react-select/creatable";
import api from "../api";
import {
  X,
  User,
  Phone,
  MapPin,
  DollarSign,
  Building,
  Tag,
  Calendar,
  Briefcase,
  CheckSquare,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { DateInput, DateTimeInput } from "./ui/AppDatePicker";

const sidebarVariants = {
  closed: {
    x: "-100%",
    opacity: 0,
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 180,
    },
  },
};

interface LeadSaleModalProps {
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

const selectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    border: "2px solid #e2e8f0",
    borderRadius: "16px",
    padding: "8px 12px",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(234, 15, 150, 0.15)" : "none",
    "&:hover": { borderColor: "#e2e8f0" },
    minHeight: "50px",
    backgroundColor: "white",
  }),
  menu: (provided: any) => ({
    ...provided,
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
    zIndex: 99999,
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--logo-magenta)"
      : state.isFocused
      ? "#f8f9fa"
      : "white",
    color: state.isSelected ? "white" : "#1a202c",
    padding: "12px 20px",
    fontSize: "16px",
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: "#94a3b8",
    fontSize: "16px",
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: "#1a202c",
    fontSize: "16px",
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: "var(--logo-magenta)",
    color: "white",
    borderRadius: "12px",
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: "white",
  }),
};

export default function LeadSaleModal({
  isOpen,
  onClose,
  customerName,
  customerNumber,
  contactInfo,
  fetchContactInfo,
}: LeadSaleModalProps) {
  const [type, setType] = useState<"sale" | "lead">("lead");

  const [clientName, setClientName] = useState(customerName || "");
  const [clientAddress, setClientAddress] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<{ value: string; label: string } | null>(
    currencies[1]
  );
  const [paymentType, setPaymentType] = useState<"one-time" | "recurring">("one-time");
  const [billingDate, setBillingDate] = useState("");
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessNiche, setBusinessNiche] = useState<{ value: string; label: string } | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState<{ value: string; label: string }[]>([]);

  const [disposition, setDisposition] = useState<{ value: string; label: string } | null>(null);
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [comments, setComments] = useState("");
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [addToContacts, setAddToContacts] = useState(false);
  const [existingInfo, setExistingInfo] = useState<any>(null);

  // ─────────────────────────────────────────────────────────────
  //  Fetch logic (unchanged)
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.post("/voice/leads/phone", { phone: customerNumber });
        setAddToContacts(res.data.isContact || false);
        if (res.data.isContact) {
          setClientAddress(res.data?.contact?.addresses?.[0]?.address || "");
        }
        setExistingInfo(res.data.leads?.[0]);
      } catch (err) {
        console.error("Failed to fetch phone info", err);
      }
    };

    if (isOpen && customerNumber) {
      fetchInfo();
    }
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
    if (isOpen && customerNumber) {
      fetchContactInfo(customerNumber);
    }
  }, [isOpen, customerNumber, fetchContactInfo]);

  useEffect(() => {
    if (contactInfo) {
      setClientName(contactInfo.name || customerName || "");
    }
  }, [contactInfo, customerName]);

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
          business: showBusinessDetails
            ? {
                name: businessName,
                address: businessAddress,
                description: businessDescription,
                niche: businessNiche?.value,
              }
            : undefined,
          tags: tags.map((t) => t.value),
        };
        await api.post("/voice/leads/sale", payload);
        alert("Sale closed successfully! 🎉");
      } else {
        const payload = {
          type: "lead",
          client: {
            name: clientName,
            phone: customerNumber,
            address: clientAddress,
          },
          dispositionId: disposition?.value || null,
          nextFollowupDate: nextFollowupDate || null,
          alternatePhone: alternatePhone || null,
          comments: comments || null,
          tags: tags.map((t) => t.value),
          addToContacts,
        };
        await api.post("/voice/leads/create", payload);
        toast.success("Lead created successfully! ✅");
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`
              fixed inset-y-0 left-0 z-50 flex flex-col
              bg-gray-50 shadow-2xl overflow-hidden
              w-[92%] max-w-[420px]               /* mobile */
              sm:max-w-[480px]
              md:w-[720px] md:max-w-[720px]       /* tablet */
              lg:max-w-[800px]                    /* desktop large */
            `}
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200 bg-white">
                <h2 className="text-xl sm:text-2xl font-bold text-black">
                  {type === "sale" ? "Create Sale" : "Create Lead"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                  aria-label="Close modal"
                >
                  <X className="w-7 h-7 sm:w-8 sm:h-8 text-gray-700" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 bg-gray-50/70">
                <div className="space-y-7 sm:space-y-9 max-w-4xl mx-auto">
                  {/* Type Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-3">
                    <label
                      className={`
                        p-4 rounded-2xl cursor-pointer transition-all border-2 flex items-center gap-4
                        ${
                          type === "lead"
                            ? "border-green-500 bg-green-50/70 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="type"
                        checked={type === "lead"}
                        onChange={() => setType("lead")}
                        className="hidden"
                      />
                      <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h5 className="text-lg sm:text-xl font-bold text-black">Create Lead</h5>
                      </div>
                    </label>

                    <label
                      className={`
                        p-4 rounded-2xl cursor-pointer transition-all border-2 flex items-center gap-4
                        ${
                          type === "sale"
                            ? "border-blue-500 bg-blue-50/70 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="type"
                        checked={type === "sale"}
                        onChange={() => setType("sale")}
                        className="hidden"
                      />
                      <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h5 className="text-lg sm:text-xl font-bold text text-black">Sale</h5>
                      </div>
                    </label>
                  </div>

                  {/* Client Information */}
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200">
                    <h5 className="text-xl sm:text-2xl font-bold mb-5 flex items-center gap-2 text-gray-800 text-black">
                      <User className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
                      Contact Information
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                      <div className="relative">
                        <User className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                        <input
                          className="Ringnex-input w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition"
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder=" "
                        />
                        <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none transition-all">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                      </div>

                      <div className="relative">
                        <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                        <input
                          className="Ringnex-input w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl bg-gray-100 cursor-not-allowed"
                          type="text"
                          value={customerNumber}
                          disabled
                          placeholder=" "
                        />
                        <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                      </div>

                      <div className="relative md:col-span-2">
                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                        <input
                          className="Ringnex-input w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition"
                          type="text"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder=" "
                        />
                        <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                          Address (Optional)
                        </label>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                        <span className="font-medium text-gray-800">Save to Contacts</span>
                        <button
                          type="button"
                          onClick={() => setAddToContacts(!addToContacts)}
                          className={`relative inline-flex h-7 w-14 items-center rounded transition-colors ${
                            addToContacts ? "bg-pink-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded bg-white transition-transform ${
                              addToContacts ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────── */}
                  {/*               SALE or LEAD CONTENT               */}
                  {/* ──────────────────────────────────────────────── */}

                  {type === "sale" ? (
                    <div className="space-y-7 sm:space-y-9">
                      {/* Services */}
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200">
                        <h4 className="text-xl sm:text-2xl font-bold mb-5 flex items-center gap-2 text-black">
                          <CheckSquare className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                          Services Sold
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {servicesList.map((service) => (
                            <label
                              key={service}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition"
                            >
                              <input
                                type="checkbox"
                                checked={selectedServices.includes(service)}
                                onChange={() => toggleService(service)}
                                className="Ringnex-checkbox w-5 h-5 accent-purple-600"
                              />
                              <span className="text-sm sm:text-base text-black" style={{
                                fontSize:14
                              }}>{service}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Business Details Toggle + Fields */}
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer mb-5">
                          <input
                            type="checkbox"
                            checked={showBusinessDetails}
                            onChange={(e) => setShowBusinessDetails(e.target.checked)}
                            className="Ringnex-checkbox w-5 h-5 accent-purple-600"
                          />
                          <span className="text-black">
                            
                            Add Business Details
                          </span>
                        </label>

                        {showBusinessDetails && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            <div className="relative">
                              <Building className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                              <input
                                className="w-full pl-14 pr-4 py-3 Ringnex-input border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder=" "
                              />
                              <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                                Business Name
                              </label>
                            </div>

                            <div className="relative">
                              <Select
                                options={niches}
                                value={businessNiche}
                                onChange={setBusinessNiche}
                                styles={selectStyles}
                                placeholder="Business Niche"
                                menuPosition="fixed"
                              />
                            </div>

                            <div className="relative md:col-span-2">
                              <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                              <input
                                className="w-full pl-14 pr-4 py-3 Ringnex-input border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                                type="text"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                placeholder=" "
                              />
                              <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                                Business Address
                              </label>
                            </div>

                            <div className="relative md:col-span-2">
                              <Briefcase className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                              <textarea
                                rows={4}
                                className="w-full pl-14 pr-4 py-3 Ringnex-input border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 resize-none"
                                value={businessDescription}
                                onChange={(e) => setBusinessDescription(e.target.value)}
                                placeholder=" "
                              />
                              <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                                Business Description
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Details */}
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200">
                        <h4 className="text-xl sm:text-2xl font-bold mb-5 flex items-center gap-2 text-black">
                          <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                          Payment Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-6">
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                            <input
                              className="w-full pl-14 pr-4 py-3 Ringnex-input border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder=" "
                            />
                            <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                              Amount <span className="text-red-500">*</span>
                            </label>
                          </div>

                          <div className="sm:col-span-2">
                            <Select
                              options={currencies}
                              value={currency}
                              onChange={setCurrency}
                              styles={selectStyles}
                              placeholder="Select Currency"
                              menuPosition="fixed"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              checked={paymentType === "one-time"}
                              onChange={() => setPaymentType("one-time")}
                              className="w-5 h-5 accent-green-600"
                            />
                            <span className="text-base sm:text-lg text-black">One-Time Payment</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              checked={paymentType === "recurring"}
                              onChange={() => setPaymentType("recurring")}
                              className="w-5 h-5 accent-green-600"
                            />
                            <span className="text-base sm:text-lg text-black">Recurring</span>
                          </label>
                        </div>

                        {paymentType === "recurring" && (
                          <div className="relative max-w-xs">
                            <DateInput
                              value={billingDate}
                              onChange={(val) => setBillingDate(val)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer mb-5">
                          <input
                            type="checkbox"
                            checked={showTags}
                            onChange={(e) => setShowTags(e.target.checked)}
                            className="Ringnex-checkbox w-5 h-5 accent-purple-600"
                          />
                            <span className="text-black text-lg sm:text-xl font-semibold">Add Tags</span>
                         
                        </label>

                        {showTags && (
                          <CreatableSelect
                            isMulti
                            value={tags}
                            onChange={setTags as any}
                            styles={selectStyles}
                            placeholder="Type tag and press Enter..."
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-6 sm:space-y-8">
                      <div className="mb-3">
                        <h4 className="text-xl sm:text-2xl font-bold mb-4 text-black">
                          Lead Disposition
                        </h4>
                        <Select
                          options={dispositions}
                          value={disposition}
                          onChange={setDisposition}
                          styles={selectStyles}
                          placeholder="Select disposition"
                        />
                      </div>

                      <div  className="mb-3  relative">
                        <DateTimeInput
                          min={minDateTime}
                          value={nextFollowupDate}
                          onChange={(val) => setNextFollowupDate(val)}
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div className="mb-3 relative">
                        <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                        <input
                          className="w-full pl-14 pr-4 py-3 Ringnex-input border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                          type="text"
                          value={alternatePhone}
                          onChange={(e) => setAlternatePhone(e.target.value)}
                          placeholder=" "
                        />
                        <label className="absolute left-12 top-2 text-sm text-gray-500 pointer-events-none">
                          Alternate Phone (Optional)
                        </label>
                      </div>

                      <div className="mb-3">
                        <CreatableSelect
                          isMulti
                          value={tags}
                          onChange={setTags as any}
                          styles={selectStyles}
                          placeholder="Add relevant tags..."
                        />
                      </div>

                      <div className="mb-3 mt-4 relative">
                        <textarea
                          rows={6}
                          className="w-full pl-4 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 resize-none"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder=" "
                        />
                        <label className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-gray-500 pointer-events-none">
                          Comments / Notes
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-5 sticky bottom-0 z-10">
                <div className="flex gap-3 sm:gap-4 max-w-md mx-auto md:max-w-none">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 text-base sm:text-lg font-semibold rounded border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition text-black"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSubmit}
                    className={`
                      flex-1 py-3 text-base sm:text-lg font-bold rounded shadow-lg transition transform active:scale-97 flex items-center justify-center gap-2
                      ${
                        type === "sale"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }
                    `}
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                    {type === "sale" ? "Create Sale" : "Create Lead"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}