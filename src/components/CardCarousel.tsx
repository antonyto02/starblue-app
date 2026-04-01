'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

interface Props {
  images: string[];       // urls ordenadas
  alt: string;
  interval?: number;      // ms, default 5000
}

export default function CardCarousel({ images, alt, interval = 5000 }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrent((c) => (c - 1 + images.length) % images.length);
    },
    [images.length],
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrent((c) => (c + 1) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [paused, images.length, interval]);

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <ImageOff size={32} className="text-gray-300" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full group/carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {images.map((url, i) => (
        <div
          key={url}
          className={`absolute inset-0 transition-opacity duration-500 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image src={url} alt={alt} fill className="object-cover" />
        </div>
      ))}

      {/* Flechas — solo si hay más de 1 imagen */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronRight size={14} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-4 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
