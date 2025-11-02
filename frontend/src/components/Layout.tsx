import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assets', label: 'Assets' },
  { to: '/people', label: 'People' },
];

function NavigationLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-500 text-white shadow' : 'text-slate-300 hover:bg-slate-700/50',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-900 p-6 text-white md:flex">
          <div className="mb-8 text-xl font-semibold">IT Inventory</div>
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <NavigationLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
          <div className="mt-auto text-xs text-slate-400">
            Inventory automation dashboard
          </div>
        </aside>
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="md:hidden">
              <select
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                onChange={(event) => {
                  window.location.href = event.target.value;
                }}
                value={window.location.pathname}
              >
                {navItems.map((item) => (
                  <option key={item.to} value={item.to}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <h1 className="text-lg font-semibold text-slate-700">IT Inventory System</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="hidden sm:inline">Welcome back!</span>
            </div>
          </header>
          <section className="p-4 md:p-6">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
