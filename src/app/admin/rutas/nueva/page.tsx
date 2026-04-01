'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Route, Plus, Trash2, MapPin, GripVertical, FileText, CheckCircle, ArrowRight, Clock, Users } from 'lucide-react';
import api from '@/lib/api';

interface Destino {
  id: string;
  nombre: string;
  pais: string;
  direccionAbordaje: string | null;
}

interface Parada {
  destinoId: string;
  orden: number;
  precioUSD: string;
}

const DIAS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

const paradaVacia = (orden: number): Parada => ({
  destinoId: '', orden, precioUSD: '',
});

export default function NuevaRutaPage() {
  const router = useRouter();
  const [nombre, setNombre]           = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [paradas, setParadas]         = useState<Parada[]>([paradaVacia(1), paradaVacia(2)]);
  const [destinos, setDestinos]       = useState<Destino[]>([]);
  const [diasSemana, setDiasSemana]   = useState<number[]>([]);
  const [duracionDias, setDuracion]   = useState('1');
  const [cupoDefault, setCupo]        = useState('45');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [creada, setCreada]           = useState<{ id: string; nombre: string } | null>(null);
  const [countdown, setCountdown]     = useState(4);

  useEffect(() => {
    api.get('/destinos/admin/todos').then(r => setDestinos(r.data));
  }, []);

  useEffect(() => {
    if (!creada) return;
    const t = setInterval(() => { setCountdown(c => c - 1); }, 1000);
    return () => clearInterval(t);
  }, [creada]);

  useEffect(() => {
    if (creada && countdown <= 0) router.push('/admin/rutas');
  }, [countdown, creada, router]);

  const agregarParada = () =>
    setParadas(prev => [...prev, paradaVacia(prev.length + 1)]);

  const eliminarParada = (idx: number) =>
    setParadas(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, orden: i + 1 })));

  const updateParada = (idx: number, field: keyof Parada, value: string) =>
    setParadas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate: USA stops must have a price
    for (let i = 0; i < paradas.length; i++) {
      const esUSA = destinos.find(d => d.id === paradas[i].destinoId)?.pais === 'USA';
      if (esUSA && !paradas[i].precioUSD) {
        setError(`La parada ${i + 1} (USA) requiere precio en USD.`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        nombre,
        descripcion,
        diasSemana,
        duracionDias: parseInt(duracionDias) || 1,
        cupoDefault:  parseInt(cupoDefault)  || 45,
        paradas: paradas.map((p) => ({
          destinoId: p.destinoId,
          orden: p.orden,
          ...(p.precioUSD ? { precioUSD: parseFloat(p.precioUSD) } : {}),
        })),
      };
      const { data } = await api.post('/rutas', payload);
      setCreada({ id: data.id, nombre: data.nombre });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear la ruta');
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
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">¡Ruta creada!</h2>
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-semibold text-gray-600">{creada.nombre}</span> con paradas y precios configurados.
          </p>
          <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-8">
            ✅ Los precios predeterminados ya están listos. Se copiarán automáticamente al crear salidas.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/admin/rutas/${creada.id}`)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: '#0f1b2d', color: '#fff' }}
            >
              <div className="flex items-center gap-2.5">
                <Route size={16} />
                <div className="text-left">
                  <p>Ver ruta</p>
                  <p className="text-xs font-normal opacity-60">Revisar paradas y precios</p>
                </div>
              </div>
              <ArrowRight size={15} className="opacity-60" />
            </button>

            <Link
              href="/admin/rutas"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ver todas las rutas
            </Link>
          </div>

          <p className="text-xs text-gray-300 mt-6">Redirigiendo en {countdown}s...</p>
        </div>
      </div>
    );
  }

  const usados = paradas.map(p => p.destinoId).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <Link
          href="/admin/rutas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft size={15} />
          Volver a rutas
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0f1b2d] rounded-xl flex items-center justify-center">
            <Route size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva ruta</h1>
            <p className="text-sm text-gray-400">Define las paradas y precios por tramo.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {destinos.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
              No hay destinos creados aún. <Link href="/admin/destinos/nuevo" className="font-semibold underline">Crea destinos primero</Link> antes de configurar una ruta.
            </div>
          )}

          {/* Datos generales */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText size={13} className="text-gray-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700">Información de la ruta</h2>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Nombre</label>
              <input
                required type="text"
                placeholder="Ej: Zacatecas → Salt Lake City"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Descripción <span className="text-gray-400 font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Descripción breve de la ruta..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition resize-none"
              />
            </div>
          </div>

          {/* Horario y capacidad */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock size={13} className="text-gray-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700">Programación y capacidad</h2>
            </div>

            {/* Días de la semana */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Días de salida <span className="text-gray-400 font-normal normal-case">(selecciona los que aplican)</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS.map(d => {
                  const activo = diasSemana.includes(d.value);
                  return (
                    <button key={d.value} type="button"
                      onClick={() => setDiasSemana(prev =>
                        activo ? prev.filter(x => x !== d.value) : [...prev, d.value]
                      )}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        activo
                          ? 'bg-[#0f1b2d] text-white border-[#0f1b2d]'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Duración del viaje <span className="text-gray-400 font-normal normal-case">(días)</span>
                </label>
                <div className="relative">
                  <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="1" max="30" value={duracionDias}
                    onChange={e => setDuracion(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Cupo predeterminado
                </label>
                <div className="relative">
                  <Users size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="1" max="100" value={cupoDefault}
                    onChange={e => setCupo(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition" />
                </div>
              </div>
            </div>
          </div>

          {/* Paradas con precios inline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Paradas y precios <span className="text-gray-400 font-normal">({paradas.length})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={agregarParada}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0f1b2d] border border-[#0f1b2d]/20 hover:bg-[#0f1b2d]/5 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus size={13} /> Agregar parada
              </button>
            </div>

            <div className="space-y-3">
              {paradas.map((p, idx) => {
                const destinoInfo = destinos.find(d => d.id === p.destinoId);
                const esUSA = destinoInfo?.pais === 'USA';
                return (
                  <div key={idx} className={`rounded-xl border p-3 ${
                    esUSA ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                      <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                        esUSA ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <select
                        required
                        value={p.destinoId}
                        onChange={e => updateParada(idx, 'destinoId', e.target.value)}
                        className="flex-1 min-w-0 w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                      >
                        <option value="">— Selecciona un destino —</option>
                        <optgroup label="🇲🇽 México">
                          {destinos.filter(d => d.pais !== 'USA').map(d => (
                            <option key={d.id} value={d.id} disabled={usados.includes(d.id) && p.destinoId !== d.id}>
                              {d.nombre}{d.direccionAbordaje ? ` · ${d.direccionAbordaje}` : ''}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🇺🇸 Estados Unidos">
                          {destinos.filter(d => d.pais === 'USA').map(d => (
                            <option key={d.id} value={d.id} disabled={usados.includes(d.id) && p.destinoId !== d.id}>
                              {d.nombre}{d.direccionAbordaje ? ` · ${d.direccionAbordaje}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {esUSA && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg uppercase tracking-wider flex-shrink-0">
                          🇺🇸 USA
                        </span>
                      )}
                      {paradas.length > 2 && (
                        <button type="button" onClick={() => eliminarParada(idx)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Precio — solo para paradas USA */}
                    {esUSA && (
                      <div className="flex items-center gap-3 mt-2.5 ml-[52px]">
                        <div className="relative w-40">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                          <input
                            type="number" required min="0" step="0.01"
                            placeholder="Precio USD"
                            value={p.precioUSD}
                            onChange={e => updateParada(idx, 'precioUSD', e.target.value)}
                            className="w-full border border-blue-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Precio desde cualquier ciudad de México
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={agregarParada}
              className="mt-4 w-full border border-dashed border-gray-300 text-gray-400 hover:text-[#0f1b2d] hover:border-[#0f1b2d]/30 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Agregar otra parada
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || destinos.length === 0}
            className="w-full bg-[#0f1b2d] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-40 transition-colors shadow-sm"
          >
            {loading ? 'Creando ruta...' : 'Crear ruta'}
          </button>

        </div>
      </form>
    </div>
  );
}
