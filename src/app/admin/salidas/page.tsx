'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Users, Zap } from 'lucide-react';
import api from '@/lib/api';

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  estado: string;
  ruta: { id: string; nombre: string; paradas: { destino?: { nombre: string }; orden: number }[] };
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const formatMes = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();

const formatDia = (f: string) =>
  new Date(f + 'T00:00:00').getDate();

const diffDias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export default function AdminSalidasPage() {
  const router = useRouter();
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchSalidas(); }, []);

  const fetchSalidas = async () => {
    const { data } = await api.get('/salidas');
    setSalidas(data);
    setLoading(false);
  };

  return (
    <div className="px-8 pt-10 pb-10 space-y-6">

      {/* ── Title + actions ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-[38px] font-bold tracking-tight"
            style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
          >
            Salidas
          </h1>
          {!loading && (
            <p className="text-xl mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
              {salidas.length} {salidas.length === 1 ? 'registrada' : 'registradas'}
            </p>
          )}
        </div>

        {!loading && (
          <div className="flex items-end gap-4 mb-1">
            {/* Generar */}
            <Link
              href="/admin/salidas/generar"
              className="flex items-center gap-1.5 text-[13px] font-medium transition-colors mb-1"
              style={{ color: 'var(--admin-text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
            >
              <Zap size={13} /> Generar
            </Link>

            {/* Nueva salida */}
            <Link href="/admin/salidas/nueva" className="flex flex-col items-center gap-1 group">
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
              <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Nueva salida</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: 'var(--admin-surface)' }} />
          ))}
        </div>
      )}


      {/* ── Empty state ── */}
      {!loading && salidas.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ background: 'var(--admin-surface)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--admin-bg)' }}>
            <Calendar size={22} style={{ color: 'var(--admin-text-tertiary)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>No hay salidas registradas</p>
          <p className="text-[13px] mt-1.5 mb-6" style={{ color: 'var(--admin-text-tertiary)' }}>
            Crea la primera para empezar a recibir viajeros
          </p>
          <Link
            href="/admin/salidas/nueva"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: 'transparent', color: 'var(--admin-text-primary)', border: '2px solid var(--admin-text-primary)' }}
          >
            <Plus size={14} /> Nueva salida
          </Link>
        </div>
      )}

      {/* ── Salida cards ── */}
      {!loading && salidas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {salidas.map(s => {
            const dias    = diffDias(s.fechaSalida, s.fechaRegreso);
            const paradas = (s.ruta?.paradas ?? []).slice().sort((a, b) => a.orden - b.orden);
            const origen  = paradas[0]?.destino?.nombre ?? '—';
            const destino = paradas[paradas.length - 1]?.destino?.nombre ?? '—';
            const isOpen  = s.estado === 'ABIERTA';

            return (
              <div
                key={s.id}
                onClick={() => router.push(`/admin/salidas/${s.id}`)}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--admin-surface)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)'}
              >
                {/* Date header */}
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ background: 'var(--admin-text-primary)' }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#fff', opacity: 0.5 }}>
                      {formatMes(s.fechaSalida)} {new Date(s.fechaSalida + 'T00:00:00').getFullYear()}
                    </p>
                    <p className="text-3xl font-bold leading-none mt-0.5" style={{ color: '#fff' }}>
                      {formatDia(s.fechaSalida)}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>
                    {s.ruta?.nombre ?? 'Sin ruta'}
                  </p>

                  {/* Origen → Destino */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                      <span className="text-[13px]" style={{ color: 'var(--admin-text-primary)' }}>{origen}</span>
                    </div>
                    <div className="w-px h-3 ml-[3px]" style={{ background: 'var(--admin-border)' }} />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--admin-accent)' }} />
                      <span className="text-[13px]" style={{ color: 'var(--admin-text-primary)' }}>{destino}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--admin-border-light)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                      {dias} {dias === 1 ? 'día' : 'días'}
                    </span>
                    <div className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                      <Users size={11} /> {s.cupoTotal} asientos
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}
