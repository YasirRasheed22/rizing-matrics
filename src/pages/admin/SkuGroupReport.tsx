// pages/admin/billing/SkuGroupReport.tsx
// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, ChevronDown, Filter } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

interface SkuReportData {
  chartData: Array<{ date: string; [key: string]: number | string }>;
  categories: string[];
  tableData: Array<{
    dateBilled: string;
    billableItem: string;
    quantity: number;
    amount: number;
  }>;
}

const categoryColors: Record<string, string> = {
  "Voice Insights": "#1E90FF",
  "Call Recording Storage": "#A9A9A9",
  "SMS Carrier Fees": "#228B22",
  "Voice Minutes": "#000000",
  "Phone Number Setup": "#808080",
  "Text To Speech - Amazon Polly": "#0000FF",
  "Phone Numbers": "#FF0000",
  "Basic Calls": "#008000",
  "Call Transcriptions": "#006400",
  "MMS": "#0000FF",
  "Client Calls": "#FF0000",
  // Add more as needed
};

export default function SkuGroupReport() {
  const { token, user } = useAuth();
  const [reportData, setReportData] = useState<SkuReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkuReport = async () => {
    try {
      const res = await api.get("/voice/admin/billing/sku-group-details", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === "ADMIN") {
      fetchSkuReport();
    }
  }, [token, user]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { chartData, categories, tableData } = reportData;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
        <div className="ringnex-page-header flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/settings/billing"
            className="ringnex-btn-secondary rounded-2xl px-4 py-2 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>

          <h4 className="text-2xl font-bold text-black">Spend by top-level SKU group</h4>
        </div>
      </div>
          
          {/* <p className="text-sm text-gray-600">Times shown in Coordinated Universal Time (UTC)</p> */}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date range</label>
            <div className="bg-white border rounded px-3 py-2 flex items-center w-48">
              <span className="text-black">Is in last 30 days</span>
              <ChevronDown className="ml-auto w-4 h-4" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Include subaccounts</label>
            <div className="bg-white border rounded px-3 py-2 flex items-center w-32">
              <span className="text-black">Yes</span>
              <ChevronDown className="ml-auto w-4 h-4" />
            </div>
          </div>
        </div>

        {/* <div className="text-blue-600 text-sm mb-4 flex items-center gap-1">
          <Filter className="w-4 h-4" />
          Add filters
        </div>

        {/* Info Banner 
        <div className="bg-blue-50 p-4 rounded mb-6 flex items-center gap-2">
          <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">i</div>
          <p className="text-sm text-blue-800">Try our advanced insights with custom filters! Our Editions packages empower you to gain more value from your insights.</p>
        </div> */}

        {/* Chart */}
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {categories.map((cat) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={categoryColors[cat] || "#8884d8"}
                  name={cat}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto p-3 mt-3">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Billed</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Item</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.dateBilled}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.billableItem}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">${item.amount.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}