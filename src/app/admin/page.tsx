'use client';

import { useEffect, useState } from 'react';
import {
  Plane, Calendar, ClipboardList, Users, ArrowUpRight,
  TrendingUp, DollarSign, CheckCircle2, Clock,
  ChevronRight, Check, Save,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { invalidateConfig } from '@/lib/useConfig';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Reservacion {
  id: string;
  nombreCompleto: string;
  adultos: number;
  menores9: number;
  menores3: number;
  precioUnitario: number | null;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  createdAt: string;
  paradaOrigen: { destino: { nombre: string } } | null;
  paradaDestino: { destino: { nombre: string } } | null;
  salida: { id: string; fechaSalida: string; ruta: { nombre: string } };
}

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  estado: string;
  ruta: { nombre: string; paradas: { orden: number; destino?: { nombre: string } }[] };
}

interface EmpStat {
  empleadoId: string;
  nombre: string;
  email: string;
  totalReservas: number;
  reservasConfirmadas: number;
  reservasPendientes: number;
  pasajerosConfirmados: number;
  montoTotal: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const formatFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

const diffDias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

const ESTADO_DOT: Record<string, string> = {
  PENDIENTE:  'bg-amber-400',
  CONFIRMADA: 'bg-green-500',
  CANCELADA:  'bg-gray-300',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA:  'Cancelada',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [salidas, setSalidas]             = useState<Salida[]>([]);
  const [empStats, setEmpStats]           = useState<EmpStat[]>([]);
  const [totalDestinos, setTotalDestinos] = useState(0);
  const [totalEmpleados, setTotalEmpleados] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [user, setUser]                   = useState<any>(null);
  const [tipoCambio, setTipoCambio]       = useState('');
  const [savingTC, setSavingTC]           = useState(false);
  const [savedTC, setSavedTC]             = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    Promise.allSettled([
      api.get('/reservaciones'),
      api.get('/salidas'),
      api.get('/reservaciones/empleados/stats'),
      api.get('/destinos/admin/todos'),
      api.get('/users/empleados'),
      api.get('/config'),
    ]).then(([res, sal, emp, dest, emps, cfg]) => {
      if (res.status  === 'fulfilled') setReservaciones(res.value.data);
      if (sal.status  === 'fulfilled') setSalidas(sal.value.data);
      if (emp.status  === 'fulfilled') setEmpStats(emp.value.data);
      if (dest.status === 'fulfilled') setTotalDestinos(dest.value.data.length);
      if (emps.status === 'fulfilled') setTotalEmpleados(emps.value.data.length);
      if (cfg.status  === 'fulfilled') setTipoCambio(cfg.value.data.tipo_cambio ?? '20');
      setLoading(false);
    });
  }, []);

  const saveTipoCambio = async () => {
    if (!tipoCambio || isNaN(parseFloat(tipoCambio))) return;
    setSavingTC(true);
    await api.put('/config', { tipo_cambio: tipoCambio });
    invalidateConfig();
    setSavingTC(false);
    setSavedTC(true);
    setTimeout(() => setSavedTC(false), 2500);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  // KPIs derivados
  const confirmadas  = reservaciones.filter(r => r.estado === 'CONFIRMADA');
  const pendientes   = reservaciones.filter(r => r.estado === 'PENDIENTE');
  const totalPax     = confirmadas.reduce((s, r) => s + r.adultos + r.menores9 + r.menores3, 0);
  const ingresos     = confirmadas.reduce((s, r) => {
    const pax = r.adultos + r.menores9 + r.menores3;
    return s + (r.precioUnitario ? Number(r.precioUnitario) * pax : 0);
  }, 0);
  const salidasAbiertas  = salidas.filter(s => s.estado === 'ABIERTA');
  const proximasSalidas  = [...salidasAbiertas].sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida)).slice(0, 4);
  const recientes        = [...reservaciones].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  // ── KPI config ──────────────────────────────────────────────────────────────

  const KPIS = [
    {
      value: `$${ingresos.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      label: 'Ingresos confirmados',
      sub: 'USD acumulados',
      icon: DollarSign,
      href: '/admin/reservaciones',
      accent: false,
    },
    {
      value: confirmadas.length,
      label: 'Reservas confirmadas',
      sub: `${totalPax} pasajeros en total`,
      icon: CheckCircle2,
      href: '/admin/reservaciones',
      accent: false,
    },
    {
      value: pendientes.length,
      label: 'Reservas pendientes',
      sub: 'requieren atención',
      icon: Clock,
      href: '/admin/reservaciones',
      accent: pendientes.length > 0,
    },
    {
      value: salidasAbiertas.length,
      label: 'Salidas abiertas',
      sub: `de ${salidas.length} programadas`,
      icon: Calendar,
      href: '/admin/salidas',
      accent: false,
    },
    {
      value: totalDestinos,
      label: 'Destinos',
      sub: 'registrados',
      icon: Plane,
      href: '/admin/destinos',
      accent: false,
    },
    {
      value: totalEmpleados,
      label: 'Empleados',
      sub: 'activos',
      icon: Users,
      href: '/admin/empleados',
      accent: false,
    },
  ];

  const QUICK_ACTIONS = [
    { label: 'Nuevo destino',   href: '/admin/destinos/nuevo' },
    { label: 'Nueva salida',    href: '/admin/salidas/nueva'  },
    { label: 'Reservaciones',   href: '/admin/reservaciones'  },
    { label: 'Editar inicio',   href: '/admin/inicio'         },
  ];

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-8 pt-10 pb-10 space-y-8">
        <div className="h-12 w-56 rounded-xl animate-pulse" style={{ background: 'var(--admin-surface)' }} />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--admin-surface)' }} />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 h-80 rounded-2xl animate-pulse" style={{ background: 'var(--admin-surface)' }} />
          <div className="col-span-2 h-80 rounded-2xl animate-pulse" style={{ background: 'var(--admin-surface)' }} />
        </div>
      </div>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 pt-10 pb-10 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[38px] font-bold tracking-tight" style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}>
            Hola, {firstName}.
          </h1>
          <p className="text-xl mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
            Aquí tienes el resumen de hoy.
          </p>
        </div>

        {/* Tipo de cambio */}
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-1"
          style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--admin-text-tertiary)' }}>$1 USD =</span>
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" step="0.01"
              value={tipoCambio}
              onChange={e => setTipoCambio(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTipoCambio()}
              className="w-16 rounded-lg px-2 py-1 text-sm text-center focus:outline-none transition"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--admin-text-tertiary)' }}>MXN</span>
          </div>
          <button
            onClick={saveTipoCambio}
            disabled={savingTC}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: savedTC ? 'rgba(34,197,94,0.1)' : 'var(--admin-text-primary)', color: savedTC ? '#16a34a' : '#fff' }}
          >
            {savedTC ? <Check size={12} /> : <Save size={12} />}
            {savedTC ? 'OK' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {KPIS.map((kpi, i) => (
          <Link
            key={i}
            href={kpi.href}
            className="group flex flex-col gap-3 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
            style={{
              background:  'var(--admin-surface)',
              boxShadow:   kpi.accent
                ? '0 0 0 1.5px #fca5a5, 0 1px 4px rgba(0,0,0,0.04)'
                : '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
                <kpi.icon size={15} style={{ color: kpi.accent ? '#ef4444' : 'var(--admin-text-secondary)' }} />
              </div>
              <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--admin-text-tertiary)' }} />
            </div>
            <div>
              <p className="text-[28px] font-semibold leading-none" style={{ color: kpi.accent ? '#ef4444' : 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}>
                {kpi.value}
              </p>
              <p className="text-[12px] font-medium mt-1.5" style={{ color: 'var(--admin-text-secondary)' }}>{kpi.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-tertiary)' }}>{kpi.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-tertiary)' }}>
          Accesos rápidos
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.href}
              href={a.href}
              className="text-[13px] font-medium px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-secondary)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Reservas recientes + Próximas salidas */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Reservas recientes */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center gap-2">
              <ClipboardList size={14} style={{ color: 'var(--admin-text-tertiary)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Reservas recientes</span>
            </div>
            <Link href="/admin/reservaciones" className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--admin-text-tertiary)' }}>
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>
          {recientes.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: 'var(--admin-text-tertiary)' }}>
              Sin reservaciones aún
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {recientes.map(r => {
                const pax = r.adultos + r.menores9 + r.menores3;
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ESTADO_DOT[r.estado]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text-primary)' }}>
                        {r.nombreCompleto}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-tertiary)' }}>
                        {r.paradaOrigen?.destino.nombre ?? '—'} → {r.paradaDestino?.destino.nombre ?? '—'}
                        {' · '}{r.salida.ruta?.nombre}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                        {ESTADO_LABEL[r.estado]}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                        {pax} pax · {formatFechaCorta(r.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas salidas */}
        <div className="xl:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--admin-text-tertiary)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Próximas salidas</span>
            </div>
            <Link href="/admin/salidas" className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--admin-text-tertiary)' }}>
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>
          {proximasSalidas.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: 'var(--admin-text-tertiary)' }}>
              No hay salidas abiertas
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {proximasSalidas.map(s => {
                const dias = diffDias(s.fechaSalida, s.fechaRegreso);
                const paradas = [...(s.ruta?.paradas ?? [])].sort((a, b) => a.orden - b.orden);
                const origen  = paradas[0]?.destino?.nombre;
                const destino = paradas[paradas.length - 1]?.destino?.nombre;
                const paxConf = reservaciones
                  .filter(r => r.estado === 'CONFIRMADA' && r.salida?.id === s.id)
                  .reduce((acc, r) => acc + r.adultos + r.menores9 + r.menores3, 0);
                const pct = Math.min(100, Math.round((paxConf / s.cupoTotal) * 100));
                return (
                  <Link key={s.id} href={`/admin/salidas/${s.id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-black/[0.03] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text-primary)' }}>
                          {s.ruta?.nombre}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                          {formatFecha(s.fechaSalida)} · {dias} días
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold flex-shrink-0 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        Abierta
                      </span>
                    </div>
                    {/* Barra de ocupación */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                        <span>{paxConf} pax confirmados</span>
                        <span>{s.cupoTotal} asientos</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e' }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Empleados */}
      {empStats.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: 'var(--admin-text-tertiary)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Actividad de empleados</span>
            </div>
            <Link href="/admin/empleados" className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--admin-text-tertiary)' }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Empleado', 'Total reservas', 'Confirmadas', 'Pendientes', 'Pasajeros', 'Monto USD'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left font-semibold" style={{ color: 'var(--admin-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                {empStats.map(e => (
                  <tr key={e.empleadoId} className="hover:bg-black/[0.03] transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{e.nombre}</p>
                      <p style={{ color: 'var(--admin-text-tertiary)' }}>{e.email}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{e.totalReservas}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                        {e.reservasConfirmadas}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {e.reservasPendientes > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                          {e.reservasPendientes}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--admin-text-tertiary)' }}>0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--admin-text-secondary)' }}>{e.pasajerosConfirmados}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                      ${Number(e.montoTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
