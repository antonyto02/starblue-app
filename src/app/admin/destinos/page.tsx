'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Pencil, Trash2, Eye, EyeOff, Plus, Plane,
  Search, Images, MoreHorizontal,
} from 'lucide-react';
import api from '@/lib/api';

interface Destino {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  pais: string;
  imagenPortada: string;
  galeria: { id: string; url: string; orden: number }[];
}

interface Salida {
  id: string;
  fechaSalida: string;
  estado: string;
  ruta: { paradas: { destino?: { id: string } }[] };
}


/* ─── Tiny dot-menu component ─── */
function DotMenu({ onEdit, onToggle, onDelete, activo }: {
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  activo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.preventDefault(); setOpen(p => !p); }}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.35)'}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-36 rounded-xl overflow-hidden z-30 py-1"
          style={{
            background: 'var(--admin-surface)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors"
            style={{ color: 'var(--admin-text-secondary)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--admin-sidebar-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-secondary)';
            }}
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            onClick={() => { onToggle(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors"
            style={{ color: 'var(--admin-text-secondary)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--admin-sidebar-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-secondary)';
            }}
          >
            {activo ? <EyeOff size={13} /> : <Eye size={13} />}
            {activo ? 'Ocultar' : 'Publicar'}
          </button>
          <div style={{ borderTop: '1px solid var(--admin-border-light)', margin: '4px 0' }} />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminDestinosPage() {
  const [destinos, setDestinos]   = useState<Destino[]>([]);
  const [salidas, setSalidas]     = useState<Salida[]>([]);
  const [loading, setLoading]     = useState(true);
  const [paisFiltro, setPaisFiltro] = useState<'todos' | 'MX' | 'USA'>('todos');
  const [busqueda, setBusqueda]   = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [d, s] = await Promise.allSettled([
      api.get('/destinos/admin/todos'),
      api.get('/salidas'),
    ]);
    if (d.status === 'fulfilled') setDestinos(d.value.data);
    if (s.status === 'fulfilled') setSalidas(s.value.data);
    setLoading(false);
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    await api.put(`/destinos/${id}`, { activo: !activo });
    fetchAll();
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/destinos/${id}`);
    setDestinos(prev => prev.filter(d => d.id !== id));
  };

  const getThumb = (d: Destino) =>
    d.imagenPortada || d.galeria?.find(g => g.orden === 0)?.url || null;

  /* Salidas próximas por destino (estado ABIERTA + fecha futura) */
  const salidasPorDestino = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const map: Record<string, number> = {};
    for (const s of salidas) {
      if (s.estado !== 'ABIERTA' || s.fechaSalida < hoy) continue;
      for (const p of s.ruta?.paradas ?? []) {
        const did = p.destino?.id;
        if (did) map[did] = (map[did] ?? 0) + 1;
      }
    }
    return map;
  }, [salidas]);

  const filtrados = useMemo(() =>
    destinos
      .filter(d => paisFiltro === 'todos' ? true : d.pais === paisFiltro)
      .filter(d => d.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [destinos, paisFiltro, busqueda]
  );

  return (
    <div className="px-8 pt-10 pb-10 space-y-5">

      {/* ── Title row ── */}
      <h1
        className="text-[38px] font-bold tracking-tight"
        style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
      >
        Destinos
      </h1>

      {/* ── Toolbar row ── */}
      {!loading && (
        <div className="flex items-center justify-between">

          {/* Left: country chips + search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {([
                { key: 'todos', label: 'Todos' },
                { key: 'MX',    label: '🇲🇽 México' },
                { key: 'USA',   label: '🇺🇸 EUA' },
              ] as { key: 'todos' | 'MX' | 'USA'; label: string }[]).map(p => (
                <button
                  key={p.key}
                  onClick={() => setPaisFiltro(p.key)}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all"
                  style={{
                    background: paisFiltro === p.key ? 'var(--admin-accent)' : 'var(--admin-surface)',
                    color:      paisFiltro === p.key ? '#fff' : 'var(--admin-text-secondary)',
                    boxShadow:  paisFiltro === p.key ? '0 2px 6px rgba(0,0,0,0.15)' : '0 0 0 1px rgba(0,0,0,0.08)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="relative w-56">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[13px] focus:outline-none transition-shadow"
                style={{
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-text-primary)',
                  boxShadow: '0 0 0 1.5px var(--admin-border)',
                }}
                onFocus={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px var(--admin-accent)`}
                onBlur={e =>  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1.5px var(--admin-border)'}
              />
            </div>
          </div>

          {/* Right: Nuevo destino */}
          <Link
            href="/admin/destinos/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ background: 'transparent', color: 'var(--admin-text-primary)', border: '2px solid var(--admin-text-primary)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nuevo destino
          </Link>

        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 350px)', justifyContent: 'space-between', rowGap: '3rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--admin-surface)' }}>
              <div className="h-52 bg-current opacity-10" />
              <div className="p-4 space-y-2">
                <div className="h-3.5 rounded-full w-2/3 bg-current opacity-10" />
                <div className="h-3 rounded-full w-1/2 bg-current opacity-5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtrados.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--admin-bg)' }}
          >
            <Plane size={22} style={{ color: 'var(--admin-text-tertiary)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>
            {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay destinos aún'}
          </p>
          <p className="text-[13px] mt-1.5 mb-6" style={{ color: 'var(--admin-text-tertiary)' }}>
            {busqueda ? 'Intenta con otro término de búsqueda' : 'Agrega el primer destino para empezar'}
          </p>
          {!busqueda && (
            <Link
              href="/admin/destinos/nuevo"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium"
              style={{ background: 'transparent', color: 'var(--admin-text-primary)', border: '2px solid var(--admin-text-primary)' }}
            >
              <Plus size={14} /> Nuevo destino
            </Link>
          )}
        </div>
      )}

      {/* ── Card grid ── */}
      {!loading && filtrados.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 350px)', justifyContent: 'space-between', rowGap: '3rem' }}>
          {filtrados.map(d => {
            const thumb       = getThumb(d);
            const fotoCount   = d.galeria?.length ?? 0;
            const nSalidas    = salidasPorDestino[d.id] ?? 0;

            return (
              <div
                key={d.id}
                onClick={() => window.location.href = `/admin/destinos/${d.id}`}
                className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background:  'var(--admin-surface)',
                  boxShadow:   d.pais === 'MX'
                    ? '0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(22,163,74,0.55)'
                    : d.pais === 'USA'
                    ? '0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(59,130,246,0.55)'
                    : '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
                  opacity:     d.activo ? 1 : 0.65,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = d.pais === 'MX'
                  ? '0 8px 24px rgba(0,0,0,0.1), 0 0 0 2px rgba(22,163,74,0.8)'
                  : d.pais === 'USA'
                  ? '0 8px 24px rgba(0,0,0,0.1), 0 0 0 2px rgba(59,130,246,0.8)'
                  : '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = d.pais === 'MX'
                  ? '0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(22,163,74,0.55)'
                  : d.pais === 'USA'
                  ? '0 1px 4px rgba(0,0,0,0.05), 0 0 0 2px rgba(59,130,246,0.55)'
                  : '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)'}
              >
                {/* ── Image area ── */}
                <div className="relative h-52 overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
                  {thumb
                    ? <img src={thumb} alt={d.nombre} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Plane size={32} style={{ color: 'var(--admin-text-tertiary)', opacity: 0.4 }} />
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>Sin imagen</p>
                      </div>
                    )
                  }

                  {/* Gradient overlay for badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                  {/* Status badge — top left (only when inactive) */}
                  {!d.activo && (
                    <span
                      className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: 'rgba(0,0,0,0.45)',
                        color: '#fff',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      Desactivado
                    </span>
                  )}

                  {/* ⋯ menu — top right, visible on hover */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <DotMenu
                      activo={d.activo}
                      onEdit={() => window.location.href = `/admin/destinos/${d.id}`}
                      onToggle={() => toggleActivo(d.id, d.activo)}
                      onDelete={() => eliminar(d.id, d.nombre)}
                    />
                  </div>

                  {/* Bottom badges */}
                  {fotoCount > 0 && (
                    <div className="absolute bottom-3 right-3">
                      <span
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}
                      >
                        <Images size={10} /> {fotoCount}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Card body ── */}
                <div className="p-4 flex-1 flex flex-col gap-1">
                  <h3 className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>
                    {d.nombre}
                  </h3>
                  <p
                    className="text-[12.5px] line-clamp-2 flex-1"
                    style={{ color: 'var(--admin-text-tertiary)' }}
                  >
                    {d.descripcion || 'Sin descripción'}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
