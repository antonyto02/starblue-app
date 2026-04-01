'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Bienvenido, {user.name}</h1>
        <p className="text-gray-500">{user.email}</p>
        <span className="inline-block bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
          {user.role}
        </span>
        <div>
          <button
            onClick={logout}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
