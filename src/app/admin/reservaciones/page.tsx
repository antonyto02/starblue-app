'use client';

import { useEffect, useState } from 'react';
import {
  Users, Phone, Mail, Check, X,
  ClipboardList, ChevronDown, ChevronUp, MapPin, UserCheck, TrendingUp, Armchair,
} from 'lucide-react';
import api from '@/lib/api';

interface StatsEmpleado {
  empleadoId: string;
  nombre: string;
  email: string;
  totalReservas: number;
  reservasConfirmadas: number;
  reservasPendientes: number;
  pasajerosConfirmados: number;
  montoTotal: number;
}

type EstadoR = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

interface Reservacion {
  id: string;
  nombreCompleto: string;
  telefono: string;
  email: string;
  adultos: number;
  menores9: number;
  menores3: number;
  precioUnitario: number | null;
  asientosAsignados: number[] | null;
  notas: string;
  estado: EstadoR;
  createdAt: string;
  empleado: { id: string; name: string } | null;
  paradaOrigen: { destino: { nombre: string } } | null;
  paradaDestino: { destino: { nombre: string } } | null;
  salida: {
    id: string;
    fechaSalida: string;
    fechaRegreso: string;
    cupoTotal: number;
    ruta: { nombre: string };
  };
}

interface GrupoSalida {
  salidaId: string;
  rutaNombre: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  reservaciones: Reservacion[];
}

