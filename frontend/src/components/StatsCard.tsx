import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  changeLabel?: string;
  icon?: ReactNode;
}

export default function StatsCard({ title, value, changeLabel, icon }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">{value}</p>
          {changeLabel ? <p className="mt-1 text-xs text-slate-400">{changeLabel}</p> : null}
        </div>
        {icon ? <div className="text-brand-500">{icon}</div> : null}
      </div>
    </div>
  );
}
