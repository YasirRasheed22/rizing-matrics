// pages/admin/billing/SmsSpendReport.tsx
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
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "../../components/shared/DataTable";
import { Link } from "react-router-dom";

interface SmsReportData {
  chartData: Array<{ date: string; sms: number }>;
  tableData: Array<{
    subaccount: string;
    dateBilled: string;
    to: string;
    from: string;
    sid: string;
  }>;
}

const categoryColors = {
  sms: "#0000FF",
};

export default function SmsSpendReport() {
  const { token, user } = useAuth();
  const [reportData, setReportData] = useState<SmsReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSmsReport = async () => {
    try {
      const res = await api.get("/voice/admin/billing/sms-spend-details", {
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
      fetchSmsReport();
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
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

  if (!reportData) return null;

  const { chartData, tableData } = reportData;

  // Define columns for DataTable
  const columns: ColumnDef<SmsReportData["tableData"][0]>[] = [
    {
      accessorKey: "subaccount",
      header: "Subaccount",
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("subaccount")}</div>
      ),
    },
    {
      accessorKey: "dateBilled",
      header: "Date Billed",
      cell: ({ row }) => {
        const date = new Date(row.getValue("dateBilled") as string);
        return (
          <div>
            {date.toLocaleDateString()} <br />
            <span className="text-xs text-gray-500">
              {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "to",
      header: "To",
      cell: ({ row }) => <div className="font-medium">{row.getValue("to")}</div>,
    },
    {
      accessorKey: "from",
      header: "From",
      cell: ({ row }) => <div className="font-medium">{row.getValue("from")}</div>,
    },
    {
      accessorKey: "sid",
      header: "Message SID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-blue-600 hover:underline cursor-pointer">
          {row.getValue("sid")}
        </div>
      ),
    },
  ];

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

          <h4 className="text-2xl font-bold text-black">Programmable SMS spend</h4>
        </div>
      </div>
          
          {/* <p className="text-sm text-gray-600">Times shown in Coordinated Universal Time (UTC)</p> */}
        </div>
       

        {/* Filters */}
        <div className="flex items-center gap-6 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date range</label>
            <div className="bg-white border rounded px-4 py-2 flex items-center w-56 shadow-sm">
              <span className="text-gray-700">Is in last 30 days</span>
              <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Include subaccounts</label>
            <div className="bg-white border rounded px-4 py-2 flex items-center w-32 shadow-sm">
              <span className="text-gray-700">Yes</span>
              <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 rounded-2xl shadow-lg mb-8">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(4)}`}
                labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sms"
                stroke={categoryColors.sms}
                strokeWidth={3}
                dot={{ fill: categoryColors.sms, r: 5 }}
                activeDot={{ r: 7 }}
                name="SMS Spend"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Message Logs Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-black">Message Logs</h4>
          </div>
          <DataTable
            columns={columns}
            data={tableData}
            loading={loading}
            searchPlaceholder="Search by phone number, SID, or subaccount..."
          />
        </div>
      </div>
    </div>
  );
}