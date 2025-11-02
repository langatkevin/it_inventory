import type { Asset } from '../api/types';
import StatusBadge from './StatusBadge';

interface AssetTableProps {
  assets: Asset[];
  onSelect(asset: Asset): void;
}

function getActiveAssignment(asset: Asset) {
  return asset.assignments.find((assignment) => !assignment.end_date);
}

export default function AssetTable({ assets, onSelect }: AssetTableProps) {
  if (!assets.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No assets match your filters yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {['Asset Tag', 'Model', 'Assigned To', 'Status', 'Location', ''].map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assets.map((asset) => {
            const activeAssignment = getActiveAssignment(asset);
            return (
              <tr key={asset.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{asset.asset_tag ?? '—'}</div>
                  <div className="text-xs text-slate-400">{asset.serial_number ?? 'N/A'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <div>{asset.asset_model.manufacturer ?? 'Unknown'} {asset.asset_model.model_number}</div>
                  {asset.description ? (
                    <div className="text-xs text-slate-400">{asset.description}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {activeAssignment ? (
                    <div>
                      <div className="font-medium text-slate-700">{activeAssignment.person.full_name}</div>
                      {activeAssignment.person.department_id ? (
                        <div className="text-xs text-slate-400">Dept: {activeAssignment.person.department_id}</div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={asset.status} />
                  <div className="text-xs text-slate-400">{asset.operation_state}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {asset.location ? asset.location.name : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="inline-flex items-center rounded-lg border border-brand-500 px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-500 hover:text-white"
                    onClick={() => onSelect(asset)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
