'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Zap, Route, Calendar, Users,
  CheckCircle, MapPin, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';

interface RutaParada {
  orden: number;
  destino: { nombre: string };
}

interface Ruta {
  id: string;
  nombre: string;
  diasSemana: number[];
  duracionDias: number;
  cupoDefault: number;
  paradas: RutaParada[];
}

const DIAS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function GenerarSalidasPage() {
  const router = useRouter();
  const [rutas, setRutas]       = useState<Ruta[]>([]);
  const [rutaId, setRutaId]     = useState('');
  const [fechaInicio, setInicio] = useState('');
  const [fechaFin, setFin]       = useState('');
  const [cupo, setCupo]          = useState('');
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState('');
  const [resultado, setResultado] = useState<{ creadas: number } | null>(null);

  useEffect(() => {
    api.get('/rutas').then(({ data }) => setRutas(data));
  }, []);

  const ruta = rutas.find(r => r.id === rutaId);

  /* Preview count — how many dates match */
  const previewCount = (() => {
    if (!ruta || !fechaInicio || !fechaFin || !ruta.diasSemana?.length) return null;
    let count = 0;
    const cur = new Date(fechaInicio + 'T12:00:00');
    const fin = new Date(fechaFin + 'T12:00:00');
    while (cur <= fin) {
      if (ruta.diasSemana.includes(cur.getDay())) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  })();

  /* Auto-fill cupo when route is selected */
  useEffect(() => {
    if (ruta?.cupoDefault) setCupo(String(ruta.cupoDefault));
  }, [rutaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewCount) { setError('No hay fechas que coincidan con los días configurados.'); return; }
    if (!confirm(`¿Generar ${previewCount} salida(s)?`)) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/salidas/generar', {
        rutaId,
        fechaInicio,
        fechaFin,
        ...(cupo ? { cupoTotal: parseInt(cupo) } : {}),
      });
      setResultado({ creadas: data.creadas });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al generar salidas');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (resultado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">¡Salidas generadas!</h2>
          <p className="text-sm text-gray-400 mb-8">
            Se crearon <span className="font-semibold text-gray-700">{resultado.creadas}</span> salidas con sus tarifas predeterminadas.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/salidas')}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: '#0f1b2d', color: '#fff' }}
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={16} />
                <div className="text-left">
                  <p>Ver salidas</p>
                  <p className="text-xs font-normal opacity-60">Todas las salidas programadas</p>
                </div>
              </div>
              <ChevronRight size={15} className="opacity-60" />
            </button>
            <button
              onClick={() => { setResultado(null); setRutaId(''); setInicio(''); setFin(''); }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Generar más salidas
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Generar salidas</h1>
            <p className="text-sm text-gray-400">Crea múltiples salidas automáticamente según los días configurados en la ruta</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-4xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left ── */}
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
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {rutas.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No hay rutas configuradas.</p>
                )}
                {rutas.map((r) => {
                  const paras   = [...r.paradas].sort((a, b) => a.orden - b.orden);
                  const origen  = paras[0]?.destino?.nombre ?? '—';
                  const destino = paras[paras.length - 1]?.destino?.nombre ?? '—';
                  const sinDias = !r.diasSemana?.length;
                  return (
                    <button key={r.id} type="button"
                      onClick={() => !sinDias && setRutaId(r.id)}
                      disabled={sinDias}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                        rutaId === r.id
                          ? 'border-[#0f1b2d] bg-[#0f1b2d]/5 ring-1 ring-[#0f1b2d]'
                          : sinDias
                          ? 'border-gray-100 opacity-40 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="w-8 h-8 rounded-lg bg-[#0f1b2d]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Route size={14} className="text-[#0f1b2d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <MapPin size={9} className="inline mr-0.5" />
                          {origen} → {destino}
                        </p>
                        {sinDias ? (
                          <p className="text-[10px] text-amber-600 mt-1">Sin días configurados — edita la ruta primero</p>
                        ) : (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {r.diasSemana.map(d => DIAS_LABELS[d]).join(', ')} · {r.duracionDias}d · {r.cupoDefault} lugares
                          </p>
                        )}
                      </div>
                      {rutaId === r.id && (
                        <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <input type="text" required value={rutaId} onChange={() => {}} className="sr-only" tabIndex={-1} />
            </div>

            {/* Date range */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Calendar size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Rango de fechas</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Desde</label>
                  <input type="date" required value={fechaInicio}
                    onChange={e => setInicio(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Hasta</label>
                  <input type="date" required value={fechaFin} min={fechaInicio}
                    onChange={e => setFin(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Cupo override */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Cupo por salida</h2>
              </div>
              <div className="relative">
                <Users size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" min="1" placeholder="Ej: 45"
                  value={cupo} onChange={e => setCupo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Deja vacío para usar el predeterminado de la ruta.</p>
            </div>

            {/* Preview */}
            {ruta && fechaInicio && fechaFin && (
              <div className={`rounded-2xl border p-5 ${
                previewCount === 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-[#0f1b2d]/20 bg-[#0f1b2d]/[0.03]'
              }`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vista previa</p>
                {previewCount === 0 ? (
                  <p className="text-sm text-amber-700">
                    Ninguna fecha en este rango cae en los días configurados
                    ({ruta.diasSemana.map(d => DIAS_LABELS[d]).join(', ')}).
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-[#0f1b2d]">{previewCount}</p>
                    <p className="text-sm text-gray-500 mt-0.5">salidas a crear</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Días: {ruta.diasSemana.map(d => DIAS_LABELS[d]).join(', ')}
                      {' · '}{ruta.duracionDias}d de duración
                    </p>
                  </>
                )}
              </div>
            )}

            <button type="submit"
              disabled={loading || !rutaId || !fechaInicio || !fechaFin || previewCount === 0}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Zap size={15} />
              {loading ? 'Generando...' : `Generar${previewCount ? ` ${previewCount} salidas` : ''}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
