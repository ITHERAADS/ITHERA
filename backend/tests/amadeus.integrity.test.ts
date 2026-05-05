import { getAmadeusAccessToken, amadeusGet } from '../src/infrastructure/external-apis/amadeus.service';

describe('Amadeus API Integrity Test', () => {
  beforeEach(() => {
    // Save original env
    process.env.AMADEUS_CLIENT_ID = 'test_id';
    process.env.AMADEUS_CLIENT_SECRET = 'test_secret';
    process.env.AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    process.env.AMADEUS_BASE_URL = 'https://test.api.amadeus.com';
  });

  it('should return 401 or throw error if credentials are invalid (not hang)', async () => {
    try {
      await getAmadeusAccessToken();
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toMatch(/No se pudo autenticar con Amadeus/);
    }
  });
});
