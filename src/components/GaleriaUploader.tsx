'use client';

import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import api from '@/lib/api';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface Props {
  destinoId: string;
  imagenes: { id: string; url: string; orden: number }[];
  onUpdate: () => void;
}

export default function GaleriaUploader({ destinoId, imagenes, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;

      const { data } = await api.post('/s3/presigned-url', { folder: `destinos/${destinoId}/galeria`, contentType: file.type });
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await api.post(`/destinos/${destinoId}/galeria`, { url: data.publicUrl });
    }

    onUpdate();
    e.target.value = '';
  };

  const eliminar = async (imagenId: string) => {
    await api.delete(`/destinos/galeria/${imagenId}`);
    onUpdate();
  };

  const ordenadas = [...imagenes].sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Galería de fotos</p>
      <p className="text-xs text-gray-400">Recomendado: 800x800px · Máx. {MAX_SIZE_MB}MB por foto · JPG, PNG, WEBP o AVIF</p>

      <div className="grid grid-cols-3 gap-3">
        {ordenadas.map((img) => (
          <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => eliminar(img.id)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
            >
              <X size={12} />
            </button>
            {img.orden === 0 && (
              <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">Principal</span>
            )}
          </div>
        ))}

        {/* Botón agregar */}
        <div
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors text-gray-400 gap-1"
        >
          <Upload size={20} />
          <span className="text-xs">Agregar</span>
        </div>
      </div>

      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple className="hidden" onChange={handleFiles} />
    </div>
  );
}
