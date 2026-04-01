'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Route, Pencil, MoreHorizontal, Eye, EyeOff, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface RutaParada {
  id: string;
  orden: number;
  activa: boolean;
  destino: { nombre: string };
}

interface Ruta {
  id: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  paradas: RutaParada[];
  createdAt: string;
}

/* ── Vertical full timeline ── */
function VerticalTimeline({ paradas }: { paradas: RutaParada[] }) {
  return (
    <div className="space-y-0">
      {paradas.map((p, i) => {
        const isFirst = i === 0;
        const isLast  = i === paradas.length - 1;
        const accent  = isFirst || isLast;
        return (
          <div key={p.id} className="flex items-stretch gap-4">
            {/* Left: dot + line */}
            <div className="flex flex-col items-center w-5 flex-shrink-0">
              <div
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  borderColor: accent ? 'var(--admin-accent)' : 'var(--admin-border)',
                  background:  accent ? 'var(--admin-accent)' : 'var(--admin-surface)',
                  opacity:     p.activa ? 1 : 0.4,
                }}
              >
                {accent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className="w-px flex-1 my-1"
                  style={{ background: 'var(--admin-border-light)', minHeight: 24 }}
                />
              )}
            </div>

            {/* Right: stop info */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[13.5px] font-medium"
                  style={{
                    color:   accent ? 'var(--admin-accent)' : 'var(--admin-text-primary)',
                    opacity: p.activa ? 1 : 0.5,
                  }}
                >
                  {p.destino?.nombre}
                </span>
                {!p.activa && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-tertiary)' }}
                  >
                    Inactiva
                  </span>
                )}
                {(isFirst || isLast) && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--admin-accent-subtle)', color: 'var(--admin-accent)' }}
                  >
                    {isFirst ? 'Origen' : 'Destino'}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                Parada {i + 1}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Compact route timeline ── */
function RouteTimeline({ paradas }: { paradas: RutaParada[] }) {
  const ordered = [...paradas].sort((a, b) => a.orden - b.orden);
  const MAX_VISIBLE = 5;

  // If within limit, show all; otherwise show first 2 + ellipsis + last 1
  const showAll   = ordered.length <= MAX_VISIBLE;
  const visible   = showAll
    ? ordered
    : [...ordered.slice(0, 2), null, ordered[ordered.length - 1]];
  const hidden    = showAll ? 0 : ordered.length - 3;

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {visible.map((p, i) => {
        const isFirst = i === 0;
        const isLast  = i === visible.length - 1;

        /* Ellipsis node */
        if (p === null) {
          return (
            <div key="ellipsis" className="flex items-center gap-0">
              {/* Connecting line */}
              <div className="w-5 h-px" style={{ background: 'var(--admin-border)' }} />
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: 'var(--admin-text-tertiary)', background: 'var(--admin-bg)' }}
              >
                +{hidden}
              </span>
              <div className="w-5 h-px" style={{ background: 'var(--admin-border)' }} />
            </div>
          );
        }

        return (
          <div key={p.id} className="flex items-center gap-0">
            {/* Connector (not before first) */}
            {!isFirst && <div className="w-6 h-px" style={{ background: 'var(--admin-border)' }} />}

            {/* Stop node */}
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{
                  background: (isFirst || isLast) ? 'var(--admin-accent-subtle)' : 'var(--admin-bg)',
                  border:      `1px solid ${(isFirst || isLast) ? 'transparent' : 'var(--admin-border-light)'}`,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: (isFirst || isLast) ? 'var(--admin-accent)' : 'var(--admin-text-tertiary)' }}
                />
                <span
                  className="text-[12px] font-medium whitespace-nowrap"
                  style={{ color: (isFirst || isLast) ? 'var(--admin-accent)' : 'var(--admin-text-secondary)' }}
                >
                  {p.destino?.nombre}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Actions row ── */
function ActionMenu({ rutaId, activa, onToggle, onDelete }: {
  rutaId: string; activa: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <Link
        href={`/admin/rutas/${rutaId}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
        style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-secondary)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-secondary)'}
      >
        <Pencil size={12} /> Editar
      </Link>

      <div className="relative">
        <button
          onClick={() => setOpen(p => !p)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--admin-text-tertiary)', background: 'var(--admin-bg)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
        >
          <MoreHorizontal size={15} />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 w-40 rounded-xl overflow-hidden z-30 py-1"
            style={{
              background:  'var(--admin-surface)',
              boxShadow:   '0 8px 24px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            <button
              onClick={() => { onToggle(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors"
              style={{ color: 'var(--admin-text-secondary)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--admin-sidebar-hover)';
                (e.currentTarget as HTMLElement).style.color      = 'var(--admin-text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color      = 'var(--admin-text-secondary)';
              }}
            >
              {activa ? <EyeOff size={13} /> : <Eye size={13} />}
              {activa ? 'Desactivar' : 'Activar'}
            </button>
            <div style={{ borderTop: '1px solid var(--admin-border-light)', margin: '4px 0' }} />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors"
              style={{ color: '#ef4444' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Trash2 size={13} /> Eliminar ruta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminRutasPage() {
  const [rutas, setRutas]       = useState<Ruta[]>([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => { fetchRutas(); }, []);

  const fetchRutas = async () => {
    const { data } = await api.get('/rutas');
    setRutas(data);
    setLoading(false);
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta ruta? Se eliminarán también todas sus salidas.')) return;
    await api.delete(`/rutas/${id}`);
    setRutas(prev => prev.filter(r => r.id !== id));
  };

  const toggleActiva = async (id: string) => {
    const { data } = await api.patch(`/rutas/${id}/toggle`);
    setRutas(prev => prev.map(r => r.id === id ? data : r));
  };

  return (
    <div className="px-8 pt-10 pb-10 space-y-5">

      {/* ── Title + button ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-[38px] font-bold tracking-tight"
            style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
          >
            Rutas
          </h1>
          {!loading && (
            <p className="text-xl mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
              {rutas.length} {rutas.length === 1 ? 'ruta' : 'rutas'}
            </p>
          )}
        </div>
        {!loading && (
          <Link href="/admin/rutas/nueva" className="flex flex-col items-center gap-1 group mb-1">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 border-black"
              style={{ background: 'transparent', color: 'black' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'black';
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'black';
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Nueva ruta</span>
          </Link>
        )}
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: 'var(--admin-surface)' }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && rutas.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ background: 'var(--admin-surface)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--admin-bg)' }}
          >
            <Route size={22} style={{ color: 'var(--admin-text-tertiary)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>
            No hay rutas configuradas
          </p>
          <p className="text-[13px] mt-1.5 mb-6" style={{ color: 'var(--admin-text-tertiary)' }}>
            Crea la primera ruta con sus ciudades y precios por tramo
          </p>
          <Link
            href="/admin/rutas/nueva"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: 'transparent', color: 'var(--admin-text-primary)', border: '2px solid var(--admin-text-primary)' }}
          >
            <Plus size={14} /> Nueva ruta
          </Link>
        </div>
      )}

      {/* ── Ruta cards ── */}
      {!loading && rutas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {rutas.map(ruta => {
            const sorted  = [...ruta.paradas].sort((a, b) => a.orden - b.orden);
            const origen  = sorted[0]?.destino?.nombre ?? '—';
            const destino = sorted[sorted.length - 1]?.destino?.nombre ?? '—';

            const intermedias = Math.max(0, sorted.length - 2);

            return (
              <div
                key={ruta.id}
                onClick={() => window.location.href = `/admin/rutas/${ruta.id}`}
                className="rounded-2xl overflow-hidden transition-all cursor-pointer hover:-translate-y-0.5"
                style={{
                  background: 'var(--admin-surface)',
                  boxShadow:  '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
                  opacity:    ruta.activa ? 1 : 0.65,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)'}
              >
                {/* Accent top bar */}
                <div className="h-1" style={{ background: 'var(--admin-accent)', opacity: 0.7 }} />

                <div className="p-5">
                  {/* Nombre */}
                  <p className="font-semibold text-[15px] mb-4" style={{ color: 'var(--admin-text-primary)' }}>
                    {ruta.nombre}
                  </p>

                  {/* Route visual */}
                  <div className="flex flex-col">
                    {/* Origen */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--admin-text-primary)' }}>{origen}</span>
                    </div>

                    {/* Connector with intermediate count */}
                    <div className="flex items-center gap-2.5 my-1 ml-[4px]">
                      <div className="w-px flex-shrink-0" style={{ height: intermedias > 0 ? 28 : 20, background: 'var(--admin-border)' }} />
                      {intermedias > 0 && (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-tertiary)', border: '1px solid var(--admin-border-light)' }}
                        >
                          {intermedias} {intermedias === 1 ? 'parada intermedia' : 'paradas intermedias'}
                        </span>
                      )}
                    </div>

                    {/* Destino */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'var(--admin-accent)' }} />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--admin-text-primary)' }}>{destino}</span>
                    </div>
                  </div>

                  {!ruta.activa && (
                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--admin-border-light)' }}>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-tertiary)' }}
                      >
                        Desactivada
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
