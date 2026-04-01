'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Users, DollarSign, User,
  Phone, Mail, FileText, CheckCircle, Route, MapPin, Info,
} from 'lucide-react';
import api from '@/lib/api';

interface RutaParada {
  id: string;
  orden: number;
  destino: { nombre: string };
}

interface Tarifa {
  id: string;
  paradaOrigenId: string;
  paradaDestinoId: string;
  precio: number;
  paradaDestino: { id: string; destino: { nombre: string } };
}

interface Disponibilidad {
  cupoTotal: number;
  libre: number;
  ocupados: number[];
  libres: number[];
}

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  ruta: { id: string; nombre: string; paradas: RutaParada[] };
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

const diffDias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export default function NuevaReservaEmpleadoPage() {
  const router = useRouter();
  const [salidas, setSalidas]             = useState<Salida[]>([]);
  const [salidaId, setSalidaId]           = useState('');
  const [origenId, setOrigenId]           = useState('');
  const [destinoId, setDestinoId]         = useState('');
  const [tarifas, setTarifas]             = useState<Tarifa[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [form, setForm] = useState({
    nombreCompleto: '', telefono: '', email: '',
    adultos: 1, menores9: 0, menores3: 0, notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/salidas/proximas').then(r => setSalidas(r.data));
  }, []);

  const salidaSeleccionada = salidas.find(s => s.id === salidaId);
  const cuposLibres        = disponibilidad?.libre ?? (salidaSeleccionada?.cupoTotal ?? 0);

  const paradasOrdenadas = salidaSeleccionada?.ruta?.paradas
    ? [...salidaSeleccionada.ruta.paradas].sort((a, b) => a.orden - b.orden)
    : [];

  const tarifaSeleccionada = tarifas.find(t => t.paradaDestinoId === destinoId);

  const f = (key: string, val: string | number) => setForm(prev => ({ ...prev, [key]: val }));

  const seleccionarSalida = (id: string) => {
    setSalidaId(id);
    setOrigenId('');
    setDestinoId('');
    setTarifas([]);
    setDisponibilidad(null);
    setForm(p => ({ ...p, adultos: 1, menores9: 0, menores3: 0 }));
  };

  const seleccionarOrigen = async (pid: string) => {
    setOrigenId(pid);
    setDestinoId('');
    setTarifas([]);
    setDisponibilidad(null);
    if (!pid || !salidaSeleccionada) return;
    setLoadingTarifas(true);
    try {
      const { data } = await api.get(`/rutas/${salidaSeleccionada.ruta.id}/tarifas/desde/${pid}`);
      setTarifas(data);
    } finally {
      setLoadingTarifas(false);
    }
  };

  const seleccionarDestino = async (paradaDestinoId: string) => {
    setDestinoId(paradaDestinoId);
    setDisponibilidad(null);
    if (!paradaDestinoId || !origenId || !salidaSeleccionada) return;
    try {
      const { data } = await api.get(
        `/reservaciones/disponibilidad/${salidaSeleccionada.id}?origenId=${origenId}&destinoId=${paradaDestinoId}`,
      );
      setDisponibilidad(data);
    } catch { /* silently ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/reservaciones/empleado', {
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono,
        email: form.email,
        notas: form.notas,
        adultos: form.adultos,
        menores9: form.menores9,
        menores3: form.menores3,
        salidaId,
        paradaOrigenId: origenId,
        paradaDestinoId: destinoId,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al registrar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const paradaNombre = (p: { destino?: { nombre: string } }) => p.destino?.nombre ?? '';

  if (success) {
    const paradaOrigen  = paradasOrdenadas.find(p => p.id === origenId);
    const paradaDestino = tarifaSeleccionada?.paradaDestino;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Reserva registrada!</h2>
          <p className="text-gray-500 text-sm mb-1">
            Cliente: <strong>{form.nombreCompleto}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-1">
            {salidaSeleccionada?.ruta.nombre} · {salidaSeleccionada && formatFecha(salidaSeleccionada.fechaSalida)}
          </p>
          {paradaOrigen && paradaDestino && (
            <p className="text-gray-500 text-sm mb-6">
              Tramo: <strong>{paradaNombre(paradaOrigen)} → {paradaNombre(paradaDestino)}</strong>
              {tarifaSeleccionada && ` · $${Number(tarifaSeleccionada.precio).toLocaleString()}/pax`}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccess(false);
                setSalidaId('');
                setOrigenId('');
                setDestinoId('');
                setTarifas([]);
                setForm({ nombreCompleto: '', telefono: '', email: '', adultos: 1, menores9: 0, menores3: 0, notas: '' });
              }}
              className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Nueva reserva
            </button>
            <Link
              href="/empleado/reservaciones"
              className="flex-1 bg-[#0f1b2d] text-white py-2.5 rounded-xl text-sm font-semibold text-center hover:bg-[#1a2f4e] transition-colors"
            >
              Ver mis reservas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <Link
          href="/empleado"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft size={15} />
          Volver al panel
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0f1b2d] rounded-xl flex items-center justify-center">
            <Calendar size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva reserva</h1>
            <p className="text-sm text-gray-400">Selecciona viaje, origen, destino y datos del cliente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Columna izquierda */}
          <div className="lg:col-span-3 space-y-5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* 1. Selección de salida */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Route size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">1. Seleccionar viaje</h2>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {salidas.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No hay salidas disponibles</p>
                )}
                {salidas.map((s) => {
                  const libres = s.cupoTotal;
                  const dias   = diffDias(s.fechaSalida, s.fechaRegreso);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => seleccionarSalida(s.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                        salidaId === s.id
                          ? 'border-[#0f1b2d] bg-[#0f1b2d]/5 ring-1 ring-[#0f1b2d]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0f1b2d]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Route size={14} className="text-[#0f1b2d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{s.ruta?.nombre}</p>
                        <p className="text-xs text-gray-400">{formatFecha(s.fechaSalida)} · {dias} días</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-xs font-medium ${libres <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                          {libres} asientos
                        </p>
                      </div>
                      {salidaId === s.id && (
                        <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <input type="text" required value={salidaId} onChange={() => {}} className="sr-only" tabIndex={-1} />
            </div>

            {/* 2. Parada de origen */}
            {salidaSeleccionada && paradasOrdenadas.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <MapPin size={13} className="text-gray-500" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700">2. ¿Dónde aborda?</h2>
                </div>
                <div className="space-y-2">
                  {paradasOrdenadas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => seleccionarOrigen(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                        origenId === p.id
                          ? 'border-[#0f1b2d] bg-[#0f1b2d]/5 ring-1 ring-[#0f1b2d]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {p.orden}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {paradaNombre(p)}
                      </span>
                      {origenId === p.id && (
                        <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <input type="text" required value={origenId} onChange={() => {}} className="sr-only" tabIndex={-1} />
              </div>
            )}

            {/* 3. Parada de destino (tarifas disponibles) */}
            {origenId && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <MapPin size={13} className="text-gray-500" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700">3. ¿Hasta dónde va?</h2>
                </div>
                {loadingTarifas && (
                  <p className="text-sm text-gray-400 text-center py-4">Cargando destinos...</p>
                )}
                {!loadingTarifas && tarifas.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <Info size={20} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay tarifas configuradas desde esta parada</p>
                  </div>
                )}
                {!loadingTarifas && tarifas.length > 0 && (
                  <div className="space-y-2">
                    {tarifas.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => seleccionarDestino(t.paradaDestinoId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          destinoId === t.paradaDestinoId
                            ? 'border-[#0f1b2d] bg-[#0f1b2d]/5 ring-1 ring-[#0f1b2d]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex-1 text-sm font-medium text-gray-800">
                          {paradaNombre(t.paradaDestino)}
                        </span>
                        <span className="text-sm font-bold text-[#0f1b2d]">
                          ${Number(t.precio).toLocaleString()}
                        </span>
                        {destinoId === t.paradaDestinoId && (
                          <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <input type="text" required value={destinoId} onChange={() => {}} className="sr-only" tabIndex={-1} />
              </div>
            )}

            {/* Datos del cliente */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Datos del cliente</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Nombre completo</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required type="text"
                      placeholder="Nombre completo del pasajero"
                      value={form.nombreCompleto}
                      onChange={e => f('nombreCompleto', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Teléfono</label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required type="tel"
                        placeholder="+52 55 1234 5678"
                        value={form.telefono}
                        onChange={e => f('telefono', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Correo</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required type="email"
                        placeholder="correo@ejemplo.com"
                        value={form.email}
                        onChange={e => f('email', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Notas <span className="normal-case font-normal text-gray-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <FileText size={13} className="absolute left-3.5 top-3 text-gray-400" />
                    <textarea
                      rows={2}
                      placeholder="Observaciones, requerimientos especiales..."
                      value={form.notas}
                      onChange={e => f('notas', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Columna derecha */}
          <div className="lg:col-span-2 space-y-5">

            {/* Preview del viaje */}
            {salidaSeleccionada && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumen del viaje</p>
                <div className="flex items-center gap-2 mb-2">
                  <Route size={13} className="text-[#0f1b2d]/50" />
                  <p className="text-sm font-semibold text-[#0f1b2d]">{salidaSeleccionada.ruta.nombre}</p>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p>📅 {formatFecha(salidaSeleccionada.fechaSalida)} → {formatFecha(salidaSeleccionada.fechaRegreso)}</p>
                  <p>🪑 {salidaSeleccionada.cupoTotal} asientos en total</p>
                  {disponibilidad && (
                    <p className={`font-semibold ${disponibilidad.libre === 0 ? 'text-red-600' : disponibilidad.libre <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                      {disponibilidad.libre} libre{disponibilidad.libre !== 1 ? 's' : ''} en este tramo
                    </p>
                  )}
                </div>
                {origenId && destinoId && tarifaSeleccionada && (
                  <div className="bg-[#0f1b2d]/5 rounded-xl px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-[#0f1b2d]/60 flex-shrink-0" />
                      <p className="text-xs text-[#0f1b2d]/70">
                        {paradaNombre(paradasOrdenadas.find(p => p.id === origenId)!)}
                        <span className="mx-1.5">→</span>
                        {paradaNombre(tarifaSeleccionada.paradaDestino)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0f1b2d] text-right">
                      ${Number(tarifaSeleccionada.precio).toLocaleString()}/pax
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pasajeros y total */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Users size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Pasajeros</h2>
              </div>

              {disponibilidad ? (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Info size={11} /> {disponibilidad.libre} lugar{disponibilidad.libre !== 1 ? 'es' : ''} disponible{disponibilidad.libre !== 1 ? 's' : ''} en este tramo
                </p>
              ) : salidaSeleccionada && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Info size={11} /> Selecciona el tramo para ver disponibilidad
                </p>
              )}

              <div className="space-y-3">
                {/* Adultos */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adultos</p>
                    <p className="text-xs text-gray-400">Precio completo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => f('adultos', Math.max(0, form.adultos - 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold">{form.adultos}</span>
                    <button type="button"
                      onClick={() => f('adultos', form.adultos + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>

                {/* Menores 4-9 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Menores (4–9 años)</p>
                    <p className="text-xs text-gray-400">
                      {tarifaSeleccionada
                        ? `$${Math.max(0, Number(tarifaSeleccionada.precio) - 10).toLocaleString()} USD (−$10)`
                        : '−$10 USD descuento'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => f('menores9', Math.max(0, form.menores9 - 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold">{form.menores9}</span>
                    <button type="button"
                      onClick={() => f('menores9', form.menores9 + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>

                {/* Menores <3 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bebés (&lt;3 años)</p>
                    <p className="text-xs text-gray-400">
                      {tarifaSeleccionada
                        ? `$${(Number(tarifaSeleccionada.precio) * 0.5).toLocaleString()} USD (50% off)`
                        : '50% de descuento'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => f('menores3', Math.max(0, form.menores3 - 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold">{form.menores3}</span>
                    <button type="button"
                      onClick={() => f('menores3', form.menores3 + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {tarifaSeleccionada && (form.adultos + form.menores9 + form.menores3) > 0 && (() => {
                const precio = Number(tarifaSeleccionada.precio);
                const total =
                  form.adultos  * precio +
                  form.menores9 * Math.max(0, precio - 10) +
                  form.menores3 * precio * 0.5;
                return (
                  <div className="border-t border-gray-100 pt-4 space-y-1.5">
                    {form.adultos > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{form.adultos} adulto{form.adultos !== 1 ? 's' : ''}</span>
                        <span>${(form.adultos * precio).toLocaleString()} USD</span>
                      </div>
                    )}
                    {form.menores9 > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{form.menores9} menor(es) 4–9 años</span>
                        <span>${(form.menores9 * Math.max(0, precio - 10)).toLocaleString()} USD</span>
                      </div>
                    )}
                    {form.menores3 > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{form.menores3} bebé(s) &lt;3 años</span>
                        <span>${(form.menores3 * precio * 0.5).toLocaleString()} USD</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                      <span className="text-base font-bold text-[#0f1b2d]">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              type="submit"
              disabled={loading || !salidaId || !origenId || !destinoId || (form.adultos + form.menores9 + form.menores3) < 1}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-40 transition-colors shadow-sm"
            >
              {loading ? 'Registrando...' : 'Registrar reserva'}
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}