const ESTADO_CONFIG: Record<EstadoR, { label: string; bar: string; pill: string }> = {
  PENDIENTE:  { label: 'Pendiente',  bar: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMADA: { label: 'Confirmada', bar: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200' },
  CANCELADA:  { label: 'Cancelada',  bar: 'bg-gray-300',   pill: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const formatFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

const diffDias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

function agrupar(reservaciones: Reservacion[]): GrupoSalida[] {
  const mapa = new Map<string, GrupoSalida>();
  for (const r of reservaciones) {
    const sid = r.salida.id;
    if (!mapa.has(sid)) {
      mapa.set(sid, {
        salidaId: sid, rutaNombre: r.salida.ruta?.nombre ?? 'Sin ruta',
        fechaSalida: r.salida.fechaSalida, fechaRegreso: r.salida.fechaRegreso,
        cupoTotal: r.salida.cupoTotal, reservaciones: [],
      });
    }
    mapa.get(sid)!.reservaciones.push(r);
  }
  return Array.from(mapa.values()).sort(
    (a, b) => new Date(a.fechaSalida).getTime() - new Date(b.fechaSalida).getTime(),
  );
}

export default function AdminReservacionesPage() {
  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [statsEmp, setStatsEmp]           = useState<StatsEmpleado[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filtro, setFiltro]               = useState<'TODAS' | EstadoR>('TODAS');
  const [abiertos, setAbiertos]           = useState<Set<string>>(new Set());
  const [tab, setTab]                     = useState<'reservaciones' | 'comisiones'>('reservaciones');

  useEffect(() => { Promise.all([fetchReservaciones(), fetchStats()]); }, []);

  const fetchReservaciones = async () => {
    const { data } = await api.get('/reservaciones');
    setReservaciones(data);
    setAbiertos(new Set((data as Reservacion[]).filter(r => r.estado === 'PENDIENTE').map(r => r.salida.id)));
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await api.get('/reservaciones/empleados/stats');
    setStatsEmp(data);
  };

  const toggleGrupo = (id: string) =>
    setAbiertos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const confirmar = async (id: string) => { await api.patch(`/reservaciones/${id}/confirmar`); fetchReservaciones(); };
  const cancelar  = async (id: string) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    await api.patch(`/reservaciones/${id}/cancelar`); fetchReservaciones();
  };

  const filtradas = filtro === 'TODAS' ? reservaciones : reservaciones.filter(r => r.estado === filtro);
  const grupos    = agrupar(filtradas);

  return (
    <div className="px-8 pt-10 pb-10 space-y-6">

      {/* ── Title ── */}
      <div>
        <h1 className="text-[38px] font-bold tracking-tight" style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}>
          Reservaciones
        </h1>
        {!loading && (
          <p className="text-xl mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
            {reservaciones.length} {reservaciones.length === 1 ? 'reservación' : 'reservaciones'}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1">
        {([
          { key: 'reservaciones', label: 'Reservaciones', icon: ClipboardList },
          { key: 'comisiones',    label: 'Comisiones',    icon: TrendingUp    },
        ] as const).map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--admin-surface)' : 'transparent',
                color:      active ? 'var(--admin-text-primary)' : 'var(--admin-text-tertiary)',
                boxShadow:  active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={13} /> {label}
              {key === 'comisiones' && statsEmp.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--admin-accent-subtle)', color: 'var(--admin-accent)' }}>
                  {statsEmp.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: COMISIONES ══ */}
      {tab === 'comisiones' && (
        <div className="space-y-3">
          {statsEmp.length === 0 ? (
            <div className="rounded-2xl py-20 text-center" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>
              <UserCheck size={32} className="mx-auto mb-3" style={{ color: 'var(--admin-text-tertiary)' }} />
              <p className="text-[14px] font-medium" style={{ color: 'var(--admin-text-secondary)' }}>Sin datos de empleados aún</p>
            </div>
          ) : statsEmp.map((emp, idx) => (
            <div key={emp.empleadoId} className="rounded-2xl p-6"
              style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                    style={{ background: 'var(--admin-accent)' }}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--admin-text-primary)' }}>{emp.nombre}</p>
                    <p className="text-[12px] truncate" style={{ color: 'var(--admin-text-tertiary)' }}>{emp.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 flex-shrink-0">
                  {[
                    { val: emp.totalReservas,       label: 'Total',       color: 'var(--admin-text-primary)'   },
                    { val: emp.reservasConfirmadas,  label: 'Confirmadas', color: '#22c55e'                     },
                    { val: emp.reservasPendientes,   label: 'Pendientes',  color: '#f59e0b'                     },
                    { val: emp.pasajerosConfirmados, label: 'Pasajeros',   color: 'var(--admin-text-secondary)' },
                    { val: `$${Number(emp.montoTotal).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Monto USD', color: '#22c55e' },
                  ].map(({ val, label, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-[18px] font-bold leading-none" style={{ color }}>{val}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                  <span>Tasa de confirmación</span>
                  <span>{emp.totalReservas > 0 ? Math.round((emp.reservasConfirmadas / emp.totalReservas) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
                  <div className="h-full bg-green-400 rounded-full"
                    style={{ width: `${emp.totalReservas > 0 ? (emp.reservasConfirmadas / emp.totalReservas) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: RESERVACIONES ══ */}
      {tab === 'reservaciones' && (
        <div className="space-y-4">

          {/* Filtros */}
          {!loading && reservaciones.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(['TODAS', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA'] as const).map(f => {
                const active = filtro === f;
                const count  = f === 'TODAS' ? reservaciones.length : reservaciones.filter(r => r.estado === f).length;
                const label  = f === 'TODAS' ? 'Todas' : ESTADO_CONFIG[f].label;
                return (
                  <button key={f} onClick={() => setFiltro(f)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: active ? 'var(--admin-text-primary)' : 'var(--admin-surface)',
                      color:      active ? '#fff' : 'var(--admin-text-secondary)',
                      boxShadow:  active ? '0 1px 4px rgba(0,0,0,0.15)' : '0 0 0 1px var(--admin-border-light)',
                    }}
                  >
                    {label} <span style={{ opacity: 0.6 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--admin-surface)' }}>
                  <div className="h-[72px] animate-pulse" style={{ background: 'var(--admin-bg)' }} />
                  <div className="h-20 animate-pulse opacity-50" style={{ background: 'var(--admin-bg)' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && reservaciones.length === 0 && (
            <div className="rounded-2xl py-24 text-center" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--admin-bg)' }}>
                <ClipboardList size={22} style={{ color: 'var(--admin-text-tertiary)' }} />
              </div>
              <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>Sin reservaciones aún</p>
              <p className="text-[13px] mt-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                Las solicitudes aparecerán aquí cuando los viajeros reserven
              </p>
            </div>
          )}

          {/* Grupos */}
          {!loading && grupos.map(grupo => {
            const abierto  = abiertos.has(grupo.salidaId);
            const paxConf  = grupo.reservaciones.filter(r => r.estado === 'CONFIRMADA').reduce((s, r) => s + r.adultos + r.menores9 + r.menores3, 0);
            const nPend    = grupo.reservaciones.filter(r => r.estado === 'PENDIENTE').length;
            const pct      = Math.min(100, grupo.cupoTotal > 0 ? Math.round((paxConf / grupo.cupoTotal) * 100) : 0);
            const barColor = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';
            const dias     = diffDias(grupo.fechaSalida, grupo.fechaRegreso);

            return (
              <div key={grupo.salidaId} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>

                <button onClick={() => toggleGrupo(grupo.salidaId)}
                  className="w-full text-left px-6 py-5 flex items-center gap-5 transition-colors"
                  style={{ borderBottom: abierto ? '1px solid var(--admin-border-light)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-[22px] font-bold leading-none" style={{ color: 'var(--admin-text-primary)' }}>
                      {new Date(grupo.fechaSalida + 'T00:00:00').getDate()}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                      {new Date(grupo.fechaSalida + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' })}
                    </p>
                  </div>

                  <div className="w-px h-10 flex-shrink-0" style={{ background: 'var(--admin-border-light)' }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--admin-text-primary)' }}>
                      {grupo.rutaNombre}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                      {formatFecha(grupo.fechaSalida)} → {formatFecha(grupo.fechaRegreso)} · {dias} días
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }}>
                        <span style={{ color: barColor, fontWeight: 600 }}>{paxConf}</span> / {grupo.cupoTotal} pax
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {nPend > 0 && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {nPend} pendiente{nPend > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-secondary)' }}>
                      {grupo.reservaciones.length} reserva{grupo.reservaciones.length !== 1 ? 's' : ''}
                    </span>
                    {abierto
                      ? <ChevronUp size={15} style={{ color: 'var(--admin-text-tertiary)' }} />
                      : <ChevronDown size={15} style={{ color: 'var(--admin-text-tertiary)' }} />}
                  </div>
                </button>

                {abierto && (
                  <div>
                    {grupo.reservaciones.map((r, rIdx) => {
                      const cfg = ESTADO_CONFIG[r.estado];
                      const pax = r.adultos + r.menores9 + r.menores3;
                      return (
                        <div key={r.id} className="flex items-stretch"
                          style={{ borderTop: rIdx > 0 ? '1px solid var(--admin-border-light)' : undefined }}>
                          <div className={`w-[3px] flex-shrink-0 ${cfg.bar}`} />
                          <div className="flex-1 min-w-0 px-6 py-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <p className="text-[14px] font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                                  {r.nombreCompleto}
                                </p>
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.pill}`}>
                                  {cfg.label}
                                </span>
                                {r.empleado ? (
                                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-secondary)' }}>
                                    <UserCheck size={10} /> {r.empleado.name}
                                  </span>
                                ) : (
                                  <span className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>Web</span>
                                )}
                              </div>
                              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--admin-text-tertiary)' }}>
                                {formatFechaCorta(r.createdAt)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]" style={{ color: 'var(--admin-text-secondary)' }}>
                              <span className="flex items-center gap-1.5">
                                <Phone size={11} style={{ color: 'var(--admin-text-tertiary)' }} /> {r.telefono}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Mail size={11} style={{ color: 'var(--admin-text-tertiary)' }} /> {r.email}
                              </span>
                              <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                                <Users size={11} style={{ color: 'var(--admin-text-tertiary)' }} />
                                {pax} pax
                                <span style={{ color: 'var(--admin-text-tertiary)', fontWeight: 400 }}>
                                  ({[r.adultos > 0 ? `${r.adultos}A` : '', r.menores9 > 0 ? `${r.menores9}M` : '', r.menores3 > 0 ? `${r.menores3}B` : ''].filter(Boolean).join('+')})
                                </span>
                              </span>
                              {r.asientosAsignados && r.asientosAsignados.length > 0 && (
                                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                  <Armchair size={10} /> {r.asientosAsignados.join(', ')}
                                </span>
                              )}
                              {r.paradaOrigen && r.paradaDestino && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin size={11} style={{ color: 'var(--admin-text-tertiary)' }} />
                                  {r.paradaOrigen.destino.nombre}
                                  <span style={{ opacity: 0.4 }}>→</span>
                                  {r.paradaDestino.destino.nombre}
                                </span>
                              )}
                            </div>

                            {r.notas && (
                              <p className="mt-2 text-[12px] italic" style={{ color: 'var(--admin-text-tertiary)' }}>"{r.notas}"</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 px-4 flex-shrink-0">
                            {r.estado === 'PENDIENTE' && (
                              <button onClick={() => confirmar(r.id)} title="Confirmar"
                                className="p-2 rounded-xl transition-colors"
                                style={{ color: 'var(--admin-text-tertiary)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.1)'; (e.currentTarget as HTMLElement).style.color = '#16a34a'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'; }}
                              >
                                <Check size={15} />
                              </button>
                            )}
                            {r.estado !== 'CANCELADA' && (
                              <button onClick={() => cancelar(r.id)} title="Cancelar"
                                className="p-2 rounded-xl transition-colors"
                                style={{ color: 'var(--admin-text-tertiary)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'; }}
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && reservaciones.length > 0 && grupos.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--admin-text-tertiary)' }}>
              <p className="text-[13px]">No hay reservaciones con ese estado</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
