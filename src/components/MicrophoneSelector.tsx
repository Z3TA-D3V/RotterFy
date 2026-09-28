import { useCallback, useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  refreshKey?: number;
}

export function MicrophoneSelector({ value, onChange, disabled = false, refreshKey = 0 }: Props) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      setDevices(available.filter((device) => device.kind === 'audioinput' && device.deviceId));
      setError('');
    } catch { setError('No se pudieron consultar los micrófonos.'); }
  }, []);

  useEffect(() => {
    void refresh();
    const media = navigator.mediaDevices;
    media?.addEventListener?.('devicechange', refresh);
    return () => media?.removeEventListener?.('devicechange', refresh);
  }, [refresh, refreshKey]);

  async function detect() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('El navegador no permite acceder al micrófono en este contexto.');
      return;
    }
    setBusy(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo acceder a los micrófonos.');
    } finally { setBusy(false); }
  }

  return <div className="flex flex-wrap items-end gap-2">
    <label className="min-w-48 flex-1 text-xs text-neutral-400">Micrófono
      <select aria-label="Micrófono" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || busy}
        className="mt-1 block w-full rounded-lg border border-white/10 bg-[#242638] p-2 text-sm text-white disabled:opacity-50">
        <option value="">Predeterminado del sistema</option>
        {value && !devices.some((device) => device.deviceId === value) && <option value={value}>Micrófono guardado (sin detectar)</option>}
        {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Micrófono ${index + 1}`}</option>)}
      </select>
    </label>
    <button type="button" onClick={detect} disabled={disabled || busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/15 disabled:opacity-50">
      {busy ? 'Buscando…' : 'Detectar micrófonos'}
    </button>
    {error && <p role="alert" className="w-full text-xs text-rose-300">{error}</p>}
  </div>;
}
