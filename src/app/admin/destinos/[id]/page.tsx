'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Image as ImageIcon,
  Save, Eye, EyeOff, CheckCircle,
} from 'lucide-react';
import api from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import GaleriaUploader from '@/components/GaleriaUploader';

interface Destino {
  id: string;
  nombre: string;
  descripcion: string;
  imagenPortada: string;
  activo: boolean;
  pais: string;
  galeria: { id: string; url: string; orden: number }[];
}


export default function EditarDestinoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [destino, setDestino] = useState<Destino | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', imagenPortada: '', direccionAbordaje: '', pais: 'MX' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchDestino(); }, [id]);

  const fetchDestino = async () => {
    const { data } = await api.get(`/destinos/${id}`);
    setDestino(data);
    setForm({
      nombre: data.nombre,
      descripcion: data.descripcion,
      imagenPortada: data.imagenPortada ?? '',
      direccionAbordaje: data.direccionAbordaje ?? '',
      pais: data.pais ?? 'MX',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put(`/destinos/${id}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchDestino();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async () => {
    if (!destino) return;
    await api.put(`/destinos/${id}`, { activo: !destino.activo });
    fetchDestino();
  };

  if (!destino) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-sm" style={{ color: 'var(--admin-text-tertiary)' }}>Cargando destino...</div>
    </div>
  );

  return (
    <div className="h-full flex flex-col px-8 pt-10 pb-6">

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle size={16} /> Cambios guardados
        </div>
      )}

      {/* Title row */}
      <div className="flex items-end justify-between mb-6 flex-shrink-0">
        <div>
          <Link
            href="/admin/destinos"
            className="inline-flex items-center gap-1.5 text-xs mb-2 transition-colors"
            style={{ color: 'var(--admin-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'}
          >
            <ArrowLeft size={12} /> Destinos
          </Link>
          <h1
            className="text-[38px] font-bold tracking-tight"
            style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}
          >
            {destino.nombre}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: destino.activo ? 'rgba(22,163,74,0.12)' : 'var(--admin-border-light)',
              color: destino.activo ? '#16a34a' : 'var(--admin-text-tertiary)',
            }}
          >
            {destino.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            type="button"
            onClick={toggleActivo}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors"
            style={{
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
              background: 'var(--admin-surface)',
            }}
          >
            {destino.activo ? <EyeOff size={15} /> : <Eye size={15} />}
            {destino.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex gap-6 min-h-0">

        {/* Left: contenido único */}
        <div className="flex-1 min-w-0 max-w-xl flex flex-col min-h-0 overflow-y-auto gap-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Nombre + País */}
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>Nombre</label>
              {/* País inline toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--admin-bg)' }}>
                {(['MX', 'USA'] as const).map(p => (
                  <button key={p} type="button"
                    onClick={() => setForm({ ...form, pais: p })}
                    className="px-3 py-1 rounded-md text-[12px] font-medium transition-all"
                    style={{
                      background: form.pais === p ? 'var(--admin-surface)' : 'transparent',
                      color: form.pais === p ? 'var(--admin-text-primary)' : 'var(--admin-text-tertiary)',
                      boxShadow: form.pais === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {p === 'MX' ? '🇲🇽 México' : '🇺🇸 EUA'}
                  </button>
                ))}
              </div>
            </div>
            <input
              required
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Las Vegas, NV"
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
            />
          </div>

          {/* Descripción */}
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}
          >
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>Descripción</label>
            <textarea
              required
              rows={4}
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describe el destino, qué incluye, qué pueden esperar los viajeros..."
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition resize-none"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
            />
          </div>

          {/* Dirección de abordaje */}
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}
          >
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-tertiary)' }}>
              Dirección de abordaje <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={form.direccionAbordaje}
              onChange={e => setForm({ ...form, direccionAbordaje: e.target.value })}
              placeholder="Ej: Shell, 60 I-80BUS, Wendover, UT 84083"
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)' }}
            />
          </div>

          {/* Galería */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-tertiary)' }}>
              Galería
              <span className="ml-2 font-normal normal-case tracking-normal" style={{ color: 'var(--admin-text-tertiary)' }}>
                ({destino.galeria?.length ?? 0} fotos)
              </span>
            </p>
            <GaleriaUploader
              destinoId={id}
              imagenes={destino.galeria ?? []}
              onUpdate={fetchDestino}
            />
          </div>

        </div>

        {/* Right column */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-5 overflow-y-auto">

          {/* Imagen de portada */}
          <div className="rounded-2xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border-light)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
                <ImageIcon size={13} style={{ color: 'var(--admin-text-tertiary)' }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>Imagen de portada</h2>
            </div>
            <ImageUploader
              folder="destinos/portadas"
              aspect="16/9"
              label=""
              value={form.imagenPortada}
              onChange={url => setForm({ ...form, imagenPortada: url })}
            />
            <p className="text-xs mt-3" style={{ color: 'var(--admin-text-tertiary)' }}>
              Aparece como banner principal del destino. Usa formato 16:9, mínimo 1280×720px.
            </p>
          </div>

          {/* Guardar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            <Save size={15} />
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>

          {/* Danger zone */}
          <div className="rounded-2xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ef4444' }}>Zona de peligro</p>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`¿Eliminar el destino "${destino.nombre}"? Esta acción no se puede deshacer.`)) return;
                await api.delete(`/destinos/${id}`);
                router.push('/admin/destinos');
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              Eliminar destino
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
