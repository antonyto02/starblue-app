'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Users, FileText, Info,
  Route, MapPin, DollarSign, CheckCircle, ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';

/* ─── Types ─── */
interface RutaParada {
  id: string;
  orden: number;
  activa: boolean;
  destino: { id: string; nombre: string; pais?: string };
}

interface Ruta {
  id: string;
  nombre: string;
  descripcion: string;
  cupoDefault: number;
  duracionDias: number;
  paradas: RutaParada[];
}

interface Tarifa {
  id: string;
  paradaOrigenId: string;
  paradaDestinoId: string;
  precioUSD: number;
  paradaOrigen:  { destino: { nombre: string } };
  paradaDestino: { destino: { nombre: string } };
}

// Editable price row for each stop
interface PrecioParada {
  paradaId: string;
  nombre: string;
  precioUSD: string;
  isOrigen: boolean;
  isUSA: boolean;
}

/* ─── Main page ─── */
export default function NuevaSalidaPage() {
  const router = useRouter();

  const [rutas, setRutas]     = useState<Ruta[]>([]);
  const [precios, setPrecios] = useState<PrecioParada[]>([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);

  const [form, setForm] = useState({
    rutaId: '', fechaSalida: '', fechaRegreso: '', cupoTotal: '', notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [creada, setCreada]   = useState<{ id: string } | null>(null);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!creada) return;
    const t = setInterval(() => { setCountdown(c => c - 1); }, 1000);
    return () => clearInterval(t);
  }, [creada]);

  useEffect(() => {
    if (creada && countdown <= 0) router.push(`/admin/salidas/${creada.id}`);
  }, [countdown, creada, router]);

  useEffect(() => {
    api.get('/rutas').then(({ data }) => setRutas(data));
  }, []);

  /* When a route is selected, auto-fill cupo + fechaRegreso and load tarifas */
  useEffect(() => {
    if (!form.rutaId) { setPrecios([]); return; }
    setLoadingPrecios(true);

    const ruta = rutas.find(r => r.id === form.rutaId);
    if (!ruta) { setLoadingPrecios(false); return; }

    // Auto-fill cupo from route default
    setForm(prev => ({ ...prev, cupoTotal: String(ruta.cupoDefault ?? 45) }));

    api.get(`/rutas/${form.rutaId}/tarifas`)
      .then(({ data: tarifas }: { data: Tarifa[] }) => {
        const paradasOrdenadas = [...ruta.paradas].sort((a, b) => a.orden - b.orden);
        const origenId = paradasOrdenadas[0]?.id;

        const rows: PrecioParada[] = paradasOrdenadas.map((p, idx) => {
          const isOrigen = idx === 0;
          const isUSA    = p.destino?.pais === 'USA';
          const tarifa   = !isOrigen
            ? tarifas.find(t => t.paradaOrigenId === origenId && t.paradaDestinoId === p.id)
            : null;
          return {
            paradaId: p.id,
            nombre:   p.destino?.nombre ?? '—',
            precioUSD: tarifa ? String(tarifa.precioUSD) : '',
            isOrigen,
            isUSA,
          };
        });
        setPrecios(rows);
      })
      .catch(() => setPrecios([]))
      .finally(() => setLoadingPrecios(false));
  }, [form.rutaId, rutas]);

  /* Auto-calculate fechaRegreso when fechaSalida changes */
  useEffect(() => {
    if (!form.fechaSalida || !form.rutaId) return;
    const ruta = rutas.find(r => r.id === form.rutaId);
    if (!ruta?.duracionDias) return;
    const d = new Date(form.fechaSalida + 'T12:00:00');
    d.setDate(d.getDate() + ruta.duracionDias);
    setForm(prev => ({ ...prev, fechaRegreso: d.toISOString().split('T')[0] }));
  }, [form.fechaSalida, form.rutaId, rutas]);

  const updatePrecio = (idx: number, value: string) =>
    setPrecios(prev => prev.map((p, i) => i === idx ? { ...p, precioUSD: value } : p));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Only USA stops need prices
    for (const p of precios) {
      if (!p.isOrigen && p.isUSA && !p.precioUSD) {
        setError(`"${p.nombre}" requiere precio en USD.`);
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Create salida (will auto-copy ruta_tarifas)
      const { data } = await api.post('/salidas', {
        ...form,
        cupoTotal: parseInt(form.cupoTotal),
      });

      // 2. If USA prices differ from defaults, update salida_tarifas
      const origenId = precios.find(p => p.isOrigen)?.paradaId;
      if (origenId) {
        for (const p of precios) {
          if (p.isOrigen || !p.isUSA || !p.precioUSD) continue;
          await api.post(`/salidas/${data.id}/tarifas`, {
            paradaOrigenId:  origenId,
            paradaDestinoId: p.paradaId,
            precioUSD:       parseFloat(p.precioUSD),
          });
        }
      }

      setCreada({ id: data.id });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear salida');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (creada) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">¡Salida creada!</h2>
          <p className="text-sm text-gray-400 mb-8">
            Precios configurados. Puedes ajustarlos desde la salida.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/admin/salidas/${creada.id}`)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: '#0f1b2d', color: '#fff' }}
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={16} />
                <div className="text-left">
                  <p>Ver salida</p>
                  <p className="text-xs font-normal opacity-60">Detalles y precios</p>
                </div>
              </div>
              <ArrowRight size={15} className="opacity-60" />
            </button>
            <Link href="/admin/salidas"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Ver todas las salidas
            </Link>
          </div>
          <p className="text-xs text-gray-300 mt-6">Redirigiendo en {countdown}s...</p>
        </div>
      </div>
    );
  }

  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const rutaSeleccionada = rutas.find(r => r.id === form.rutaId);

  // Submit is enabled once USA stops all have prices
  const usaPrecios = precios.filter(p => !p.isOrigen && p.isUSA);
  const preciosCompletos = precios.length === 0 || usaPrecios.every(p => p.precioUSD);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <Link href="/admin/salidas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft size={15} /> Volver a salidas
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0f1b2d] rounded-xl flex items-center justify-center">
            <Calendar size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva salida</h1>
            <p className="text-sm text-gray-400">Programa una fecha de viaje y confirma los precios</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-3 space-y-5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Route selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Route size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Ruta</h2>
                <Link href="/admin/rutas/nueva" className="ml-auto text-xs text-[#0f1b2d]/60 hover:text-[#0f1b2d] transition-colors">
                  + Nueva ruta
                </Link>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {rutas.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No hay rutas. <Link href="/admin/rutas/nueva" className="text-[#0f1b2d] underline">Crea una primero</Link>
                  </p>
                )}
                {rutas.map((r) => {
                  const paras   = [...r.paradas].sort((a, b) => a.orden - b.orden);
                  const origen  = paras[0]?.destino?.nombre ?? '—';
                  const destino = paras[paras.length - 1]?.destino?.nombre ?? '—';
                  return (
                    <button key={r.id} type="button" onClick={() => f('rutaId', r.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                        form.rutaId === r.id
                          ? 'border-[#0f1b2d] bg-[#0f1b2d]/5 ring-1 ring-[#0f1b2d]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="w-8 h-8 rounded-lg bg-[#0f1b2d]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Route size={14} className="text-[#0f1b2d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          <MapPin size={9} className="inline mr-0.5" />
                          {origen} → {destino}
                          {r.paradas.length > 2 && ` · ${r.paradas.length} paradas`}
                        </p>
                      </div>
                      {form.rutaId === r.id && (
                        <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <input type="text" required value={form.rutaId} onChange={() => {}} className="sr-only" tabIndex={-1} />
            </div>

            {/* Dates */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Calendar size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Fechas del viaje</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Salida</label>
                  <input type="date" required value={form.fechaSalida}
                    onChange={(e) => f('fechaSalida', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Regreso
                    {rutaSeleccionada?.duracionDias && (
                      <span className="ml-1 text-[#0f1b2d]/50 font-normal normal-case">
                        (auto: {rutaSeleccionada.duracionDias}d)
                      </span>
                    )}
                  </label>
                  <input type="date" required value={form.fechaRegreso} min={form.fechaSalida}
                    onChange={(e) => f('fechaRegreso', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Notas internas <span className="text-gray-400 font-normal">(opcional)</span>
                </h2>
              </div>
              <textarea rows={3} placeholder="Chofer, unidad, itinerario..."
                value={form.notas} onChange={(e) => f('notas', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition resize-none" />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Capacity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Cupo total</h2>
              </div>
              <div className="relative">
                <Users size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" required min="1" placeholder="Ej: 45"
                  value={form.cupoTotal} onChange={(e) => f('cupoTotal', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
              </div>
              {rutaSeleccionada?.cupoDefault && (
                <p className="text-[11px] text-gray-400 mt-2">
                  Predeterminado de la ruta: {rutaSeleccionada.cupoDefault} lugares
                </p>
              )}
            </div>

            {/* ── Precios editables por parada USA ── */}
            {rutaSeleccionada && precios.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <DollarSign size={13} className="text-gray-500" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700">Precios por tramo</h2>
                </div>
                <p className="text-[10px] text-gray-400 mb-4 ml-9">
                  Pre-llenados desde la ruta. Ajústalos si esta salida tiene precio diferente.
                </p>

                {loadingPrecios ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {precios.map((p, idx) => (
                      <div key={p.paradaId} className={`rounded-xl border p-3 ${
                        p.isOrigen ? 'border-[#0f1b2d]/20 bg-[#0f1b2d]/[0.02]' :
                        p.isUSA    ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0 ${
                            p.isOrigen ? 'bg-[#0f1b2d] text-white' :
                            p.isUSA    ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium text-gray-700">{p.nombre}</span>
                          {p.isOrigen && (
                            <span className="text-[9px] font-bold text-[#0f1b2d]/60 bg-[#0f1b2d]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Origen
                            </span>
                          )}
                          {p.isUSA && !p.isOrigen && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              🇺🇸 USA
                            </span>
                          )}
                        </div>

                        {!p.isOrigen && p.isUSA && (
                          <div className="flex items-center gap-2 mt-2 ml-7">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                              <input type="number" required min="0" step="0.01"
                                placeholder="USD" value={p.precioUSD}
                                onChange={e => updatePrecio(idx, e.target.value)}
                                className="w-full border border-blue-200 rounded-lg pl-5 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button type="submit"
              disabled={loading || !form.rutaId || !preciosCompletos}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-40 transition-colors shadow-sm">
              {loading ? 'Creando salida...' : 'Crear salida'}
            </button>

            {!preciosCompletos && form.rutaId && (
              <p className="text-xs text-amber-600 flex items-start gap-1.5">
                <Info size={11} className="flex-shrink-0 mt-0.5" />
                Completa todos los precios USD para habilitar el botón.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
