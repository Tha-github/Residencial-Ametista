import { describe, expect, it } from 'vitest';
import { validateExternalUrl } from '../../src/lib/validation/urls';

describe('validateExternalUrl', () => {
  it.each([
    ['https://www.booking.com/hotel/br/exemplo.pt-br.html', 'booking'],
    ['https://m.booking.com/hotel/br/exemplo.html', 'booking'],
    ['https://www.airbnb.com.br/rooms/123', 'airbnb'],
    ['https://airbnb.com/rooms/123', 'airbnb'],
    ['https://www.decolar.com/hoteis/h-123', 'decolar'],
    ['https://maps.app.goo.gl/abc123', 'maps'],
    ['https://www.google.com/maps/dir/?api=1&destination=-27.43,-48.39', 'maps'],
    ['https://www.instagram.com/perfil', 'instagram'],
    ['https://wa.me/5548999999999', 'whatsapp'],
  ] as const)('aceita %s (%s)', (url, kind) => {
    expect(validateExternalUrl(url, kind).ok).toBe(true);
  });

  it.each([
    ['http://www.booking.com/hotel', 'booking', 'HTTPS'],
    ['javascript:alert(1)', 'booking', 'HTTPS'],
    ['https://evilbooking.com/hotel', 'booking', 'Domínio'],
    ['https://booking.com.evil.io/hotel', 'booking', 'Domínio'],
    ['https://user:pass@booking.com/', 'booking', 'credenciais'],
    ['https://booking.com:8443/', 'booking', 'porta'],
    ['https://www.google.com/search?q=x', 'maps', 'Caminho'],
    ['https://www.airbnb.com/rooms/1', 'booking', 'Domínio'],
    ['não é url', 'maps', 'inválida'],
  ] as const)('rejeita %s (%s)', (url, kind, reason) => {
    const result = validateExternalUrl(url, kind);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(reason);
  });
});
