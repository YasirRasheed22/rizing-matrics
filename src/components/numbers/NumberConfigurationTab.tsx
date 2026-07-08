// src/components/numbers/NumberConfigurationTab.tsx
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, MessageSquare, Phone, Save, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import Select from "react-select";


function UrlRow({ urlKey, methodKey, label, config, onChange, isDark }: any) {
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px 10px 34px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)"}`,
    background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
    fontSize: 13.5, color: isDark ? "#F0F0F5" : "#0D0D12",
    outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
  };
  const selectStyle: React.CSSProperties = {
    padding: "10px 13px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)"}`,
    background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
    fontSize: 13.5, color: isDark ? "#F0F0F5" : "#0D0D12",
    outline: "none", fontFamily: "inherit", cursor: "pointer",
    transition: "border-color 0.15s", width: "100%",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase",
  };
  const focusBorder = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)";
  const blurBorder  = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ position: "relative" }}>
          <Globe size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: isDark ? "#68687A" : "#9E9EAD", pointerEvents: "none" }} />
          <input type="url" name={urlKey} value={config[urlKey]} onChange={onChange} placeholder="https://…"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = focusBorder)}
            onBlur={(e)  => (e.target.style.borderColor = blurBorder)}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Method</label>
        <select name={methodKey} value={config[methodKey]} onChange={onChange} style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = focusBorder)}
          onBlur={(e)  => (e.target.style.borderColor = blurBorder)}>
          <option value="POST">POST</option>
          <option value="GET">GET</option>
        </select>
      </div>
    </div>
  );
}



function MessagingServiceSelector({ config, onChange, isDark, messagingServices }: any) {
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";

  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
      border: `1px solid ${
        state.isFocused
          ? isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)"
          : isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)"
      }`,
      borderRadius: 10,
      boxShadow: "none",
      minHeight: 42,
      fontSize: 13.5,
      cursor: "pointer",
      transition: "border-color 0.15s",
      "&:hover": {
        borderColor: isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)",
      },
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: "2px 13px",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: isDark ? "#F0F0F5" : "#0D0D12",
      fontSize: 13.5,
    }),
    placeholder: (base: any) => ({
      ...base,
      color: isDark ? "#68687A" : "#9E9EAD",
      fontSize: 13.5,
    }),
    menu: (base: any) => ({
      ...base,
      background: isDark ? "#1E1E2A" : "#FFFFFF",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)"}`,
      borderRadius: 10,
      boxShadow: isDark
        ? "0 8px 32px rgba(0,0,0,0.45)"
        : "0 8px 24px rgba(0,0,0,0.10)",
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuList: (base: any) => ({
      ...base,
      padding: 6,
    }),
    option: (base: any, state: any) => ({
      ...base,
      background: state.isSelected
        ? accentMain
        : state.isFocused
        ? isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)"
        : "transparent",
      color: state.isSelected
        ? "#FFFFFF"
        : isDark ? "#F0F0F5" : "#0D0D12",
      borderRadius: 7,
      fontSize: 13.5,
      padding: "9px 12px",
      cursor: "pointer",
      transition: "background 0.1s",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base: any) => ({
      ...base,
      color: isDark ? "#68687A" : "#9E9EAD",
      paddingRight: 10,
      "&:hover": { color: accentMain },
    }),
    clearIndicator: (base: any) => ({
      ...base,
      color: isDark ? "#68687A" : "#9E9EAD",
      "&:hover": { color: isDark ? "#F0F0F5" : "#0D0D12" },
    }),
    input: (base: any) => ({
      ...base,
      color: isDark ? "#F0F0F5" : "#0D0D12",
    }),
    noOptionsMessage: (base: any) => ({
      ...base,
      color: isDark ? "#68687A" : "#9E9EAD",
      fontSize: 13.5,
    }),
  };

  const options = [
    { value: "", label: "No Messaging Service" },
    ...messagingServices.map((s: any) => ({
      value: s.sid,
      label: s.friendlyName || s.sid,
    })),
  ];

  const selected = options.find((o) => o.value === config.messagingServiceSid) ?? options[0];

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase",
  };

  return (
    <div>
      <label style={labelStyle}>Messaging Service</label>
      <Select
        options={options}
        value={selected}
        onChange={(opt: any) =>
          onChange({ target: { name: "messagingServiceSid", value: opt?.value ?? "" } })
        }
        styles={customStyles}
        placeholder="Select a messaging service…"
        isClearable={false}
        isSearchable={true}
        menuPlacement="auto"
      />
    </div>
  );
}

