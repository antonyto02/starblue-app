'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  Calendar,
  LayoutDashboard,
  LogOut,
  LayoutTemplate,
  ClipboardList,
  Users,
  Route,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import api from '@/lib/api';

const navGroups = [
  {
    label: 'General',
    items: [
      { href: '/admin',               label: 'Dashboard',     icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/admin/destinos',      label: 'Destinos',      icon: Plane },
      { href: '/admin/rutas',         label: 'Rutas',         icon: Route },
      { href: '/admin/salidas',       label: 'Salidas',       icon: Calendar },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/admin/reservaciones', label: 'Reservaciones', icon: ClipboardList },
      { href: '/admin/empleados',     label: 'Empleados',     icon: Users },
    ],
  },
  {
    label: 'Sitio web',
    items: [
      { href: '/admin/inicio',        label: 'Personalizar sitio', icon: LayoutTemplate },
      { href: '/',                    label: 'Ver sitio web',      icon: ExternalLink, exact: true },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<any>(null);
  const [pendientes, setPendientes] = useState(0);
  const [dark, setDark]             = useState(false);

  // Restore saved theme
  useEffect(() => {
    setDark(localStorage.getItem('admin-theme') === 'dark');
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('admin-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'ADMIN') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchPendientes = () =>
      api.get('/reservaciones/pendientes/count')
        .then(r => setPendientes(r.data.count))
        .catch(() => {});
    fetchPendientes();
    const t = setInterval(fetchPendientes, 60_000);
    return () => clearInterval(t);
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (!user) return null;

  const initial = user.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className={`h-screen overflow-hidden flex transition-colors${dark ? ' admin-dark' : ''}`}
      style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 w-64 flex flex-col z-20"
        style={{ background: 'var(--admin-sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5">
          <img src="/logo.png" alt="Starblue" className="h-5 w-auto" />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p
                className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--admin-text-tertiary)' }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active   = isActive(item);
                  const esReserv = item.href === '/admin/reservaciones';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all relative"
                      style={{
                        background:  active ? 'var(--admin-sidebar-active)' : 'transparent',
                        color:       active ? 'var(--admin-text-primary)'   : 'var(--admin-sidebar-text)',
                        boxShadow:   active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--admin-sidebar-hover)';
                        if (!active) (e.currentTarget as HTMLElement).style.color      = 'var(--admin-text-primary)';
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        if (!active) (e.currentTarget as HTMLElement).style.color      = 'var(--admin-sidebar-text)';
                      }}
                    >
                      <item.icon
                        size={14}
                        style={{ color: active ? 'var(--admin-text-primary)' : 'var(--admin-text-tertiary)', flexShrink: 0 }}
                      />
                      <span className="flex-1">{item.label}</span>

                      {esReserv && pendientes > 0 && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: '#fee2e2', color: '#dc2626' }}
                        >
                          {pendientes}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 ml-64 h-full overflow-hidden flex flex-col">
        {/* Topbar */}
        <div className="flex-shrink-0 h-14 flex items-center justify-end px-8 gap-1" style={{ borderBottom: '1px solid var(--admin-border-light)' }}>
          {/* Modo oscuro */}
          <button
            onClick={toggleDark}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--admin-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="w-px h-5 mx-2" style={{ background: 'var(--admin-border-light)' }} />

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--admin-text-primary)' }}>{user.name}</p>
              <p className="text-[10.5px] leading-tight" style={{ color: 'var(--admin-text-tertiary)' }}>Administrador</p>
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {initial}
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--admin-text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#dc2626'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
