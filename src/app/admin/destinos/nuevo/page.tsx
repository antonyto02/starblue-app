'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import { ArrowLeft, Plane, FileText, Image as ImageIcon, CheckCircle, Images, ArrowRight } from 'lucide-react';

export default function NuevoDestinoPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ nombre: '', descripcion: '', imagenPortada: '', direccionAbordaje: '', pais: 'MX' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [creado, setCreado]   = useState<{ id: string; nombre: string } | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Countdown tick
  useEffect(() => {
    if (!creado) return;
    const t = setInterval(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [creado]);

  // Redirect when countdown hits 0
  useEffect(() => {
    if (creado && countdown <= 0) {
      router.push(`/admin/destinos/${creado.id}`);
    }
  }, [countdown, creado, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/destinos', form);
      setCreado({ id: data.id, nombre: data.nombre });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear destino');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (creado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          {/* Animated checkmark */}
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
            ¡Destino creado!
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            <span className="font-semibold text-gray-600">{creado.nombre}</span> ya está en tu catálogo.
          </p>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/admin/destinos/${creado.id}`)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: '#0f1b2d', color: '#fff' }}
            >
              <div className="flex items-center gap-2.5">
                <Images size={16} />
                <div className="text-left">
                  <p>Agregar imágenes</p>
                  <p className="text-xs font-normal opacity-60">Portada y galería del destino</p>
                </div>
              </div>
              <ArrowRight size={15} className="opacity-60" />
            </button>

            <Link
              href="/admin/destinos"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ver todos los destinos
            </Link>
          </div>

          {/* Countdown */}
          <p className="text-xs text-gray-300 mt-6">
            Redirigiendo a imágenes en {countdown}s...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <Link
          href="/admin/destinos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft size={15} />
          Volver a destinos
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0f1b2d] rounded-xl flex items-center justify-center">
            <Plane size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nuevo destino</h1>
            <p className="text-sm text-gray-400">Completa la información básica. La galería se agrega después.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Columna izquierda — datos */}
          <div className="lg:col-span-3 space-y-5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Nombre */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Información general</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
                  <div className="flex gap-2">
                    {(['MX', 'USA'] as const).map(p => (
                      <button key={p} type="button"
                        onClick={() => setForm({ ...form, pais: p })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          form.pais === p
                            ? 'bg-[#0f1b2d] text-white border-[#0f1b2d]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {p === 'MX' ? '🇲🇽 México' : '🇺🇸 Estados Unidos'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre del destino
                  </label>
                  <input
                    required
                    placeholder="Ej: Nueva York, Las Vegas, Orlando..."
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe el destino, qué incluye, qué pueden esperar los viajeros..."
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dirección de abordaje <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Shell, 60 I-80BUS, Wendover, UT 84083"
                    value={form.direccionAbordaje}
                    onChange={(e) => setForm({ ...form, direccionAbordaje: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d] transition"
                  />
                </div>
              </div>
            </div>


          </div>

          {/* Columna derecha — imagen + acción */}
          <div className="lg:col-span-2 space-y-5">

            {/* Imagen de portada */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon size={13} className="text-gray-500" />
                </div>
                <h2 className="text-sm font-semibold text-gray-700">Imagen de portada</h2>
              </div>
              <ImageUploader
                folder="destinos/portadas"
                aspect="16/9"
                label=""
                value={form.imagenPortada}
                onChange={(url) => setForm({ ...form, imagenPortada: url })}
              />
              <p className="text-xs text-gray-400 mt-3">
                Esta imagen aparece en el banner del destino. Usa formato horizontal (16:9), mínimo 1280×720px.
              </p>
            </div>

            {/* Info galería */}
            <div className="bg-[#0f1b2d]/5 border border-[#0f1b2d]/10 rounded-2xl px-4 py-3.5">
              <p className="text-xs text-[#0f1b2d]/70 font-medium">
                📸 La galería de fotos cuadradas se agrega desde la pantalla de edición, una vez creado el destino.
              </p>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f1b2d] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1a2f4e] disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Creando destino...' : 'Crear destino'}
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}
