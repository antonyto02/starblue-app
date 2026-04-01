'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { invalidateConfig } from '@/lib/useConfig';
import {
  Plus, Trash2, Eye, EyeOff, X, ImageOff,
  ChevronLeft, ChevronRight, Pencil, Check,
  Calendar, Users, GripVertical, Save, Pin,
} from 'lucide-react';
import Image from 'next/image';
import BannerCarousel from '@/components/BannerCarousel';
import CardCarousel from '@/components/CardCarousel';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Tipos ──────────────────────────────────────────────────────────────────

type TipoSeccion = 'BANNER' | 'DESTACADOS' | 'PROXIMAS_SALIDAS' | 'PERSONALIZADA';

interface ImagenGaleria {
  id: string;
  url: string;
  orden: number;
}

interface DestinoEnSeccion {
  id: string;
  destinoId: string;
  orden: number;
  destino: { id: string; nombre: string; descripcion: string; imagenPortada: string | null; galeria: ImagenGaleria[] };
}

const primeraFotoGaleria = (galeria: ImagenGaleria[]) =>
  [...galeria].sort((a, b) => a.orden - b.orden)[0]?.url ?? null;

interface Seccion {
  id: string;
  titulo: string;
  tipo: TipoSeccion;
  orden: number;
  activo: boolean;
  destinos: DestinoEnSeccion[];
}

interface Destino {
  id: string;
  nombre: string;
  imagenPortada: string | null;
  galeria: ImagenGaleria[];
}

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  ruta: {
    nombre: string;
    paradas: { orden: number; destino?: { nombre: string; imagenPortada: string | null; galeria: ImagenGaleria[] } }[];
  };
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

// ── Constantes ─────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<TipoSeccion, string> = {
  BANNER:          'bg-rose-100 text-rose-700 border-rose-200',
  DESTACADOS:      'bg-amber-100 text-amber-700 border-amber-200',
  PROXIMAS_SALIDAS:'bg-blue-100 text-blue-700 border-blue-200',
  PERSONALIZADA:   'bg-purple-100 text-purple-700 border-purple-200',
};

const TIPO_LABELS: Record<TipoSeccion, string> = {
  BANNER:          'Banner',
  DESTACADOS:      'Destacados',
  PROXIMAS_SALIDAS:'Próximas Salidas',
  PERSONALIZADA:   'Personalizada',
};

const esFija = (tipo: TipoSeccion) => tipo !== 'PERSONALIZADA';

// ── SortableWrapper ────────────────────────────────────────────────────────

