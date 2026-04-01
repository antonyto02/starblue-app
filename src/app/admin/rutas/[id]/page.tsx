'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, MapPin,
  GripVertical, Save, CheckCircle, Clock, Users,
} from 'lucide-react';
import api from '@/lib/api';

interface Destino {
  id: string;
  nombre: string;
  pais: string;
  direccionAbordaje: string | null;
}

interface ParadaForm {
  id?: string;
  destinoId: string;
  orden: number;
  precioUSD: string;
  destino?: Destino;
}

interface Tarifa {
  id: string;
  paradaOrigenId: string;
  paradaDestinoId: string;
  precioUSD: number;
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

const cardStyle = {
  background: 'var(--admin-surface)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)',
};

const inputStyle = {
  border: '1px solid var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text-primary)',
};

export default function EditarRutaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [nombre, setNombre]           = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [paradas, setParadas]         = useState<ParadaForm[]>([]);
  const [destinos, setDestinos]       = useState<Destino[]>([]);
  const [diasSemana, setDiasSemana]   = useState<number[]>([]);
  const [duracionDias, setDuracion]   = useState('1');
  const [cupoDefault, setCupo]        = useState('45');
  const [original, setOriginal]       = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  const isDirty = useMemo(() => {
    if (!original) return false;
    const current = JSON.stringify({
      nombre, descripcion,
      diasSemana: [...diasSemana].sort((a, b) => a - b),
      duracionDias, cupoDefault,
      paradas: paradas.map(p => ({ destinoId: p.destinoId, precioUSD: p.precioUSD })),
    });
    return current !== JSON.stringify(original);
  }, [nombre, descripcion, diasSemana, duracionDias, cupoDefault, paradas, original]);

  useEffect(() => {
    api.get('/destinos/admin/todos').then(r => setDestinos(r.data));
    fetchRuta();
  }, [id]);

  const fetchRuta = async () => {
    const [rutaRes, tarifasRes] = await Promise.all([
      api.get(`/rutas/${id}`),
      api.get(`/rutas/${id}/tarifas`),
    ]);
    const ruta = rutaRes.data;
    const tarifas: Tarifa[] = tarifasRes.data;
    const sortedParadas = [...ruta.paradas].sort((a: any, b: any) => a.orden - b.orden);
    const origenId = sortedParadas[0]?.id;

    const nombre_     = ruta.nombre;
    const desc_       = ruta.descripcion ?? '';
    const dias_       = ruta.diasSemana ?? [];
    const duracion_   = String(ruta.duracionDias ?? 1);
    const cupo_       = String(ruta.cupoDefault ?? 45);
    const paradasList = sortedParadas.map((p: any, idx: number) => {
      const tarifa = idx > 0
        ? tarifas.find(t => t.paradaOrigenId === origenId && t.paradaDestinoId === p.id)
        : null;
      return {
        id: p.id,
        destinoId: p.destinoId,
        orden: p.orden,
        precioUSD: tarifa ? String(tarifa.precioUSD) : '',
        destino: p.destino,
      };
    });

    setNombre(nombre_);
    setDescripcion(desc_);
    setDiasSemana(dias_);
    setDuracion(duracion_);
    setCupo(cupo_);
    setParadas(paradasList);
    setOriginal({
      nombre: nombre_, descripcion: desc_,
      diasSemana: [...dias_].sort(), duracionDias: duracion_, cupoDefault: cupo_,
      paradas: paradasList.map(p => ({ destinoId: p.destinoId, precioUSD: p.precioUSD })),
    });
  };

  const agregarParada = () =>
    setParadas(prev => [...prev, { destinoId: '', orden: prev.length + 1, precioUSD: '' }]);

