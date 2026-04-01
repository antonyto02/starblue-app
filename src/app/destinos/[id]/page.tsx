'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import {
  ArrowLeft, Calendar, Users, ImageOff, MapPin, MessageCircle, LogIn,
} from 'lucide-react';
import ReservaModal from '@/components/ReservaModal';
import LoginModal from '@/components/LoginModal';

interface ImagenGaleria {
  id: string;
  url: string;
  orden: number;
}

interface Destino {
  id: string;
  nombre: string;
  descripcion: string;
  imagenPortada: string | null;
  galeria: ImagenGaleria[];
}

interface RutaParada {
  id: string;
  orden: number;
  destino: { nombre: string };
}

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  estado: string;
  ruta: { id: string; nombre: string; paradas: RutaParada[] };
}

const formatFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
  });

const formatFechaCorta = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

const diffDias = (inicio: string, fin: string) => {
  const a = new Date(inicio + 'T00:00:00');
  const b = new Date(fin + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

export default function DestinoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [destino, setDestino]             = useState<Destino | null>(null);
  const [salidas, setSalidas]             = useState<Salida[]>([]);
  const [loading, setLoading]             = useState(true);
  const [fotoActiva, setFotoActiva]       = useState<string | null>(null);
  const [salidaReserva, setSalidaReserva] = useState<Salida | null>(null);
  const [loginOpen, setLoginOpen]         = useState(false);
  const [sessionUser, setSessionUser]     = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setSessionUser(JSON.parse(stored));
  }, []);

  const panelHref = sessionUser?.role === 'ADMIN' ? '/admin' : '/empleado';

  useEffect(() => {
    Promise.all([
      api.get(`/destinos/${id}`).then((r) => setDestino(r.data)),
      api.get(`/salidas/proximas`).then((r) => setSalidas(r.data)),
    ])
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-[60vh] bg-gray-200 animate-pulse" />
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-5">
          <div className="h-10 bg-gray-200 rounded-xl w-72 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!destino) return null;

  const galeria = [...destino.galeria].sort((a, b) => a.orden - b.orden);
  const fotoHero = destino.imagenPortada;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="Starblue" width={120} height={40} className="object-contain" />
          </Link>
          {sessionUser ? (
            <Link
              href={panelHref}
              className="flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a2f4e] transition-colors"
            >
              <LogIn size={16} />
              Ir al panel
            </Link>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a2f4e] transition-colors"
            >
              <LogIn size={16} />
              Iniciar sesión
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-[65vh] bg-gray-900 overflow-hidden">
        {fotoHero ? (
          <Image src={fotoHero} alt={destino.nombre} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-[#0f1b2d] flex items-center justify-center">
            <ImageOff size={48} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full transition-colors border border-white/20"
        >
          <ArrowLeft size={15} />
          Volver
        </button>

        {/* Destination name + CTA */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-10">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                <MapPin size={13} />
                <span>Estados Unidos</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                {destino.nombre}
              </h1>
            </div>
            {salidas.length > 0 && (
              <div className="flex-shrink-0">
                <a
                  href="#salidas"
                  className="inline-flex items-center gap-2 bg-white text-[#0f1b2d] font-semibold px-6 py-3 rounded-full text-sm hover:bg-white/90 transition-all shadow-lg"
                >
                  <Calendar size={15} />
                  Ver {salidas.length} salida{salidas.length !== 1 ? 's' : ''} disponible{salidas.length !== 1 ? 's' : ''}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-14 space-y-16">

        {/* Description + WhatsApp */}
        <section className="grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Sobre este destino</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Conoce {destino.nombre}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-[15px]">{destino.descripcion}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Reserva tu lugar</p>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Consulta disponibilidad y tarifas directamente con nuestro equipo. Atención personalizada.
            </p>
            <a
              href={`https://wa.me/?text=Hola, me interesa el destino ${encodeURIComponent(destino.nombre)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25d366] hover:bg-[#20bc59] text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-md shadow-green-200"
            >
              <MessageCircle size={17} />
              Consultar por WhatsApp
            </a>
          </div>
        </section>

        {/* Gallery */}
        {galeria.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Imágenes</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Galería</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galeria.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setFotoActiva(img.url)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  <Image
                    src={img.url}
                    alt={destino.nombre}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Salidas */}
        <section id="salidas">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Calendario</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-7">Próximas salidas</h2>

          {salidas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-14 text-center">
              <Calendar size={36} className="mx-auto mb-4 text-gray-200" />
              <p className="text-gray-600 font-semibold mb-1">No hay salidas disponibles por el momento</p>
              <p className="text-gray-400 text-sm mb-5">Consulta con nosotros para fechas personalizadas</p>
              <a
                href={`https://wa.me/?text=Hola, quiero información sobre ${encodeURIComponent(destino.nombre)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-[#20bc59] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <MessageCircle size={15} />
                Consultar por WhatsApp
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {salidas.map((s) => {
                const dias = diffDias(s.fechaSalida, s.fechaRegreso);
                const dia  = new Date(s.fechaSalida + 'T00:00:00').getDate();
                const mes  = new Date(s.fechaSalida + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' });
                const anio = new Date(s.fechaSalida + 'T00:00:00').getFullYear();

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow"
                  >
                    {/* Date block */}
                    <div className="flex-shrink-0 bg-[#0f1b2d] text-white flex flex-col items-center justify-center px-7 py-5 sm:min-w-[100px]">
                      <span className="text-3xl font-bold leading-none">{dia}</span>
                      <span className="text-white/60 text-xs uppercase tracking-wider mt-1">{mes}</span>
                      <span className="text-white/30 text-xs mt-0.5">{anio}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-6 py-5 min-w-0">
                      <p className="font-bold text-gray-900 text-base">
                        {formatFecha(s.fechaSalida)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          Regreso: {formatFechaCorta(s.fechaRegreso)}
                        </span>
                        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                          {dias} días
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Users size={13} />
                          {s.cupoTotal} asientos · disponibilidad por tramo
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0 flex flex-col items-end justify-center px-6 py-5 gap-1.5">
                      <button
                        onClick={() => setSalidaReserva(s)}
                        className="flex items-center gap-1.5 bg-[#0f1b2d] hover:bg-[#1a2f4e] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                      >
                        <Calendar size={14} />
                        Ver precios y reservar
                      </button>
                      <p className="text-xs text-gray-400">Tarifas por tramo</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Footer minimal */}
      <footer className="bg-[#0f1b2d] mt-16 py-8 text-center text-white/30 text-xs">
        © {new Date().getFullYear()} Starblue. Todos los derechos reservados.
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/?text=Hola, me interesa el destino ${encodeURIComponent(destino.nombre)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25d366] hover:bg-[#20bc59] text-white rounded-full p-4 shadow-lg shadow-green-900/30 transition-all hover:scale-110"
        aria-label="WhatsApp"
      >
        <MessageCircle size={24} />
      </a>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}

      {salidaReserva && (
        <ReservaModal
          salida={salidaReserva}
          onClose={() => setSalidaReserva(null)}
        />
      )}

      {fotoActiva && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoActiva(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-xl"
            onClick={() => setFotoActiva(null)}
          >
            ✕
          </button>
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-square">
            <Image
              src={fotoActiva}
              alt="Foto"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
