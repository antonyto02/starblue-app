'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import api from '@/lib/api';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface Props {
  folder: string;
  aspect: '16/9' | '1/1';
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ folder, aspect, value, onChange, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`La imagen no debe superar ${MAX_SIZE_MB}MB`);
      return;
    }

    setUploading(true);
    try {
      const { data } = await api.post('/s3/presigned-url', { folder, contentType: file.type });
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      onChange(data.publicUrl);
    } catch {
      setError('Error al subir la imagen, intenta de nuevo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const aspectClass = aspect === '16/9' ? 'aspect-video' : 'aspect-square';
  const hint = aspect === '16/9' ? 'Recomendado: 1280x720px — formato banner horizontal' : 'Recomendado: 800x800px — formato cuadrado';

  return (
    <div className="space-y-1">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      <div
        className={`relative w-full ${aspectClass} rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-blue-400 transition-colors`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            {uploading
              ? <p className="text-sm">Subiendo...</p>
              : <>
                  <Upload size={24} />
                  <p className="text-sm">Haz clic para subir</p>
                </>
            }
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">{hint} · Máx. {MAX_SIZE_MB}MB · JPG, PNG, WEBP o AVIF</p>
      {error && <p className="text-xs text-red-500">{error}</p>}

      <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden" onChange={handleFile} />
    </div>
  );
}