  const eliminarParada = (idx: number) =>
    setParadas(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, orden: i + 1 })));

  const updateParada = (idx: number, field: keyof ParadaForm, value: string) =>
    setParadas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    for (let i = 0; i < paradas.length; i++) {
      const esUSA = destinos.find(d => d.id === paradas[i].destinoId)?.pais === 'USA';
      if (esUSA && !paradas[i].precioUSD) {
        setError(`La parada ${i + 1} (USA) requiere precio en USD.`);
        setLoading(false);
        return;
      }
    }
    try {
      await api.put(`/rutas/${id}`, {
        nombre, descripcion,
        diasSemana,
        duracionDias: parseInt(duracionDias) || 1,
        cupoDefault:  parseInt(cupoDefault)  || 45,
        paradas: paradas.map(p => ({
          destinoId: p.destinoId,
          orden: p.orden,
          ...(p.precioUSD ? { precioUSD: parseFloat(p.precioUSD) } : {}),
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setOriginal({
        nombre, descripcion,
        diasSemana: [...diasSemana].sort(), duracionDias, cupoDefault,
        paradas: paradas.map(p => ({ destinoId: p.destinoId, precioUSD: p.precioUSD })),
      });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const usados = paradas.map(p => p.destinoId).filter(Boolean);

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
            href="/admin/rutas"
            className="inline-flex items-center gap-1.5 text-xs mb-2 transition-colors"
            style={{ color: 'var(--admin-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
          >
            <ArrowLeft size={12} /> Rutas
          </Link>
          <h1
            className="text-[38px] font-bold tracking-tight"
            style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
          >
            {nombre || 'Editar ruta'}
          </h1>
        </div>

        {/* Save — solo aparece cuando hay cambios */}
        {isDirty && (
          <button
            form="ruta-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all mb-1"
            style={{ background: 'var(--admin-text-primary)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
          >
            <Save size={12} /> {loading ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>

      {/* Content */}
      <form id="ruta-form" onSubmit={handleSubmit} className="flex-1 overflow-hidden min-h-0">

        {/* Scrollable cards */}
        <div className="h-full flex flex-col gap-4 overflow-y-auto">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Info + Programación en una fila */}
          <div className="grid grid-cols-2 gap-4">

            {/* Info */}
            <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>Información</label>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>Nombre</label>
                <input
                  required type="text" value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>
                  Descripción <span style={{ color: 'var(--admin-text-tertiary)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  rows={3} value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition resize-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Programación */}
            <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>Programación y capacidad</label>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--admin-text-secondary)' }}>Días de salida</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS.map(d => {
                    const activo = diasSemana.includes(d.value);
                    return (
                      <button key={d.value} type="button"
                        onClick={() => setDiasSemana(prev =>
                          activo ? prev.filter(x => x !== d.value) : [...prev, d.value]
                        )}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: activo ? 'var(--admin-text-primary)' : 'var(--admin-bg)',
                          color: activo ? '#fff' : 'var(--admin-text-secondary)',
                          border: `1px solid ${activo ? 'transparent' : 'var(--admin-border)'}`,
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>Duración (días)</label>
                  <div className="relative">
                    <Clock size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
                    <input type="number" min="1" max="30" value={duracionDias}
                      onChange={e => setDuracion(e.target.value)}
                      className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition"
                      style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-secondary)' }}>Cupo</label>
                  <div className="relative">
                    <Users size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
                    <input type="number" min="1" max="100" value={cupoDefault}
                      onChange={e => setCupo(e.target.value)}
                      className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition"
                      style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Paradas */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
                Paradas <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({paradas.length})</span>
              </label>
              <button type="button" onClick={agregarParada}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border)' }}>
                <Plus size={12} /> Agregar parada
              </button>
            </div>

            <div className="space-y-2.5">
              {paradas.map((p, idx) => {
                const destinoInfo = destinos.find(d => d.id === p.destinoId) ?? p.destino;
                const esUSA = destinoInfo?.pais === 'USA';
                return (
                  <div key={idx} className="rounded-xl p-3" style={{
                    border: `1px solid ${esUSA ? 'rgba(59,130,246,0.3)' : 'var(--admin-border)'}`,
                    background: esUSA ? 'rgba(59,130,246,0.04)' : 'var(--admin-bg)',
                  }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical size={14} style={{ color: 'var(--admin-text-tertiary)', flexShrink: 0 }} />
                      <span className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: esUSA ? 'rgba(59,130,246,0.8)' : 'var(--admin-border)', color: esUSA ? '#fff' : 'var(--admin-text-secondary)' }}>
                        {idx + 1}
                      </span>
                      <select
                        required value={p.destinoId}
                        onChange={e => updateParada(idx, 'destinoId', e.target.value)}
                        className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                        style={inputStyle}
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
                      {paradas.length > 2 && (
                        <button type="button" onClick={() => eliminarParada(idx)}
                          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ color: 'var(--admin-text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    {esUSA && (
                      <div className="flex items-center gap-3 mt-2.5 ml-12">
                        <div className="relative w-36">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--admin-text-tertiary)' }}>$</span>
                          <input
                            type="number" required min="0" step="0.01"
                            placeholder="Precio USD" value={p.precioUSD}
                            onChange={e => updateParada(idx, 'precioUSD', e.target.value)}
                            className="w-full rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none transition"
                            style={{ border: '1px solid rgba(59,130,246,0.4)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
                          />
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>Desde cualquier ciudad de México</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={agregarParada}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
            >
              <Plus size={13} /> Agregar otra parada
            </button>
          </div>

          {/* Danger zone — al final del scroll */}
          <div className="rounded-2xl p-5" style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ef4444' }}>Zona de peligro</p>
            <button type="button"
              onClick={async () => {
                if (!confirm('¿Eliminar esta ruta y todas sus tarifas?')) return;
                await api.delete(`/rutas/${id}`);
                router.push('/admin/rutas');
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Trash2 size={13} /> Eliminar ruta
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
