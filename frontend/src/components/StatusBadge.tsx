import type { AssetStatus } from '../api/types';

const statusStyles: Record<AssetStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 ring-emerald-500/20',
  spare: 'bg-sky-100 text-sky-700 ring-sky-500/20',
  repair: 'bg-amber-100 text-amber-700 ring-amber-500/20',
  retired: 'bg-slate-200 text-slate-700 ring-slate-500/10',
};

export default function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
