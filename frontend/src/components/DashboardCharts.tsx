import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DashboardSummary } from '../api/types';

interface DashboardChartsProps {
  summary: DashboardSummary;
}

function buildTypeData(summary: DashboardSummary) {
  return Object.entries(summary.assets_by_type).map(([type, count]) => ({
    name: type,
    value: count,
  }));
}

function buildDepartmentData(summary: DashboardSummary) {
  return Object.entries(summary.assets_by_department).map(([name, count]) => ({
    name,
    value: count,
  }));
}

const COLORS = ['#2563eb', '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#facc15'];

export default function DashboardCharts({ summary }: DashboardChartsProps) {
  const typeData = buildTypeData(summary);
  const departmentData = buildDepartmentData(summary);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Asset breakdown by type</h3>
        {typeData.length ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} assets`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No data yet.</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Asset distribution by department</h3>
        {departmentData.length ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickMargin={8} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: number) => `${value} assets`} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Assign locations to see distribution.</p>
        )}
      </div>
    </div>
  );
}
