'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, Users, FileText, CheckCircle, AlertCircle, Calendar, MapPin, Info } from 'lucide-react';
import api from '@/lib/api';

interface RutaParada {
  id: string;
  orden: number;
  destino: { nombre: string; pais?: string };
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

interface Props {
  salida: Salida;
  onClose: () => void;
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

const paradaNombre = (p: { destino?: { nombre: string } }) => p.destino?.nombre ?? '';

export default function ReservaModal({ salida, onClose }: Props) {
  const [origenId, setOrigenId]           = useState('');
  const [destinoId, setDestinoId]         = useState('');
  const [tarifas, setTarifas]             = useState<Tarifa[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [form, setForm] = useState({
    nombreCompleto: '',
    telefono: '',
    email: '',
    adultos: 1,
    menores9: 0,
    menores3: 0,
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const cuposLibres = disponibilidad?.libre ?? salida.cupoTotal;
  const paradasOrdenadas = [...(salida.ruta?.paradas ?? [])].sort((a, b) => a.orden - b.orden);
  const paradasMX  = paradasOrdenadas.filter(p => p.destino?.pais !== 'USA');
  const paradasUSA = paradasOrdenadas.filter(p => p.destino?.pais === 'USA');
  const tarifaSeleccionada = tarifas.find(t => t.paradaDestinoId === destinoId);

  const f = (key: string, val: string | number) => setForm(prev => ({ ...prev, [key]: val }));

  const seleccionarOrigen = async (pid: string) => {
    setOrigenId(pid);
    setDestinoId('');
    setTarifas([]);
    setDisponibilidad(null);
    if (!pid) return;
    setLoadingTarifas(true);
    try {
      const { data } = await api.get(`/rutas/${salida.ruta.id}/tarifas/desde/${pid}`);
      setTarifas(data);
    } finally {
      setLoadingTarifas(false);
    }
  };

  const seleccionarDestino = async (paradaDestinoId: string) => {
    setDestinoId(paradaDestinoId);
    setDisponibilidad(null);
    if (!paradaDestinoId || !origenId) return;
    try {
      const { data } = await api.get(
        `/reservaciones/disponibilidad/${salida.id}?origenId=${origenId}&destinoId=${paradaDestinoId}`,
      );
      setDisponibilidad(data);
    } catch { /* silently ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origenId || !destinoId) { setError('Selecciona origen y destino'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/reservaciones', {
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono,
        email: form.email,
        notas: form.notas,
        adultos: form.adultos,
        menores9: form.menores9,
        menores3: form.menores3,
        salidaId: salida.id,
        paradaOrigenId: origenId,
        paradaDestinoId: destinoId,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Ocurrió un error. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reservar viaje</h2>
            <p className="text-sm text-gray-500 mt-0.5">{salida.ruta?.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info de la salida */}
        <div className="mx-6 mt-5 bg-[#0f1b2d]/5 border border-[#0f1b2d]/10 rounded-xl px-4 py-3 flex items-center gap-3">
          <Calendar size={16} className="text-[#0f1b2d]/60 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#0f1b2d]">
              {formatFecha(salida.fechaSalida)}
            </p>
            <p className="text-xs text-[#0f1b2d]/60">
              Regreso: {formatFecha(salida.fechaRegreso)} · {salida.cupoTotal} asientos
            </p>
          </div>
          {disponibilidad && (
            <div className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
              disponibilidad.libre === 0 ? 'bg-red-100 text-red-700' :
              disponibilidad.libre <= 3 ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {disponibilidad.libre === 0 ? 'Sin lugares' : `${disponibilidad.libre} lugares`}
            </div>
          )}
        </div>

        {/* Éxito */}
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¡Reserva recibida!</h3>
            <p className="text-gray-500 text-sm mb-1">
              Gracias, <strong>{form.nombreCompleto}</strong>. Hemos registrado tu interés.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Nos pondremos en contacto contigo al {form.telefono} para confirmar tu lugar.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2f4e] transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Parada origen — solo ciudades México */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                🇲🇽 ¿Desde dónde abordas?
              </label>
              <div className="space-y-1.5">
                {paradasMX.map((p) => (
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
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {paradaNombre(p)}
                    </span>
                    {origenId === p.id && <span className="w-2 h-2 rounded-full bg-[#0f1b2d] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Parada destino */}
            {origenId && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  🇺🇸 ¿Hasta dónde vas?
                </label>
                {loadingTarifas && (
                  <p className="text-sm text-gray-400 text-center py-3">Cargando destinos...</p>
                )}
                {!loadingTarifas && tarifas.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Info size={14} />
                    No hay destinos disponibles desde esta parada
                  </div>
                )}
                {!loadingTarifas && tarifas.length > 0 && (
                  <div className="space-y-1.5">
                    {tarifas.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => seleccionarDestino(t.paradaDestinoId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          destinoId === t.paradaDestinoId
                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <span className="text-sm">🇺🇸</span>
                        <span className="flex-1 text-sm font-medium text-gray-800">
                          {paradaNombre(t.paradaDestino)}
                        </span>
                        <span className="text-sm font-bold text-[#0f1b2d]">
                          ${Number(t.precio).toLocaleString()} USD
                        </span>
                        {destinoId === t.paradaDestinoId && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Nombre completo
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required type="text"
                  placeholder="Tu nombre completo"
                  value={form.nombreCompleto}
                  onChange={(e) => f('nombreCompleto', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required type="tel"
                  placeholder="+52 55 1234 5678"
                  value={form.telefono}
                  onChange={(e) => f('telefono', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required type="email"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => f('email', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                />
              </div>
            </div>

            {/* Pasajeros por categoría */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Pasajeros</label>
              {disponibilidad ? (
                <p className="text-xs text-gray-400 -mt-1">
                  {disponibilidad.libre} lugar{disponibilidad.libre !== 1 ? 'es' : ''} disponible{disponibilidad.libre !== 1 ? 's' : ''} en este tramo
                </p>
              ) : (
                <p className="text-xs text-gray-400 -mt-1">{salida.cupoTotal} asientos en total</p>
              )}

              {/* Adultos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Adultos</p>
                  <p className="text-xs text-gray-400">Precio completo</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => f('adultos', Math.max(0, form.adultos - 1))}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center text-sm font-semibold">{form.adultos}</span>
                  <button type="button"
                    onClick={() => f('adultos', form.adultos + 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
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
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center text-sm font-semibold">{form.menores9}</span>
                  <button type="button"
                    onClick={() => f('menores9', form.menores9 + 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
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
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center text-sm font-semibold">{form.menores3}</span>
                  <button type="button"
                    onClick={() => f('menores3', form.menores3 + 1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center justify-center"
                  >+</button>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Notas adicionales <span className="text-gray-400 normal-case font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3.5 top-3 text-gray-400" />
                <textarea
                  rows={2}
                  placeholder="Necesidades especiales, preguntas..."
                  value={form.notas}
                  onChange={(e) => f('notas', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition resize-none"
                />
              </div>
            </div>

            {/* Total estimado */}
            {tarifaSeleccionada && (form.adultos + form.menores9 + form.menores3) > 0 && (() => {
              const precio = Number(tarifaSeleccionada.precio);
              const total =
                form.adultos  * precio +
                form.menores9 * Math.max(0, precio - 10) +
                form.menores3 * precio * 0.5;
              return (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
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
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Total estimado</span>
                    <span className="text-base font-bold text-[#0f1b2d]">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD</span>
                  </div>
                </div>
              );
            })()}

            <button
              type="submit"
              disabled={loading || !origenId || !destinoId || (form.adultos + form.menores9 + form.menores3) < 1}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enviando...' : 'Solicitar reserva'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Al enviar confirmas que los datos son correctos. Te contactaremos para coordinar el pago.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