function SortableWrapper({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-none"
      title="Arrastrar para reordenar"
    >
      <GripVertical size={16} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50 z-50 relative' : ''}
    >
      {children(handle)}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function AdminInicioPage() {
  const [secciones, setSecciones]             = useState<Seccion[]>([]);
  const [destinos, setDestinos]               = useState<Destino[]>([]);
  const [salidas, setSalidas]                 = useState<Salida[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [ordenModificado, setOrdenModificado] = useState(false);
  const [guardandoOrden, setGuardandoOrden]   = useState(false);
  const [showNueva, setShowNueva]             = useState(false);
  const [pickerSeccionId, setPickerSeccionId] = useState<string | null>(null);
  const [nueva, setNueva]                     = useState({ titulo: '' });
  const [creando, setCreando]                 = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editTitle, setEditTitle]             = useState('');

  // Tipo de cambio
  const [tipoCambio, setTipoCambio]       = useState('');
  const [savingTC, setSavingTC]           = useState(false);
  const [savedTC, setSavedTC]             = useState(false);

  // Actualiza una sección en la lista sin cambiar el orden visual
  const patchSeccion = useCallback((updated: Seccion) => {
    setSecciones((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/home/secciones').then((r) => setSecciones(r.data)),
      api.get('/destinos').then((r) => setDestinos(r.data)),
      api.get('/salidas/proximas').then((r) => setSalidas(r.data)),
      api.get('/config').then((r) => setTipoCambio(r.data.tipo_cambio ?? '20')),
    ]).finally(() => setLoading(false));
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

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSecciones((prev) => {
      const banner   = prev.find((s) => s.tipo === 'BANNER');
      const noFijas  = prev.filter((s) => s.tipo !== 'BANNER');
      const oldIdx   = noFijas.findIndex((s) => s.id === active.id);
      const newIdx   = noFijas.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(noFijas, oldIdx, newIdx);
      return [banner, ...reordered].filter(Boolean) as Seccion[];
    });
    setOrdenModificado(true);
  };

  const guardarOrden = async () => {
    setGuardandoOrden(true);
    const noFijas = secciones.filter((s) => s.tipo !== 'BANNER');
    const orden = noFijas.map((s, i) => ({ id: s.id, orden: i + 1 }));
    await api.put('/home/secciones/orden', { orden });
    setOrdenModificado(false);
    setGuardandoOrden(false);
  };

  // ── Acciones de sección ──────────────────────────────────────────────────

  const crearSeccion = async () => {
    if (!nueva.titulo.trim()) return;
    setCreando(true);
    await api.post('/home/secciones', { titulo: nueva.titulo, tipo: 'PERSONALIZADA' });
    const res = await api.get('/home/secciones');
    setSecciones(res.data);
    setNueva({ titulo: '' });
    setShowNueva(false);
    setCreando(false);
  };

  const toggleActivo = async (s: Seccion) => {
    const res = await api.put(`/home/secciones/${s.id}`, { activo: !s.activo });
    patchSeccion(res.data);
  };

  const eliminarSeccion = async (id: string) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    await api.delete(`/home/secciones/${id}`);
    setSecciones((prev) => prev.filter((s) => s.id !== id));
  };

  const guardarTitulo = async (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    const res = await api.put(`/home/secciones/${id}`, { titulo: editTitle });
    patchSeccion(res.data);
    setEditingId(null);
  };

  // ── Acciones de destinos ─────────────────────────────────────────────────

  const addDestino = async (seccionId: string, destinoId: string) => {
    const res = await api.post(`/home/secciones/${seccionId}/destinos`, { destinoId });
    patchSeccion(res.data);
    setPickerSeccionId(null);
  };

  const removeDestino = async (seccionId: string, destinoId: string) => {
    const res = await api.delete(`/home/secciones/${seccionId}/destinos/${destinoId}`);
    patchSeccion(res.data);
  };

  const moverDestino = async (seccion: Seccion, index: number, dir: -1 | 1) => {
    const items = [...seccion.destinos].sort((a, b) => a.orden - b.orden);
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    const orden = items.map((d, i) => ({ id: d.id, orden: i }));
    const res = await api.put(`/home/secciones/${seccion.id}/destinos/orden`, { orden });
    patchSeccion(res.data);
  };

  const destinosDisponibles = (seccion: Seccion) => {
    const ids = new Set(seccion.destinos.map((d) => d.destinoId));
    return destinos.filter((d) => !ids.has(d.id));
  };

  // ── Render de una sección (barra + contenido) ────────────────────────────

  const renderSeccion = (seccion: Seccion, dragHandle: React.ReactNode) => {
    const sortedDestinos = [...(seccion.destinos ?? [])].sort((a, b) => a.orden - b.orden);

    return (
      <div
        className={`rounded-2xl border-2 transition-all ${
          seccion.activo ? 'border-transparent hover:border-[#0f1b2d]/15' : 'border-dashed border-gray-300'
        }`}
      >
        {/* ── Barra de control ── */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-gray-200 rounded-t-xl px-3 py-2 shadow-sm">

          {/* Handle / Pin */}
          {seccion.tipo === 'BANNER' ? (
            <span title="El banner siempre está fijo arriba" className="p-1.5 text-gray-300 cursor-default">
              <Pin size={14} />
            </span>
          ) : (
            dragHandle
          )}

          <div className="w-px h-4 bg-gray-200" />

          {/* Título editable */}
          {editingId === seccion.id ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') guardarTitulo(seccion.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 text-sm font-semibold text-gray-900 border-b-2 border-[#0f1b2d] outline-none bg-transparent"
                autoFocus
              />
              <button onClick={() => guardarTitulo(seccion.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
              <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingId(seccion.id); setEditTitle(seccion.titulo); }}
              className="flex items-center gap-1.5 flex-1 min-w-0 group/title"
              title="Clic para editar título"
            >
              <span className="text-sm font-semibold text-gray-900 truncate">{seccion.titulo}</span>
              <Pencil size={11} className="text-gray-300 group-hover/title:text-gray-500 flex-shrink-0 transition-colors" />
            </button>
          )}

          {/* Badges */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${TIPO_COLORS[seccion.tipo]}`}>
            {TIPO_LABELS[seccion.tipo]}
          </span>
          {esFija(seccion.tipo) && (
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">Fija</span>
          )}

          <div className="w-px h-4 bg-gray-200" />

          {/* Acciones */}
          <button
            onClick={() => toggleActivo(seccion)}
            title={seccion.activo ? 'Ocultar sección' : 'Mostrar sección'}
            className={`p-1.5 rounded-lg transition-colors ${seccion.activo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            {seccion.activo ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          {seccion.tipo !== 'PROXIMAS_SALIDAS' && (
            <button
              onClick={() => setPickerSeccionId(seccion.id)}
              title="Agregar destino"
              className="p-1.5 rounded-lg text-[#0f1b2d] hover:bg-[#0f1b2d]/10 transition-colors"
            >
              <Plus size={15} />
            </button>
          )}
          {!esFija(seccion.tipo) && (
            <button
              onClick={() => eliminarSeccion(seccion.id)}
              title="Eliminar sección"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* ── Contenido según tipo ── */}
        <div className={`rounded-b-xl overflow-hidden transition-opacity ${!seccion.activo ? 'opacity-40' : ''}`}>

          {/* BANNER */}
          {seccion.tipo === 'BANNER' && (
            <div>
              <div className="relative">
                <BannerCarousel
                  slides={sortedDestinos.map((sd) => ({ ...sd.destino }))}
                  height="h-72"
                  autoplay
                  interval={4000}
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-lg">
                  Vista previa del banner
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Slides del banner</p>
                {sortedDestinos.length === 0 && (
                  <p className="text-sm text-gray-400 mb-3">Sin slides. Usa el botón &ldquo;+&rdquo; para agregar destinos.</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {sortedDestinos.map((sd, dIdx) => (
                    <div key={sd.id} className="relative group/slide flex flex-col items-center gap-1">
                      <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-gray-200">
                        {sd.destino.imagenPortada
                          ? <Image src={sd.destino.imagenPortada} alt={sd.destino.nombre} fill className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageOff size={14} className="text-gray-400" /></div>}
                        <div className="absolute inset-0 bg-black/0 group-hover/slide:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover/slide:opacity-100">
                          <button onClick={() => moverDestino(seccion, dIdx, -1)} disabled={dIdx === 0} className="p-1 bg-white/90 rounded text-gray-700 disabled:opacity-30"><ChevronLeft size={11} /></button>
                          <button onClick={() => moverDestino(seccion, dIdx, 1)} disabled={dIdx === sortedDestinos.length - 1} className="p-1 bg-white/90 rounded text-gray-700 disabled:opacity-30"><ChevronRight size={11} /></button>
                        </div>
                        <button onClick={() => removeDestino(seccion.id, sd.destinoId)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/slide:opacity-100 transition-opacity"><X size={9} /></button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">#{dIdx + 1}</span>
                      </div>
                      <span className="text-xs text-gray-500 max-w-[96px] truncate text-center">{sd.destino.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROXIMAS_SALIDAS */}
          {seccion.tipo === 'PROXIMAS_SALIDAS' && (
            <div className="bg-gray-50 px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{seccion.titulo}</h2>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
                  <Calendar size={13} className="text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">Automático — gestionar en Salidas</span>
                </div>
              </div>
              {salidas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No hay próximas salidas. Crea una desde la sección Salidas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pointer-events-none select-none">
                  {salidas.map((s) => {
                    const paradas = [...(s.ruta?.paradas ?? [])].sort((a, b) => a.orden - b.orden);
                    const primera = paradas[0]?.destino;
                    const imagenes = primera
                      ? [...(primera.galeria ?? [])].sort((a, b) => a.orden - b.orden).map(g => g.url)
                          .concat(primera.imagenPortada ? [primera.imagenPortada] : [])
                      : [];
                    return (
                      <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="relative w-full aspect-video bg-gray-100">
                          <CardCarousel
                            images={imagenes.filter(Boolean)}
                            alt={s.ruta?.nombre ?? 'Viaje'}
                          />
                          <div className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full z-10 bg-[#0f1b2d] text-white">
                            {s.cupoTotal} asientos
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 mb-2">{s.ruta?.nombre}</h3>
                          <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                            <Calendar size={13} />
                            <span>{formatFecha(s.fechaSalida)} — {formatFecha(s.fechaRegreso)}</span>
                          </div>
                          <p className="text-[#0f1b2d] font-bold text-xl">${Number(s.precio).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DESTACADOS / PERSONALIZADA */}
          {(seccion.tipo === 'DESTACADOS' || seccion.tipo === 'PERSONALIZADA') && (
            <div className="bg-gray-50 px-6 py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{seccion.titulo}</h2>
              {sortedDestinos.length === 0 && (
                <p className="text-sm text-gray-400 mb-4">Sin destinos. Usa el botón &ldquo;+&rdquo; para agregar.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedDestinos.map((sd, dIdx) => {
                  return (
                  <div key={sd.id} className="relative group/card bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative w-full aspect-square bg-gray-100">
                      <CardCarousel
                        images={[...sd.destino.galeria].sort((a, b) => a.orden - b.orden).map((g) => g.url)}
                        alt={sd.destino.nombre}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors flex items-end justify-between p-2 pointer-events-none">
                        <span className="bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">#{dIdx + 1}</span>
                        <div className="flex gap-1 pointer-events-auto opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <button onClick={() => moverDestino(seccion, dIdx, -1)} disabled={dIdx === 0} className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white disabled:opacity-30 shadow"><ChevronLeft size={14} /></button>
                          <button onClick={() => moverDestino(seccion, dIdx, 1)} disabled={dIdx === sortedDestinos.length - 1} className="p-1.5 bg-white/90 rounded-lg text-gray-700 hover:bg-white disabled:opacity-30 shadow"><ChevronRight size={14} /></button>
                        </div>
                      </div>
                      <button onClick={() => removeDestino(seccion.id, sd.destinoId)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600 shadow z-20"><X size={12} /></button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900">{sd.destino.nombre}</h3>
                      {sd.destino.descripcion && <p className="text-gray-500 text-sm line-clamp-2 mt-0.5">{sd.destino.descripcion}</p>}
                    </div>
                  </div>
                  );
                })}
                <button
                  onClick={() => setPickerSeccionId(seccion.id)}
                  className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#0f1b2d] hover:border-[#0f1b2d] transition-colors min-h-[200px]"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center"><Plus size={18} /></div>
                  <span className="text-sm font-medium">Agregar destino</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="h-10 bg-gray-100" />
              <div className="h-48 bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bannerSeccion    = secciones.find((s) => s.tipo === 'BANNER');
  const seccionesOrden   = secciones.filter((s) => s.tipo !== 'BANNER');
  const sortableIds      = seccionesOrden.map((s) => s.id);

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Modal nueva sección ── */}
      {showNueva && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Nueva sección</h2>
              <button onClick={() => setShowNueva(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la sección</label>
              <input
                type="text"
                value={nueva.titulo}
                onChange={(e) => setNueva({ titulo: e.target.value })}
                placeholder="Ej: En promoción, Escapadas de fin de semana..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]"
                onKeyDown={(e) => e.key === 'Enter' && crearSeccion()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">Podrás elegir qué destinos aparecen en esta sección.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNueva(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={crearSeccion}
                disabled={creando || !nueva.titulo.trim()}
                className="flex-1 px-4 py-2.5 text-sm bg-[#0f1b2d] text-white rounded-xl hover:bg-[#1a2f4e] disabled:opacity-50 transition-colors"
              >
                {creando ? 'Creando...' : 'Crear sección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Picker de destinos ── */}
      {pickerSeccionId && (() => {
        const seccion    = secciones.find((s) => s.id === pickerSeccionId)!;
        const disponibles = destinosDisponibles(seccion);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Agregar destino</h2>
                  <p className="text-xs text-gray-400 mt-0.5">a &ldquo;{seccion.titulo}&rdquo;</p>
                </div>
                <button onClick={() => setPickerSeccionId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              {disponibles.length === 0
                ? <p className="text-sm text-gray-500 text-center py-10">No hay más destinos disponibles</p>
                : (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {disponibles.map((d) => {
                      const foto = primeraFotoGaleria(d.galeria) ?? d.imagenPortada;
                      return (
                      <button
                        key={d.id}
                        onClick={() => addDestino(pickerSeccionId, d.id)}
                        className="flex flex-col rounded-xl overflow-hidden border border-gray-200 hover:border-[#0f1b2d] hover:shadow-md transition-all text-left group"
                      >
                        <div className="relative w-full aspect-square bg-gray-100">
                          {foto
                            ? <Image src={foto} alt={d.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
                            : <div className="w-full h-full flex items-center justify-center"><ImageOff size={20} className="text-gray-300" /></div>}
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{d.nombre}</p>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        );
      })()}


      {/* ── Vista previa del home ── */}
      <div className="bg-gray-100 min-h-screen">

        {/* Barra de edición */}
        <div className="bg-amber-400 px-6 py-2.5 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
            <span className="text-sm font-semibold text-amber-900">Modo edición — previsualización del inicio</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón guardar orden — solo visible cuando hay cambios */}
            {ordenModificado && (
              <button
                onClick={guardarOrden}
                disabled={guardandoOrden}
                className="flex items-center gap-1.5 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 animate-in fade-in"
              >
                <Save size={13} />
                {guardandoOrden ? 'Guardando...' : 'Guardar orden'}
              </button>
            )}
            <button
              onClick={() => setShowNueva(true)}
              className="flex items-center gap-1.5 bg-amber-900 text-amber-50 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-800 transition-colors"
            >
              <Plus size={13} />
              Nueva sección
            </button>
          </div>
        </div>

        {/* Navbar (solo visual) */}
        <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center pointer-events-none select-none">
          <Image src="/logo.png" alt="Starblue" width={120} height={40} className="object-contain" />
          <div className="bg-[#0f1b2d] text-white px-4 py-2 rounded-lg text-sm opacity-60">Iniciar sesión</div>
        </nav>

        {/* Secciones */}
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Banner — siempre fijo, no draggable */}
          {bannerSeccion && renderSeccion(bannerSeccion, null)}

          {/* Resto — draggables */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {seccionesOrden.map((seccion) => (
                  <SortableWrapper key={seccion.id} id={seccion.id}>
                    {(handle) => renderSeccion(seccion, handle)}
                  </SortableWrapper>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Botón añadir sección */}
          <button
            onClick={() => setShowNueva(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:text-[#0f1b2d] hover:border-[#0f1b2d] transition-colors"
          >
            <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center"><Plus size={18} /></div>
            <span className="text-sm font-medium">Agregar sección</span>
          </button>

        </div>
      </div>
    </>
  );
}
