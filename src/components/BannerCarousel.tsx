'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ImageOff, MapPin } from 'lucide-react';

interface BannerSlide {
  id: string;
  nombre: string;
  descripcion?: string;
  imagenPortada: string | null;
  href?: string;
}

interface Props {
  slides: BannerSlide[];
  height?: string;
  autoplay?: boolean;
  interval?: number;
}

export default function BannerCarousel({
  slides,
  height = 'h-[88vh]',
  autoplay = true,
  interval = 5000,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(() =>
    setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  const next = useCallback(() =>
    setCurrent((c) => (c + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (!autoplay || paused || slides.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoplay, paused, slides.length, next, interval]);

  if (slides.length === 0) {
    return (
      <div className={`${height} bg-[#0f1b2d] flex items-center justify-center`}>
        <div className="text-center text-white/40">
          <ImageOff size={48} className="mx-auto mb-3" />
          <p className="text-sm">Sin imágenes en el banner</p>
        </div>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div
      className={`relative ${height} overflow-hidden bg-gray-900`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {s.imagenPortada ? (
            <Image
              src={s.imagenPortada}
              alt={s.nombre}
              fill
              className="object-cover scale-105"
              priority={i === 0}
            />
          ) : (
            <div className="w-full h-full bg-[#0f1b2d]" />
          )}
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

      {/* Slide content */}
      <div className="absolute bottom-0 left-0 right-0 px-8 pb-20 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-white/60 text-sm font-medium uppercase tracking-widest mb-3">
            <MapPin size={14} />
            <span>Estados Unidos</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-4 leading-tight tracking-tight">
            {slide.nombre}
          </h2>
          {slide.descripcion && (
            <p className="text-white/70 text-lg max-w-xl line-clamp-2 mb-6 leading-relaxed">
              {slide.descripcion}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {slide.href && (
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 border border-white/50 hover:border-white text-white text-sm font-semibold px-5 py-2.5 rounded-full backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                Explorar destino →
              </Link>
            )}
            {slide.href && (
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 bg-white text-[#0f1b2d] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-all"
              >
                Reservar ahora
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white rounded-full p-4 transition-all border border-white/20 hover:border-white/50"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={next}
            className="absolute right-5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white rounded-full p-4 transition-all border border-white/20 hover:border-white/50"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {autoplay && !paused && slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
          <div
            key={current}
            className="h-full bg-white/60 origin-left"
            style={{ animation: `progress ${interval}ms linear` }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
