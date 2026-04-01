'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Check, Users, Plus, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

interface Reservacion {
  id: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  adultos: number;
  menores9: number;
  menores3: number;
  createdAt: string;
  salida: {
    fechaSalida: string;
    ruta: { nombre: string };
  };
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function EmpleadoDashboard() {
  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reservaciones/mis-reservas').then(r => {
      setReservaciones(r.data);
      setLoading(false);
    });
  }, []);

  const confirmadas = reservaciones.filter(r => r.estado === 'CONFIRMADA');
  const pendientes  = reservaciones.filter(r => r.estado === 'PENDIENTE').length;
  const totalPax    = confirmadas.reduce((s, r) => s + r.adultos + r.menores9 + r.menores3, 0);
  const recientes   = reservaciones.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Mi panel</h1>
          <p className="text-sm text-gray-400 mt-0.5">Resumen de tu actividad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 text-[#0f1b2d] text-xs font-medium mb-1">
              <ClipboardList size={13} /> Total registradas
            </div>
            <p className="text-2xl font-bold text-gray-900">{reservaciones.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1">
              <Check size={13} /> Confirmadas
            </div>
            <p className="text-2xl font-bold text-gray-900">{confirmadas.length}</p>
            {pendientes > 0 && (
              <p className="text-xs text-amber-500 mt-0.5">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1">
              <Users size={13} /> Pasajeros confirmados
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalPax}</p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/empleado/reservaciones/nueva"
            className="bg-[#0f1b2d] text-white rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-[#1a2f4e] transition-colors"
          >
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Plus size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">Nueva reserva</p>
              <p className="text-white/50 text-xs">Registrar un cliente</p>
            </div>
          </Link>
          <Link
            href="/empleado/reservaciones"
            className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Ver mis reservas</p>
              <p className="text-gray-400 text-xs">{reservaciones.length} registradas</p>
            </div>
          </Link>
        </div>

        {/* Actividad reciente */}
        {!loading && recientes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Actividad reciente</p>
            </div>
            <div className="divide-y divide-gray-50">
              {recientes.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.salida.ruta?.nombre}</p>
                    <p className="text-xs text-gray-400">{formatFecha(r.salida.fechaSalida)} · {r.adultos + r.menores9 + r.menores3} pax</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    r.estado === 'CONFIRMADA' ? 'bg-green-50 text-green-700' :
                    r.estado === 'PENDIENTE'  ? 'bg-amber-50 text-amber-700' :
                                                'bg-gray-100 text-gray-500'
                  }`}>
                    {r.estado === 'CONFIRMADA' ? 'Confirmada' : r.estado === 'PENDIENTE' ? 'Pendiente' : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && reservaciones.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
            <ClipboardList size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">Aún no tienes reservas</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Empieza registrando tu primer cliente</p>
            <Link
              href="/empleado/reservaciones/nueva"
              className="inline-flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1a2f4e] transition-colors"
            >
              <Plus size={15} /> Nueva reserva
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
