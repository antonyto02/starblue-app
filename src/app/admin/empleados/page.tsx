'use client';

import { useEffect, useState } from 'react';
import {
  UserPlus, Users, Eye, EyeOff, KeyRound,
  CheckCircle, X, Mail, User, Lock, Plus,
} from 'lucide-react';
import api from '@/lib/api';

interface Empleado {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface StatsEmpleado {
  empleadoId: string;
  totalReservas: number;
  reservasConfirmadas: number;
  pasajerosConfirmados: number;
}

const inputStyle = {
  border: '1px solid var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text-primary)',
};

export default function AdminEmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [stats, setStats]         = useState<StatsEmpleado[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resetId, setResetId]     = useState<string | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [saved, setSaved]         = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [creando, setCreando]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/users/empleados').then(r => setEmpleados(r.data)),
      api.get('/reservaciones/empleados/stats').then(r => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const refetch = () =>
    Promise.all([
      api.get('/users/empleados').then(r => setEmpleados(r.data)),
      api.get('/reservaciones/empleados/stats').then(r => setStats(r.data)),
    ]);

  const crearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true); setError('');
    try {
      await api.post('/users/empleados', form);
      setForm({ name: '', email: '', password: '' });
      setShowModal(false);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear empleado');
    } finally { setCreando(false); }
  };

  const toggleActive = async (id: string) => {
    await api.patch(`/users/empleados/${id}/toggle`);
    refetch();
  };

  const resetPassword = async () => {
    if (!resetPass.trim() || !resetId) return;
    await api.patch(`/users/empleados/${resetId}/password`, { password: resetPass });
    setResetId(null); setResetPass('');
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const getStats = (id: string) => stats.find(s => s.empleadoId === id);
  const activos = empleados.filter(e => e.isActive).length;

  const modalInputClass = "w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition";

  return (
    <div className="px-8 pt-10 pb-10 space-y-6">

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle size={16} /> Guardado correctamente
        </div>
      )}

      {/* ── Modal: nuevo empleado ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md p-6" style={{ background: 'var(--admin-surface)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--admin-text-primary)' }}>Nuevo empleado</h2>
              <button onClick={() => { setShowModal(false); setError(''); }} style={{ color: 'var(--admin-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
            )}

            <form onSubmit={crearEmpleado} className="space-y-4">
              {[
                { label: 'Nombre completo', type: 'text',     placeholder: 'Nombre del empleado',  key: 'name',     icon: User },
                { label: 'Correo electrónico', type: 'email', placeholder: 'correo@ejemplo.com',   key: 'email',    icon: Mail },
                { label: 'Contraseña inicial', type: 'password', placeholder: 'Mínimo 6 caracteres', key: 'password', icon: Lock },
              ].map(({ label, type, placeholder, key, icon: Icon }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-text-tertiary)' }}>
                    {label}
                  </label>
                  <div className="relative">
                    <Icon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
                    <input required type={type} placeholder={placeholder} minLength={key === 'password' ? 6 : undefined}
                      value={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className={modalInputClass} style={inputStyle} />
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creando}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                  style={{ background: 'var(--admin-text-primary)', color: '#fff' }}
                >
                  {creando ? 'Creando...' : 'Crear empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: reset contraseña ── */}
      {resetId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ background: 'var(--admin-surface)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--admin-text-primary)' }}>Cambiar contraseña</h2>
              <button onClick={() => { setResetId(null); setResetPass(''); }} style={{ color: 'var(--admin-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="relative mb-4">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-tertiary)' }} />
              <input type="password" placeholder="Nueva contraseña" minLength={6}
                value={resetPass} onChange={e => setResetPass(e.target.value)}
                className={modalInputClass} style={inputStyle} autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setResetId(null); setResetPass(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                Cancelar
              </button>
              <button onClick={resetPassword} disabled={resetPass.length < 6}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                style={{ background: 'var(--admin-text-primary)', color: '#fff' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Title + button ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[38px] font-bold tracking-tight" style={{ color: 'var(--admin-text-primary)', letterSpacing: '-0.03em' }}>
            Empleados
          </h1>
          {!loading && (
            <p className="text-xl mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>
              {activos} activos de {empleados.length}
            </p>
          )}
        </div>

        {!loading && (
          <button onClick={() => setShowModal(true)} className="flex flex-col items-center gap-1 group mb-1">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 border-black"
              style={{ background: 'transparent', color: 'black' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'black'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'black'; }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Nuevo empleado</span>
          </button>
        )}
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: 'var(--admin-surface)' }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && empleados.length === 0 && (
        <div className="rounded-2xl py-24 text-center" style={{ background: 'var(--admin-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--admin-bg)' }}>
            <Users size={22} style={{ color: 'var(--admin-text-tertiary)' }} />
          </div>
          <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>Sin empleados registrados</p>
          <p className="text-[13px] mt-1.5 mb-6" style={{ color: 'var(--admin-text-tertiary)' }}>
            Crea el primero para que puedan registrar reservas
          </p>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: 'transparent', color: 'var(--admin-text-primary)', border: '2px solid var(--admin-text-primary)' }}
          >
            <UserPlus size={14} /> Nuevo empleado
          </button>
        </div>
      )}

      {/* ── Lista ── */}
      {!loading && empleados.length > 0 && (
        <div className="space-y-3">
          {empleados.map(emp => {
            const s = getStats(emp.id);
            return (
              <div key={emp.id}
                className="rounded-2xl overflow-hidden transition-opacity"
                style={{
                  background: 'var(--admin-surface)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px var(--admin-border-light)',
                  opacity: emp.isActive ? 1 : 0.55,
                }}
              >
                <div className="flex items-center gap-5 px-6 py-5">

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ background: 'var(--admin-text-primary)' }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[15px]" style={{ color: 'var(--admin-text-primary)' }}>{emp.name}</p>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: emp.isActive ? 'rgba(22,163,74,0.1)' : 'var(--admin-bg)',
                          color:      emp.isActive ? '#16a34a' : 'var(--admin-text-tertiary)',
                        }}>
                        {emp.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-tertiary)' }}>{emp.email}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-8 text-center flex-shrink-0">
                    {[
                      { val: s?.totalReservas ?? 0,        label: 'Reservas',    color: 'var(--admin-text-primary)' },
                      { val: s?.reservasConfirmadas ?? 0,  label: 'Confirmadas', color: '#22c55e'                    },
                      { val: s?.pasajerosConfirmados ?? 0, label: 'Pasajeros',   color: 'var(--admin-accent)'        },
                    ].map(({ val, label, color }) => (
                      <div key={label}>
                        <p className="text-xl font-bold leading-none" style={{ color }}>{val}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-tertiary)' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0 pl-5" style={{ borderLeft: '1px solid var(--admin-border-light)' }}>
                    <button onClick={() => { setResetId(emp.id); setResetPass(''); }} title="Cambiar contraseña"
                      className="p-2 rounded-xl transition-colors"
                      style={{ color: 'var(--admin-text-tertiary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-primary)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'; }}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button onClick={() => toggleActive(emp.id)} title={emp.isActive ? 'Desactivar' : 'Activar'}
                      className="p-2 rounded-xl transition-colors"
                      style={{ color: 'var(--admin-text-tertiary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--admin-bg)'; (e.currentTarget as HTMLElement).style.color = emp.isActive ? '#f59e0b' : '#16a34a'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-tertiary)'; }}
                    >
                      {emp.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
