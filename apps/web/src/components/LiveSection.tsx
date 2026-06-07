import { LiveCard, useLiveStatus } from './LiveCard';

// Secção "Ao Vivo" da Home. Reutiliza o componente base único (LiveCard) — o card
// está sempre presente (live ou "brevemente") e liga para a página dedicada.

export function LiveSection() {
  const { status } = useLiveStatus(8000);
  return <LiveCard status={status} ctaTo="/ao-vivo" />;
}
