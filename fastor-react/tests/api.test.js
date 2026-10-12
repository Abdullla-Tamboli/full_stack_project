import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRestaurants, loginWithOtp, normalizeRestaurant, registerPhone } from '../src/lib/api';
import { cartTotal } from '../src/data/menu';
import { readSession } from '../src/lib/storage';

const ok = data => ({ ok: true, status: 200, json: async () => data });
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); sessionStorage.clear(); });
describe('documented Fastor API contract', () => {
  it('registers with form encoding and no authentication', async () => {
    fetch.mockResolvedValue(ok({ status: 'Success', status_code: 200 }));
    await registerPhone('9818979450');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://staging.fastor.ai/v1/pwa/user/register');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(new URLSearchParams(options.body).get('dial_code')).toBe('+91');
    expect(new URLSearchParams(options.body).get('phone')).toBe('9818979450');
    expect(options.headers.Authorization).toBeUndefined();
  });
  it('logs in with OTP and discards sensitive profile/password fields', async () => {
    fetch.mockResolvedValue(ok({ status: 'Success', data: { token: 'jwt', user_name: 'Karan', password: 'secret-profile-field' } }));
    expect(await loginWithOtp('9818979450', '123456')).toEqual({ token: 'jwt', name: 'Karan' });
    const body = new URLSearchParams(fetch.mock.calls[0][1].body);
    expect(body.get('otp')).toBe('123456');
    expect(body.get('dial_code')).toBe('+91');
  });
  it('rejects a failed login even when the HTTP status is 200', async () => {
    fetch.mockResolvedValue(ok({ status: 'Error', status_code: 401, message: 'Invalid OTP' }));
    await expect(loginWithOtp('9818979450', '000000')).rejects.toThrow('Invalid OTP');
  });
  it('rejects login responses without a token', async () => {
    fetch.mockResolvedValue(ok({ status: 'Success', data: {} }));
    await expect(loginWithOtp('9818979450', '123456')).rejects.toThrow('Login did not return a session');
  });
  it('loads actual data.results with a Bearer token and city ID', async () => {
    fetch.mockResolvedValue(ok({ status: 'Success', data: { results: [{ restaurant_id: '75', restaurant_name: 'VYB', address_complete: 'null', logo: 'https://example.com/logo.png' }], meta: { total_count: 56 } } }));
    const result = await fetchRestaurants('jwt');
    expect(fetch.mock.calls[0][0]).toBe('https://staging.fastor.ai/v1/m/restaurant?city_id=118');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt');
    expect(result.restaurants[0]).toEqual({ id: '75', name: 'VYB', image: 'https://example.com/logo.png', address: 'Address not provided' });
    expect(result.total).toBe(56);
  });
  it('provides a recoverable message for network failures', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(registerPhone('9818979450')).rejects.toThrow('Check your connection');
  });
  it('does not replace API failures with fabricated restaurant data', async () => {
    fetch.mockResolvedValue(ok({ status: 'Success', data: {} }));
    await expect(fetchRestaurants('jwt')).rejects.toThrow('expected format');
  });
});
it('rejects unsafe restaurant image URLs', () => {
  expect(normalizeRestaurant({ restaurant_id: 1, logo: 'javascript:alert(1)' }).image).toBe('/assets/pizza.jpg');
});
it('calculates portion-adjusted cart totals', () => {
  expect(cartTotal([{ quantity: 3, unitPrice: 14 }, { quantity: 2, unitPrice: 20 }])).toBe(82);
});
it('does not restore expired or malformed sessions', () => {
  sessionStorage.setItem('fastor-session', JSON.stringify({ token: `x.${btoa(JSON.stringify({ exp: 1 }))}.x`, name: 'Karan' }));
  expect(readSession()).toBeNull();
  sessionStorage.setItem('fastor-session', '{broken');
  expect(readSession()).toBeNull();
});
