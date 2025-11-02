import { useQuery } from '@tanstack/react-query';

import { inventoryApi } from '../api/client';
import { ErrorState, LoadingState } from '../components/Feedback';
import StatsCard from '../components/StatsCard';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => inventoryApi.getDashboardSummary(),
  });

  if (isLoading) {
    return <LoadingState label="Loading dashboard" />;
  }

  if (isError || !data) {
    return <ErrorState message="Failed to load dashboard summary." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total assets" value={data.total_assets} />
        <StatsCard title="Active" value={data.active_assets} />
        <StatsCard title="In spare" value={data.spare_assets} />
        <StatsCard title="Repair / Retired" value={`${data.repair_assets} / ${data.retired_assets}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Asset breakdown by type</h3>
          <ul className="mt-4 space-y-3">
            {Object.entries(data.assets_by_type).map(([type, count]) => (
              <li key={type} className="flex items-center justify-between text-sm text-slate-600">
                <span>{type}</span>
                <span className="font-semibold text-slate-800">{count}</span>
              </li>
            ))}
            {!Object.keys(data.assets_by_type).length ? (
              <li className="text-sm text-slate-400">No data yet.</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600">Asset distribution by department</h3>
          <ul className="mt-4 space-y-3">
            {Object.entries(data.assets_by_department).map(([dept, count]) => (
              <li key={dept} className="flex items-center justify-between text-sm text-slate-600">
                <span>{dept}</span>
                <span className="font-semibold text-slate-800">{count}</span>
              </li>
            ))}
            {!Object.keys(data.assets_by_department).length ? (
              <li className="text-sm text-slate-400">Assign locations to see distribution.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
