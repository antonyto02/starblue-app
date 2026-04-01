'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Image from 'next/image';
import { LogIn, MessageCircle, ArrowRight, MapPin, Clock, Shield } from 'lucide-react';
import BannerCarousel from '@/components/BannerCarousel';
import ReservaModal from '@/components/ReservaModal';

type TipoSeccion = 'BANNER' | 'DESTACADOS' | 'PROXIMAS_SALIDAS' | 'PERSONALIZADA';

interface ImagenGaleria { id: string; url: string; orden: number; }

interface DestinoEnSeccion {
  id: string;
  orden: number;
  destino: {
    id: string; nombre: string; descripcion: string;
    imagenPortada: string | null; galeria: ImagenGaleria[];
  };
}

interface Seccion {
  id: string; titulo: string; tipo: TipoSeccion;
  orden: number; activo: boolean; destinos: DestinoEnSeccion[];
}

interface Salida {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  cupoTotal: number;
  estado: string;
  ruta: {
    id: string;
    nombre: string;
    paradas: { id: string; orden: number; destino: { nombre: string; imagenPortada?: string | null; galeria?: ImagenGaleria[] } }[];
  };
}

const diffDias = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export default function HomePage() {
  const [secciones, setSecciones]       = useState<Seccion[]>([]);
  const [salidas, setSalidas]           = useState<Salida[]>([]);
  const [loading, setLoading]           = useState(true);
  const [salidaReserva, setSalidaReserva] = useState<Salida | null>(null);
  const [sessionUser, setSessionUser]   = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setSessionUser(JSON.parse(stored));
  }, []);

  const panelHref = sessionUser?.role === 'ADMIN' ? '/admin' : '/empleado';

  useEffect(() => {
    Promise.all([
      api.get('/home/layout').then(r => setSecciones(r.data)),
      api.get('/salidas/proximas').then(r => setSalidas(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const bannerSeccion = secciones.find(s => s.tipo === 'BANNER' && s.activo);
  const bannerSlides  = bannerSeccion
    ? [...bannerSeccion.destinos].sort((a, b) => a.orden - b.orden)
        .map(sd => ({ ...sd.destino, href: `/destinos/${sd.destino.id}` }))
    : [];

  const otrosSecciones = secciones.filter(s => s.tipo !== 'BANNER' && s.activo);

  // Picks 4-5 key stops from a long list
  const keyStops = (paradas: Salida['ruta']['paradas']): string[] => {
    const names = paradas.map(p => p.destino?.nombre).filter(Boolean) as string[];
    if (names.length <= 5) return names;
    return [names[0], names[1], '···', names[names.length - 2], names[names.length - 1]];
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Image src="/logo.png" alt="Starblue" width={110} height={36} className="object-contain" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#destinos" className="hover:text-gray-900 transition-colors">Destinos</a>
            <a href="#salidas"  className="hover:text-gray-900 transition-colors">Próximas salidas</a>
            <a href="https://wa.me/524921234567" target="_blank" rel="noopener noreferrer"
               className="hover:text-gray-900 transition-colors">Contacto</a>
          </div>
          {sessionUser && (
            <Link href={panelHref}
              className="flex items-center gap-2 bg-[#0f1b2d] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#1a2f4e] transition-colors">
              <LogIn size={14} /> Ir al panel
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      {loading && <div className="h-[88vh] bg-gray-100 animate-pulse" />}

      {!loading && (
        bannerSlides.length > 0
          ? <BannerCarousel slides={bannerSlides} />
          : (
            <div className="relative min-h-[88vh] bg-[#0a1628] flex items-center overflow-hidden">
              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

              <div className="relative max-w-4xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/70 text-xs font-medium px-4 py-2 rounded-full mb-8 tracking-wide">
                  <MapPin size={12} />
                  México → Estados Unidos
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                  Tu próxima aventura<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    empieza aquí
                  </span>
                </h1>
                <p className="text-white/50 text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
                  Viajes en autobús desde las principales ciudades de México hasta los destinos más emocionantes de EE. UU.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <a href="#salidas"
                    className="flex items-center gap-2 bg-white text-[#0a1628] font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-white/90 transition-all shadow-xl shadow-black/20">
                    Ver próximas salidas <ArrowRight size={15} />
                  </a>
                  <a href="https://wa.me/524921234567" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-7 py-3.5 rounded-full text-sm transition-all">
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )
      )}

      {/* ── Stats strip ─────────────────────────────────────────── */}
      {!loading && (
        <div className="border-y border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-gray-100">
            {[
              { icon: MapPin,  value: '34+',         label: 'Destinos' },
              { icon: Clock,   value: 'Semanales',   label: 'Salidas programadas' },
              { icon: Shield,  value: 'Puerta a puerta', label: 'Servicio incluido' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-4 text-center">
                <Icon size={18} className="text-gray-300 mb-0.5" />
                <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content sections ────────────────────────────────────── */}
      <div id="destinos" className="space-y-28 py-24">
        {otrosSecciones.map((seccion, sIdx) => {

          /* ── PRÓXIMAS SALIDAS ── */
          if (seccion.tipo === 'PROXIMAS_SALIDAS') {
            return (
              <section key={seccion.id} id="salidas" className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-2">
                      Calendario
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                      {seccion.titulo}
                    </h2>
                  </div>
                </div>

                {salidas.length === 0 ? (
                  <p className="text-gray-400 text-center py-16">Próximamente nuevas salidas.</p>
                ) : (
                  <div className="space-y-3">
                    {salidas.map(s => {
                      const paradas = [...(s.ruta?.paradas ?? [])].sort((a, b) => a.orden - b.orden);
                      const stops   = keyStops(paradas);
                      const dias    = diffDias(s.fechaSalida, s.fechaRegreso);
                      const d       = new Date(s.fechaSalida + 'T00:00:00');
                      const dia     = d.getDate();
                      const mes     = d.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
                      const anio    = d.getFullYear();

                      return (
                        <div key={s.id}
                          className="group flex items-stretch rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 bg-white cursor-pointer"
                          onClick={() => setSalidaReserva(s)}>
                          {/* Date block */}
                          <div className="flex-shrink-0 w-20 bg-[#0f1b2d] flex flex-col items-center justify-center text-white">
                            <span className="text-2xl font-bold leading-none">{dia}</span>
                            <span className="text-[10px] font-bold text-white/50 mt-1 tracking-widest">{mes}</span>
                            <span className="text-[10px] text-white/25 mt-0.5">{anio}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 px-5 py-4 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{s.ruta?.nombre}</p>
                            {/* Stop chips */}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {stops.map((stop, i) => (
                                <span key={i} className={`text-[11px] font-medium ${
                                  stop === '···'
                                    ? 'text-gray-300 px-0.5'
                                    : 'bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'
                                }`}>
                                  {stop === '···' ? '→ ··· →' : stop}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Right */}
                          <div className="flex-shrink-0 flex flex-col items-end justify-center gap-2 px-5 py-4">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                              {dias}d
                            </span>
                            <span className="text-xs font-semibold text-[#0f1b2d] group-hover:underline">
                              Ver precios →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          }

          /* ── DESTACADOS / PERSONALIZADA ── */
          const destinos = [...seccion.destinos].sort((a, b) => a.orden - b.orden);
          if (destinos.length === 0) return null;

          return (
            <section key={seccion.id} className="max-w-7xl mx-auto px-4">
              {/* Header */}
              <div className="mb-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-2">
                  {seccion.tipo === 'DESTACADOS' ? 'Destinos populares' : 'Selección especial'}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  {seccion.titulo}
                </h2>
              </div>

              {/* Bento grid — primer card featured */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {destinos.map((sd, i) => {
                  const imgSrc = sd.destino.imagenPortada
                    || ([...sd.destino.galeria].sort((a, b) => a.orden - b.orden)[0]?.url ?? null);

                  const isFeatured = i === 0 && destinos.length > 2;
                  const aspectClass = isFeatured
                    ? 'col-span-2 md:col-span-2 aspect-[16/9] md:aspect-[16/8]'
                    : 'col-span-1 aspect-[4/5]';

                  return (
                    <Link key={sd.id} href={`/destinos/${sd.destino.id}`}
                      className={`group relative ${aspectClass} rounded-3xl overflow-hidden bg-[#0f1b2d] block`}>

                      {imgSrc ? (
                        <Image src={imgSrc} alt={sd.destino.nombre} fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1b2d] to-[#1a3a5c] flex items-center justify-center">
                          <span className="text-white/10 text-8xl font-black select-none">
                            {sd.destino.nombre.charAt(0)}
                          </span>
                        </div>
                      )}

                      {/* Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                        <h3 className={`text-white font-bold tracking-tight leading-tight ${isFeatured ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>
                          {sd.destino.nombre}
                        </h3>
                        {isFeatured && sd.destino.descripcion && (
                          <p className="text-white/60 text-sm mt-1.5 line-clamp-1 hidden md:block">
                            {sd.destino.descripcion}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                            Explorar <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Empty state */}
        {!loading && otrosSecciones.filter(s => s.tipo !== 'PROXIMAS_SALIDAS').length === 0
          && salidas.length === 0 && (
          <div className="text-center py-20 text-gray-300">
            <p className="text-5xl mb-4">✈️</p>
            <p className="text-sm font-medium">Próximamente nuevos destinos.</p>
          </div>
        )}
      </div>

      {/* ── Dark CTA strip ──────────────────────────────────────── */}
      {!loading && (
        <div className="bg-[#0a1628] py-20 px-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent pointer-events-none" />
          <div className="max-w-2xl mx-auto text-center relative">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">
              ¿Tienes preguntas?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Platica con nosotros<br />por WhatsApp
            </h2>
            <p className="text-white/40 mb-8 text-sm leading-relaxed">
              Respondemos rápido. Te ayudamos a elegir la mejor salida y el mejor precio para tu ruta.
            </p>
            <a href="https://wa.me/524921234567" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25d366] hover:bg-[#20bc59] text-white font-bold px-8 py-4 rounded-full text-sm transition-all hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:scale-105">
              <MessageCircle size={18} />
              Abrir WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-[#060e1a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <Image src="/logo.png" alt="Starblue" width={100} height={32}
              className="object-contain brightness-0 invert mb-4 opacity-80" />
            <p className="text-white/35 text-sm leading-relaxed max-w-sm">
              Tu empresa de viajes de confianza para rutas desde México hacia los mejores destinos de Estados Unidos.
            </p>
          </div>
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-4">Contacto</p>
            <a href="https://wa.me/524921234567" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-white/60 hover:text-white text-sm transition-colors">
              <MessageCircle size={15} className="text-[#25d366]" />
              +52 492 123 4567
            </a>
          </div>
        </div>
        <div className="border-t border-white/5 py-5 text-center text-white/20 text-xs">
          © {new Date().getFullYear()} Starblue. Todos los derechos reservados.
        </div>
      </footer>

      {/* ── Floating WhatsApp ────────────────────────────────────── */}
      <a href="https://wa.me/524921234567" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25d366] hover:bg-[#20bc59] text-white rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(37,211,102,0.5)] transition-all hover:scale-110"
        aria-label="WhatsApp">
        <MessageCircle size={24} />
      </a>

      {salidaReserva && <ReservaModal salida={salidaReserva} onClose={() => setSalidaReserva(null)} />}
    </div>
  );
}
