export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-500">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
      {message}
    </div>
  );
}
