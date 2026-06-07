import { useEffect, useState } from 'react';

// Tempo de Luanda via Open-Meteo (gratuito, sem chave). Dados reais; se offline,
// degrada para "indisponível" sem partir a página.

const LUANDA = { lat: -8.839, lon: 13.289 };

type Current = { temp: number; code: number };

/** Código WMO → ícone + descrição (pt). */
function describe(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' };
  if (code <= 2) return { icon: '🌤️', label: 'Parc. nublado' };
  if (code === 3) return { icon: '☁️', label: 'Nublado' };
  if (code <= 48) return { icon: '🌫️', label: 'Nevoeiro' };
  if (code <= 67) return { icon: '🌦️', label: 'Chuva' };
  if (code <= 77) return { icon: '🌨️', label: 'Neve' };
  if (code <= 82) return { icon: '🌧️', label: 'Aguaceiros' };
  return { icon: '⛈️', label: 'Trovoada' };
}

export function WeatherWidget() {
  const [cur, setCur] = useState<Current | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LUANDA.lat}&longitude=${LUANDA.lon}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d?.current) setCur({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        else setErr(true);
      })
      .catch(() => setErr(true));
  }, []);

  const d = cur ? describe(cur.code) : null;
  return (
    <div className="widget">
      <div className="widget-h">
        <span>🌤 Tempo</span>
        <span className="muted small">Luanda</span>
      </div>
      {err ? (
        <p className="muted small">Indisponível offline.</p>
      ) : !cur ? (
        <p className="muted small">A carregar…</p>
      ) : (
        <div className="weather">
          <span className="weather-temp">{cur.temp}°</span>
          <span className="weather-desc">{d!.icon} {d!.label}</span>
        </div>
      )}
    </div>
  );
}
