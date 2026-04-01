import { useEffect, useState } from 'react';
import api from './api';

interface AppConfig {
  tipo_cambio: number;
}

// Module-level cache with invalidation support
let cachedConfig: AppConfig | null = null;
const listeners = new Set<() => void>();

export function invalidateConfig() {
  cachedConfig = null;
  listeners.forEach(fn => fn());
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(cachedConfig ?? { tipo_cambio: 20 });

  useEffect(() => {
    const refresh = () => {
      api.get('/config').then(({ data }) => {
        cachedConfig = { tipo_cambio: parseFloat(data.tipo_cambio ?? '20') };
        setConfig({ ...cachedConfig });
      }).catch(() => {});
    };

    listeners.add(refresh);

    if (!cachedConfig) refresh();
    else setConfig({ ...cachedConfig });

    return () => { listeners.delete(refresh); };
  }, []);

  const toMXN = (usd: number) => Math.round(usd * config.tipo_cambio);

  return { config, toMXN };
}
