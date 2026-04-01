'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ClipboardList, Plus, LogOut, Globe } from 'lucide-react';

const navItems = [
  { href: '/empleado',                   label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/empleado/reservaciones',     label: 'Mis reservas',    icon: ClipboardList },
  { href: '/empleado/reservaciones/nueva', label: 'Nueva reserva', icon: Plus },
];

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'COMISIONISTA' && u.role !== 'ADMIN') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#0f1b2d] text-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <img src="/logo.png" alt="Starblue" style={{ width: 100, height: 'auto' }} />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Ver sitio web"
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg"
            >
              <Globe size={13} />
              Sitio web
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-white/40 text-xs mt-0.5">Comisionista</p>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="text-white/40 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
