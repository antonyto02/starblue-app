'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Phone, Mail, Plus, ClipboardList } from 'lucide-react';
import api from '@/lib/api';

type EstadoR = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

interface Reservacion {
  id: string;
  nombreCompleto: string;
  telefono: string;
  email: string;
  adultos: number;
  menores9: number;
  menores3: number;
  asientosAsignados: number[] | null;
  precioUnitario: number | null;
  notas: string;
  estado: EstadoR;
  createdAt: string;
  paradaOrigen: { destino: { nombre: string } } | null;
  paradaDestino: { destino: { nombre: string } } | null;
  salida: {
    fechaSalida: string;
    ruta: { nombre: string };
  };
}

const ESTADO_CONFIG: Record<EstadoR, { label: string; classes: string; dot: string }> = {
  PENDIENTE:  { label: 'Pendiente',  classes: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  CONFIRMADA: { label: 'Confirmada', classes: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  CANCELADA:  { label: 'Cancelada',  classes: 'bg-gray-100 text-gray-500 border-gray-200',    dot: 'bg-gray-400' },
};

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const formatFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function EmpleadoReservacionesPage() {
  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState<'TODAS' | EstadoR>('TODAS');

  useEffect(() => {
    api.get('/reservaciones/mis-reservas').then(r => {
      setReservaciones(r.data);
      setLoading(false);
    });
  }, []);

  const filtradas   = filtro === 'TODAS' ? reservaciones : reservaciones.filter(r => r.estado === filtro);
  const confirmadas = reservaciones.filter(r => r.estado === 'CONFIRMADA').length;
  const pendientes  = reservaciones.filter(r => r.estado === 'PENDIENTE').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mis reservas</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {confirmadas} confirmadas · {pendientes} pendientes
            </p>
          </div>
          <Link
            href="/empleado/reservaciones/nueva"
            className="flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a2f4e] transition-colors"
          >
            <Plus size={15} /> Nueva reserva
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

        {/* Filtros */}
        {!loading && reservaciones.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {(['TODAS', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  filtro === f
                    ? 'bg-[#0f1b2d] text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f === 'TODAS' ? 'Todas' : ESTADO_CONFIG[f].label}
                {f !== 'TODAS' && (
                  <span className="ml-1.5 opacity-60">{reservaciones.filter(r => r.estado === f).length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
          </div>
        )}

        {!loading && reservaciones.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-20">
            <ClipboardList size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">Sin reservas aún</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Registra tu primer cliente</p>
            <Link
              href="/empleado/reservaciones/nueva"
              className="inline-flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1a2f4e] transition-colors"
            >
              <Plus size={15} /> Nueva reserva
            </Link>
          </div>
        )}

        {!loading && filtradas.length > 0 && (
          <div className="space-y-3">
            {filtradas.map((r) => {
              const cfg = ESTADO_CONFIG[r.estado];
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-stretch">
                    <div className={`w-1.5 flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0 px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{r.nombreCompleto}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Registrado el {formatFechaCorta(r.createdAt)}</p>
                        </div>
                        <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.classes}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5"><Phone size={12} />{r.telefono}</span>
                        <span className="flex items-center gap-1.5"><Mail size={12} />{r.email}</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {r.salida.ruta?.nombre} · {formatFecha(r.salida.fechaSalida)}
                        </span>
                        {r.paradaOrigen && r.paradaDestino && (
                          <span className="flex items-center gap-1">
                            {r.paradaOrigen.destino.nombre} → {r.paradaDestino.destino.nombre}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-medium text-[#0f1b2d]">
                          <Users size={12} />
                          {r.adultos + r.menores9 + r.menores3} pax
                        </span>
                        {r.asientosAsignados && r.asientosAsignados.length > 0 && (
                          <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-xs font-bold">
                            🪑 {r.asientosAsignados.join(', ')}
                          </span>
                        )}
                      </div>
                      {r.notas && <p className="mt-2 text-xs text-gray-400 italic">"{r.notas}"</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && reservaciones.length > 0 && filtradas.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No tienes reservas con estado &ldquo;{ESTADO_CONFIG[filtro as EstadoR]?.label}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