const DEFAULT_CONFIG = {
  voiceUrl: "", voiceMethod: "POST", voiceFallbackUrl: "", voiceFallbackMethod: "POST",
  statusCallback: "", statusCallbackMethod: "POST",
  smsUrl: "", smsMethod: "POST", smsFallbackUrl: "", smsFallbackMethod: "POST",
  messagingServiceSid: "",
};

export default function NumberConfigurationTab({ numberId, isDark: isDarkProp }: { numberId: string; isDark?: boolean }) {
  const { theme } = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary= isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted    = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"  : "#5B5BD6";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)";
  const dividerColor = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.07)";
  const resetBtnBg   = isDark ? "rgba(255,255,255,0.06)"  : "#F6F7F9";
  const resetBtnBord = isDark ? "rgba(255,255,255,0.09)"  : "rgba(0,0,0,0.10)";

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 800, color: textMuted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 16, display: "flex", alignItems: "center", gap: 7,
  };

  const [config, setConfig]     = useState(DEFAULT_CONFIG);
  const [original, setOriginal] = useState(DEFAULT_CONFIG);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [messagingServices, setMessagingServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, servicesRes] = await Promise.all([
          api.get(`/voice/numbers-list/${numberId}`),

          api.get(`/voice/numbers/messaging-services`),
        ]);
        const d = configRes.data.data?.configuration ?? {};
        const loaded = {
          voiceUrl:              d.voiceUrl              ?? "",
          voiceMethod:           d.voiceMethod           ?? "POST",
          voiceFallbackUrl:      d.voiceFallbackUrl      ?? "",
          voiceFallbackMethod:   d.voiceFallbackMethod   ?? "POST",
          statusCallback:        d.statusCallback        ?? "",
          statusCallbackMethod:  d.statusCallbackMethod  ?? "POST",
          smsUrl:                d.smsUrl                ?? "",
          smsMethod:             d.smsMethod             ?? "POST",
          smsFallbackUrl:        d.smsFallbackUrl        ?? "",
          smsFallbackMethod:     d.smsFallbackMethod     ?? "POST",
          messagingServiceSid:   d.messagingServiceSid   ?? "",
        };
        setConfig(loaded);
        setOriginal(loaded);
        setMessagingServices(servicesRes.data.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [numberId]);

  const handleChange = (e: any) => setConfig((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleReset  = () => setConfig(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/voice/numbers/${numberId}/config`, config);
      setOriginal(config);
      toast.success("Configuration saved");
    } catch { toast.error("Failed to save configuration"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Voice section */}
      <div>
        <div style={sectionTitle}><Phone size={12} /> Voice (Incoming Calls)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <UrlRow urlKey="voiceUrl"         methodKey="voiceMethod"         label="Voice URL"           config={config} onChange={handleChange} isDark={isDark} />
          <UrlRow urlKey="voiceFallbackUrl" methodKey="voiceFallbackMethod" label="Fallback Voice URL"  config={config} onChange={handleChange} isDark={isDark} />
          <UrlRow urlKey="statusCallback"   methodKey="statusCallbackMethod"label="Status Callback URL" config={config} onChange={handleChange} isDark={isDark} />
        </div>
      </div>

      <div style={{ height: 1, background: dividerColor }} />

      {/* SMS section */}
      <div>
        <div style={sectionTitle}><MessageSquare size={12} /> Messaging (SMS)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MessagingServiceSelector config={config} onChange={handleChange} isDark={isDark} messagingServices={messagingServices} />
          <UrlRow urlKey="smsUrl"          methodKey="smsMethod"          label="SMS URL"          config={config} onChange={handleChange} isDark={isDark} />
          <UrlRow urlKey="smsFallbackUrl"  methodKey="smsFallbackMethod"  label="Fallback SMS URL" config={config} onChange={handleChange} isDark={isDark} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          type="button" onClick={handleReset} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: `1px solid ${resetBtnBord}`, background: resetBtnBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <RefreshCw size={13} /> Reset
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          type="button" onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? (isDark ? "#2A2A3A" : "#BBBBC8") : accentMain, color: saving ? (isDark ? "#68687A" : "#fff") : "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.28)") }}>
          <Save size={13} /> {saving ? "Saving…" : "Save Configuration"}
        </motion.button>
      </div>
    </div>
  );
}