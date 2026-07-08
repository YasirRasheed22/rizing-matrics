//@ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  User,
  Phone,
  DollarSign,
  Filter,
  ChevronDown,
  TrendingUp,
  ClipboardList,
  BadgeCheck,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Link, useNavigate } from "react-router-dom";
import LeadSaleSidebar from "../../components/leads/LeadSaleSidebar";
import api from "../../api";
import { DateInput } from "../../components/ui/AppDatePicker";
import { useAuth } from "../../context/AuthContext";


function formatDateNice(dateString) {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
    .replace(/,/, '')           // remove comma after day
    .replace(/(\d{2}) (\w+) (\d{4}) at /, '$1 $2 $3 '); // cleaner spacing
}
/* ---------------- DUMMY DATA ---------------- */



/* ---------------- PAGE ---------------- */

export default function LeadDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"leads" | "sales">("leads");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  type DateFilter = "all" | "today" | "week" | "month" | "custom";

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState<"lead" | "sale" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // start with true on mount
  const [isFetching, setIsFetching] = useState(false); // for subsequent fetches

  const [stats, setStats] = useState({
    totalCalls: 0,
    totalLeads: 0,
    totalSales: 0,
    totalFollowups:0,
    totalHotClients:0,
    revenue: 0,
  });

  const [totalPages, setTotalPages] = useState(1);
  const data = activeTab === "leads" ? leads : sales;
  useEffect(() => {
    setPage(1);
  }, [activeTab, limit, dateFilter]);
  //   const totalPages = Math.ceil(data.length / limit);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("dateFilter", dateFilter);

      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }

      const endpoint =
        activeTab === "leads" ? "/voice/leads" : "/voice/sales";

      const res = await api.get(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (activeTab === "leads") {
        setLeads(res.data.data);
      } else {
        setSales(res.data.data);
      }

      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setIsFetching(false);
      setIsLoading(false); // onl
    }
  };
  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token, activeTab, page, limit, dateFilter, customStart, customEnd]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, limit]);
  const fetchStats = async () => {
    const params = new URLSearchParams();
    params.append("dateFilter", dateFilter);

    if (dateFilter === "custom" && customStart && customEnd) {
      params.append("startDate", customStart);
      params.append("endDate", customEnd);
    }

    const res = await api.get(`/voice/leads/stats?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setStats(res.data.stats);
  };
  useEffect(() => {
    if (!token) return;
  
    
  
    fetchStats();
  }, [token, dateFilter, customStart, customEnd]);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
  }, [data, page, limit]);

  /* ---------------- STATS ---------------- */

  const statItems = [
    {
      icon: ClipboardList,
      label: "Total Leads",
      value: stats.totalLeads,
      color: "from-blue-500 to-blue-600",
      iconColor: "text-blue-500",
    },
    {
      icon: ClipboardList,
      label: "Follow Ups",
      value: stats?.totalFollowups || 0,
      color: "from-green-500 to-green-600",
      iconColor: "text-blue-500",
    },
    {
      icon: ClipboardList,
      label: "Hot Clients",
      value: stats?.totalHotClients || 0,
      color: "from-orange-500 to-orange-600",
      iconColor: "text-blue-500",
    },
    
    {
      icon: Phone,
      label: "Total Calls",
      value: stats.totalCalls,
      color: "from-amber-500 to-amber-600",
      iconColor: "text-amber-500",
    },
  ];

  // When clicking on a row
  const handleRowClick = (item, type) => {
  
    setSelectedItem(item);
    setItemType(type);
    setSidebarOpen(true);
  };
  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-4 px-3">
        <div>
          <h1 className="text-xl font-bold text-black">Leads</h1>
        
         
        </div>

        
          {/* Date Filter */}
        <div className="relative flex gap-4">
        <div style={{textAlign:'right'}}>
        <Link style={{
          textDecoration:'none'
        }} to={'/leads/add-lead'} className="px-3 py-2 ringnex-btn-primary rounded">Add New </Link>
        </div>
        
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-3 px-2 rounded py-2 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 font-medium"
          >
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-black">
              {dateFilter === "all" && "All Time"}
              {dateFilter === "today" && "Today"}
              {dateFilter === "week" && "This Week"}
              {dateFilter === "month" && "This Month"}
              {dateFilter === "custom" && customStart && customEnd
                ? `${customStart} → ${customEnd}`
                : dateFilter === "custom" && "Custom Range"}
            </span>
            <ChevronDown className="w-4 h-4" />
          </motion.button>

          <AnimatePresence>
            {showDatePicker && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full mt-3 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              >
                <div className="p-2">
                  {(["all", "today", "week", "month"] as DateFilter[]).map(
                    (f) => (
                      <motion.button
                        key={f}
                        whileHover={{ x: 4 }}
                        onClick={() => {
                          setDateFilter(f);
                          setShowDatePicker(false);
                          setCustomStart("");
                          setCustomEnd("");
                        }}
                        className={`w-full text-left px-2 py-2 rounded-xl transition-colors ${
                          dateFilter === f
                            ? "bg-orange-50 text-orange-700 font-semibold"
                            : "text-black hover:bg-gray-50"
                        }`}
                      >
                        {f === "all" && "All Time"}
                        {f === "today" && "Today"}
                        {f === "week" && "This Week"}
                        {f === "month" && "This Month"}
                      </motion.button>
                    )
                  )}

                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => setDateFilter("custom")}
                    className={`w-full text-left px-2 py-2 rounded-xl mt-1 transition-colors ${
                      dateFilter === "custom"
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-black hover:bg-gray-50"
                    }`}
                  >
                    Custom Range
                  </motion.button>

                  <AnimatePresence>
                    {dateFilter === "custom" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden px-2 py-4"
                      >
                      <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Date
                            </label>
                            <DateInput value={customStart} onChange={(val) => setCustomStart(val)} style={{ width: "100%" }} />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              End Date
                            </label>
                            <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} style={{ width: "100%" }} />
                          </div>

                          <button
                            onClick={() => {
                              if (customStart && customEnd)
                                setShowDatePicker(false);
                            }}
                            disabled={!customStart || !customEnd}
                            className="rounded mt-3 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-2 rounded font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                          >
                            Apply Range
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4 px-3">
        {statItems?.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 group"
          >
            <div className={`h-2 bg-gradient-to-r ${item.color}`} />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${item.color} bg-opacity-10`}
                >
                  <item.icon className={`w-7 h-7 text-white`} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
       
      </div>
      

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {paginatedData.length === 0 ? (
             <div className=" rounded-2xl p-12 text-center  border-gray-100 mt-5">
             <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
             <h3 className="text-xl font-semibold text-gray-700">
               No leads record found
             </h3>
           </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200 mx-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
               
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disposition
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Follow-up
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                 
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading || isFetching ? (
                <tr>
                  <td colSpan={activeTab === "leads" ? 5 : 5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="ringnex-spinner mb-4" />
                      <p className="text-gray-500">Loading {activeTab}...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "leads" ? 5 : 5} className="px-6 py-16 text-center">
                    <div className="text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-lg font-medium">No {activeTab} found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    
                    // onClick={() => navigate('lead/single/'+item.id)}
                    
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.clientName}
                      </div>
                      {item.businessName && (
                        <div className="text-xs text-gray-500">
                          {item.businessName}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.clientPhone}
                    </td>

                    {activeTab === "leads" ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            
                            {item.disposition}
                           
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.nextFollowupDate
                            ? formatDateNice(item.nextFollowupDate)
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateNice(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="btn btn-primary text-white" onClick={() => handleRowClick(item, activeTab)}> <Pencil className="w-5 h-5" /></button>
                          &nbsp;
                          <button style={{marginLeft:10}} className="btn bg-orange text-white"  onClick={() => navigate(`/lead/single/${item.id}`)}><Eye className="w-5 h-5"/></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.services?.join(", ") || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-emerald-600">
                            {item.amount} {item.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateNice(item.createdAt)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-3 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="ringnex-input border border-gray-300 rounded-md px-1 py-1 text-sm focus:ring-orange-500 focus:border-orange-500"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-100 transition"
              >
                Previous
              </button>

              <span className="text-sm text-gray-700">
                Page <span className="font-bold">{page}</span> of{" "}
                <span className="font-bold">{totalPages}</span>
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

            </>
          )}
        </motion.div>
      </AnimatePresence>
      <LeadSaleSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        item={selectedItem}
        itemType={itemType}
        onSaveSuccess={() => {
           fetchData();
           fetchStats()
        }}
        />
    </div>
  );
}
