        import CircuitBreaker from 'opossum';
import { amadeusGet } from './amadeus.service';

const breakerOptions = {
  timeout: 8000,                  // Si tarda más de 8s → falla
  errorThresholdPercentage: 50,   // Si el 50% de llamadas fallan → abre el circuito
  resetTimeout: 30_000,           // Después de 30s → intenta de nuevo (half-open)
  volumeThreshold: 5,             // Mínimo 5 llamadas antes de poder abrir
};

const breaker = new CircuitBreaker(amadeusGet, breakerOptions);

breaker.on('open',     () => console.warn( '[CircuitBreaker] 🔴 ABIERTO  — Amadeus no disponible'));
breaker.on('halfOpen', () => console.info( '[CircuitBreaker] 🟡 SEMI-ABIERTO — Probando Amadeus...'));
breaker.on('close',    () => console.info( '[CircuitBreaker] 🟢 CERRADO  — Amadeus disponible'));
breaker.on('fallback', (result: unknown) => console.warn('[CircuitBreaker] ⚠️ Fallback activado:', result));
breaker.on('reject',   () => console.warn( '[CircuitBreaker] ❌ Llamada rechazada — circuito abierto'));

export async function amadeusGetWithBreaker<T>(
  path: string,
  query: Record<string, string | number | undefined>
): Promise<T> {
  try {
    return (await breaker.fire(path, query)) as T;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(`[CircuitBreaker] Llamada a Amadeus fallida: ${msg}`);
  }
}