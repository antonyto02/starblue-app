'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Users, Save, CheckCircle, Trash2,
  DollarSign, Pencil, X, Plus, ChevronDown, ChevronRight, MapPin, Info,
} from 'lucide-react';
import api from '@/lib/api';
import { useConfig } from '@/lib/useConfig';

interface RutaParada {
  id: string;
  orden: number;
  destino?: { nombre: string; pais?: string };
}

interface Ruta {
  id: string;
  nombre: string;
  paradas: RutaParada[];
}

interface SalidaData {
  id: string;
  rutaId: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  estado: string;
  notas: string;
  ruta: Ruta;
}

interface Tarifa {
  id: string;
  paradaOrigenId: string;
  paradaDestinoId: string;
  precioUSD: number;
  paradaOrigen:  { destino: { nombre: string } };
  paradaDestino: { destino: { nombre: string } };
}

const diffDias = (a: string, b: string) => {
  if (!a || !b) return null;
  const dias = Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000,
  );
  return dias > 0 ? dias : null;
};

const cardStyle = {
  background: 'var(--admin-surface)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)',
};

const inputStyle = {
  border: '1px solid var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text-primary)',
};

type Tab = 'general' | 'recorrido' | 'tarifas';

export default function EditarSalidaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toMXN } = useConfig();
  const [salida, setSalida]   = useState<SalidaData | null>(null);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm]           = useState({ fechaSalida: '', fechaRegreso: '', cupoTotal: '', notas: '' });
  const [originalForm, setOriginalForm] = useState({ fechaSalida: '', fechaRegreso: '', cupoTotal: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<Tab>('general');

  const [editId, setEditId]             = useState<string | null>(null);
  const [editUSD, setEditUSD]           = useState('');
  const [savingTarifa, setSavingTarifa] = useState(false);
  const [newOrigen, setNewOrigen]   = useState('');
  const [newDestino, setNewDestino] = useState('');
  const [newUSD, setNewUSD]         = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (destinoId: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(destinoId) ? next.delete(destinoId) : next.add(destinoId);
      return next;
    });

  useEffect(() => { fetchSalida(); fetchTarifas(); }, [id]);

  const fetchSalida = async () => {
    const { data } = await api.get(`/salidas/${id}`);
    setSalida(data);
    const values = { fechaSalida: data.fechaSalida, fechaRegreso: data.fechaRegreso, cupoTotal: String(data.cupoTotal), notas: data.notas ?? '' };
    setForm(values);
    setOriginalForm(values);
  };

  const fetchTarifas = async () => {
    const { data } = await api.get(`/salidas/${id}/tarifas`);
    setTarifas(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.put(`/salidas/${id}`, { ...form, cupoTotal: parseInt(form.cupoTotal) });
      setOriginalForm({ ...form });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally { setLoading(false); }
  };

  const handleCreateTarifa = async () => {
    if (!newOrigen || !newDestino || !newUSD) return;
    setSavingTarifa(true);
    try {
      await api.post(`/salidas/${id}/tarifas`, {
        paradaOrigenId: newOrigen, paradaDestinoId: newDestino,
        precioUSD: parseFloat(newUSD),
      });
      setNewOrigen(''); setNewDestino(''); setNewUSD('');
      fetchTarifas();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error al guardar tarifa');
    } finally { setSavingTarifa(false); }
  };

  const handleSaveEdit = async (tarifaId: string) => {
    if (!editUSD) return;
    await api.put(`/salidas/${id}/tarifas/${tarifaId}`, { precioUSD: parseFloat(editUSD) });
    setEditId(null);
    fetchTarifas();
  };

  const handleDeleteTarifa = async (tarifaId: string) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    await api.delete(`/salidas/${id}/tarifas/${tarifaId}`);
    fetchTarifas();
  };

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const dias    = diffDias(form.fechaSalida, form.fechaRegreso);
  const isDirty = JSON.stringify(form) !== JSON.stringify(originalForm);

  if (!salida) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-sm" style={{ color: 'var(--admin-text-tertiary)' }}>Cargando salida...</div>
    </div>
  );

  const paradas = (salida.ruta?.paradas ?? []).slice().sort((a, b) => a.orden - b.orden);

  const TABS: { key: Tab; label: string; badge?: string }[] = [
    { key: 'general',   label: 'General' },
    { key: 'recorrido', label: 'Recorrido', badge: String(paradas.length) },
    { key: 'tarifas',   label: 'Tarifas',   badge: String(tarifas.length) },
  ];

  return (
    <div className="h-full flex flex-col px-8 pt-10 pb-6">

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle size={16} /> Cambios guardados
        </div>
      )}

      {/* Title row */}
      <div className="flex items-end justify-between mb-6 flex-shrink-0">
        <div>
          <Link
            href="/admin/salidas"
            className="inline-flex items-center gap-1.5 text-xs mb-2 transition-colors"
            style={{ color: 'var(--admin-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
          >
            <ArrowLeft size={12} /> Salidas
          </Link>
          <h1
            className="text-[38px] font-bold tracking-tight"
            style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
          >
            {salida.ruta.nombre}
          </h1>
        </div>

        {isDirty && (
          <button
            form="salida-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all mb-1"
            style={{ background: 'var(--admin-text-primary)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
          >
            <Save size={12} /> {loading ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 flex-shrink-0">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--admin-surface)' : 'transparent',
                color:      active ? 'var(--admin-text-primary)' : 'var(--admin-text-tertiary)',
                boxShadow:  active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t.label}
              {t.badge && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'var(--admin-accent-subtle)' : 'var(--admin-bg)',
                    color:      active ? 'var(--admin-accent)' : 'var(--admin-text-tertiary)',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: General ── */}
      {tab === 'general' && (
        <form id="salida-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-4 max-w-2xl">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Fechas + Cupo en fila */}
            <div className="grid grid-cols-2 gap-4">

              {/* Fechas */}
              <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
                    Fechas del viaje
                  </label>
                  {dias && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-tertiary)' }}>
                      {dias} días
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>Salida</label>
                    <input type="date" required value={form.fechaSalida} onChange={e => f('fechaSalida', e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>Regreso</label>
                    <input type="date" required value={form.fechaRegreso} min={form.fechaSalida} onChange={e => f('fechaRegreso', e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition"
                      style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Cupo */}
              <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
                  Cupo total
                </label>
                <div className="relative">
                  <Users size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
                  <input type="number" required min={1} value={form.cupoTotal} onChange={e => f('cupoTotal', e.target.value)}
                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition"
                    style={inputStyle} />
                </div>
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                  <Info size={11} /> No reducir por debajo de asientos asignados
                </p>
              </div>
            </div>

            {/* Notas */}
            <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
                Notas internas <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </label>
              <textarea rows={4} placeholder="Chofer, unidad, observaciones..."
                value={form.notas} onChange={e => f('notas', e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition resize-none"
                style={inputStyle} />
            </div>

            {/* Zona de peligro */}
            <div className="rounded-2xl p-5" style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ef4444' }}>Zona de peligro</p>
              <button type="button" onClick={async () => {
                if (!confirm('¿Eliminar esta salida?')) return;
                await api.delete(`/salidas/${id}`);
                router.push('/admin/salidas');
              }}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Trash2 size={13} /> Eliminar salida
              </button>
            </div>

          </div>
        </form>
      )}

      {/* ── Tab: Recorrido ── */}
      {tab === 'recorrido' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {paradas.length === 0 ? (
            <div className="rounded-2xl p-10 text-center text-sm" style={{ ...cardStyle, color: 'var(--admin-text-tertiary)' }}>
              Esta ruta no tiene paradas configuradas.
            </div>
          ) : (
            <div className="rounded-2xl p-6 max-w-4xl" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-5" style={{ color: 'var(--admin-text-tertiary)' }}>
                Recorrido · {paradas.length} paradas
              </p>
              {(() => {
                const PER_ROW = 7;
                const CIRCLE = 52;
                const rows: RutaParada[][] = [];
                for (let i = 0; i < paradas.length; i += PER_ROW) rows.push(paradas.slice(i, i + PER_ROW));
                const cellPct = 100 / PER_ROW;

                return (
                  <div>
                    {rows.map((row, rowIdx) => {
                      const reversed = rowIdx % 2 === 1;
                      const displayRow = reversed ? [...row].reverse() : row;
                      const isLastRow = rowIdx === rows.length - 1;
                      const lastCellIdx = displayRow.length - 1;
                      const connectorPct = reversed ? cellPct * 0.5 : cellPct * lastCellIdx + cellPct * 0.5;

                      return (
                        <div key={rowIdx}>
                          <div className="relative flex">
                            {[-6, 6].map(offset => (
                              <div key={offset} className="absolute" style={{
                                top: `${CIRCLE / 2 + offset - 1}px`, height: '2px',
                                left: `${cellPct * 0.5}%`, width: `${cellPct * (displayRow.length - 1)}%`,
                                background: 'var(--admin-text-primary)', zIndex: 0,
                              }} />
                            ))}
                            {Array.from({ length: PER_ROW }).map((_, colIdx) => {
                              const p = displayRow[colIdx];
                              if (!p) return <div key={colIdx} style={{ flex: 1 }} />;
                              const isUSA = p.destino?.pais === 'USA';
                              return (
                                <div key={p.id} style={{ flex: 1 }} className="flex flex-col items-center relative z-10 pb-2">
                                  <span className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white border-4 shadow-md"
                                    style={{
                                      background: isUSA ? 'var(--admin-accent)' : '#22c55e',
                                      borderColor: 'var(--admin-surface)',
                                    }}>
                                    {p.orden}
                                  </span>
                                  <span className="text-[10px] text-center leading-tight mt-1.5 px-0.5 break-words w-full"
                                    style={{ color: 'var(--admin-text-secondary)' }}>
                                    {p.destino?.nombre ?? '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {!isLastRow && (
                            <div className="relative" style={{ height: '40px' }}>
                              {[-6, 6].map(offset => (
                                <div key={offset} className="absolute" style={{
                                  left: `calc(${connectorPct}% + ${offset - 1}px)`, top: 0,
                                  width: '2px', height: '100%', background: 'var(--admin-text-primary)',
                                }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--admin-border-light)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                  <span className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>México</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'var(--admin-accent)' }} />
                  <span className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>Estados Unidos</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Tarifas ── */}
      {tab === 'tarifas' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="rounded-2xl p-6 max-w-3xl" style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
                Precios de esta salida
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-accent-subtle)', color: 'var(--admin-accent)' }}>
                {tarifas.length} tramos
              </span>
            </div>
            <p className="text-xs mb-5 flex items-start gap-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
              <Info size={11} className="flex-shrink-0 mt-0.5" />
              Estos precios aplican solo a esta salida. Se pre-llenaron desde la ruta pero puedes ajustarlos.
            </p>

            {/* Tarifas agrupadas */}
            {tarifas.length > 0 && (() => {
              const grupos = new Map<string, { nombre: string; tarifas: Tarifa[] }>();
              for (const t of tarifas) {
                const key = t.paradaDestinoId;
                if (!grupos.has(key)) grupos.set(key, { nombre: t.paradaDestino.destino.nombre, tarifas: [] });
                grupos.get(key)!.tarifas.push(t);
              }
              return (
                <div className="mb-5 space-y-2">
                  {Array.from(grupos.entries()).map(([destinoId, grupo]) => {
                    const expanded = expandedGroups.has(destinoId);
                    const precioRef = grupo.tarifas[0]?.precioUSD;
                    return (
                      <div key={destinoId} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--admin-border-light)' }}>
                        <button type="button" onClick={() => toggleGroup(destinoId)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                          style={{ background: 'var(--admin-bg)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-sidebar-hover)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'}
                        >
                          {expanded
                            ? <ChevronDown size={14} style={{ color: 'var(--admin-text-tertiary)', flexShrink: 0 }} />
                            : <ChevronRight size={14} style={{ color: 'var(--admin-text-tertiary)', flexShrink: 0 }} />
                          }
                          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--admin-text-primary)' }}>
                            → {grupo.nombre}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>{grupo.tarifas.length} orígenes</span>
                          <div className="ml-3 text-right">
                            <span className="text-sm font-bold" style={{ color: 'var(--admin-text-primary)' }}>${Number(precioRef).toLocaleString()} USD</span>
                            <span className="text-xs ml-2" style={{ color: 'var(--admin-text-tertiary)' }}>≈ ${toMXN(Number(precioRef)).toLocaleString()} MXN</span>
                          </div>
                        </button>

                        {expanded && (
                          <div style={{ borderTop: '1px solid var(--admin-border-light)' }}>
                            {grupo.tarifas.map(t => (
                              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border-light)' }}>
                                <span className="text-sm flex-1 pl-5" style={{ color: 'var(--admin-text-secondary)' }}>{t.paradaOrigen.destino.nombre}</span>

                                {editId === t.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--admin-text-tertiary)' }}>$</span>
                                      <input type="number" min="0" step="0.01" value={editUSD} onChange={e => setEditUSD(e.target.value)}
                                        className="w-24 rounded-lg pl-5 pr-2 py-1 text-sm focus:outline-none" style={inputStyle} autoFocus />
                                    </div>
                                    <button onClick={() => handleSaveEdit(t.id)} className="p-1" style={{ color: '#22c55e' }}>
                                      <CheckCircle size={14} />
                                    </button>
                                    <button onClick={() => setEditId(null)} className="p-1" style={{ color: 'var(--admin-text-tertiary)' }}>
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>${Number(t.precioUSD).toLocaleString()} USD</span>
                                    <span className="text-xs" style={{ color: 'var(--admin-text-tertiary)' }}>≈ ${toMXN(Number(t.precioUSD)).toLocaleString()} MXN</span>
                                    <button onClick={() => { setEditId(t.id); setEditUSD(String(t.precioUSD)); }}
                                      className="p-1 rounded transition-colors" style={{ color: 'var(--admin-text-tertiary)' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button onClick={() => handleDeleteTarifa(t.id)}
                                      className="p-1 rounded transition-colors" style={{ color: 'var(--admin-text-tertiary)' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Nueva tarifa */}
            <div className="rounded-xl p-4 space-y-3" style={{ border: '1px dashed var(--admin-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>Agregar / reemplazar tarifa</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-tertiary)' }}>Desde</label>
                  <select value={newOrigen} onChange={e => setNewOrigen(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition" style={inputStyle}>
                    <option value="">— origen —</option>
                    {paradas.map(p => <option key={p.id} value={p.id}>{p.destino?.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-tertiary)' }}>Hasta</label>
                  <select value={newDestino} onChange={e => setNewDestino(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition" style={inputStyle}>
                    <option value="">— destino —</option>
                    {paradas.filter(p => p.id !== newOrigen).map(p => <option key={p.id} value={p.id}>{p.destino?.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
                  <input type="number" min="0" step="0.01" placeholder="Precio USD"
                    value={newUSD} onChange={e => setNewUSD(e.target.value)}
                    className="w-full rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none transition" style={inputStyle} />
                </div>
                <button type="button" onClick={handleCreateTarifa}
                  disabled={savingTarifa || !newOrigen || !newDestino || !newUSD}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                  style={{ background: 'var(--admin-text-primary)', color: '#fff' }}
                >
                  <Plus size={14} /> {savingTarifa ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
