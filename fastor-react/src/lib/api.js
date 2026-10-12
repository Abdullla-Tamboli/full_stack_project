const BASE = (import.meta.env.VITE_API_BASE_URL || 'https://staging.fastor.ai').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
async function request(path, { body, token, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: new URLSearchParams(body).toString() } : {}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Unable to reach Fastor. Check your connection and try again.');
  }
  const json = await response.json().catch(() => null);
  const failed = !response.ok || Number(json?.status_code) >= 400 || json?.success === false || /^(error|failed|failure)$/i.test(json?.status || '');
  if (failed) throw new ApiError(typeof json?.message === 'string' ? json.message : response.status === 401 ? 'Your session has expired. Please sign in again.' : 'Something went wrong. Please try again.', response.status === 401 || Number(json?.status_code) === 401 ? 401 : response.status);
  if (!json) throw new ApiError('Fastor returned an unexpected response. Please try again.');
  return json;
}
export function registerPhone(phone) { return request('/v1/pwa/user/register', { body: { phone, dial_code: '+91' } }); }
export async function loginWithOtp(phone, otp) {
  const response = await request('/v1/pwa/user/login', { body: { phone, otp, dial_code: '+91' } });
  if (typeof response.data?.token !== 'string' || !response.data.token) throw new ApiError('Login did not return a session. Please try again.');
  // Whitelist safe fields: the API includes password/profile fields that we never persist.
  return { token: response.data.token, name: response.data.user_name || 'Karan' };
}
export async function fetchRestaurants(token, signal) {
  const city = encodeURIComponent(import.meta.env.VITE_CITY_ID || '118');
  const response = await request(`/v1/m/restaurant?city_id=${city}`, { token, signal });
  if (!Array.isArray(response.data?.results)) throw new ApiError('Restaurant data was not in the expected format. Please try again.');
  return { restaurants: response.data.results.map(normalizeRestaurant), total: Number(response.data.meta?.total_count || response.data.results.length) };
}
export function normalizeRestaurant(item) {
  return {
    id: String(item.restaurant_id), name: String(item.restaurant_name || 'Restaurant'),
    image: typeof item.logo === 'string' && /^https:\/\//.test(item.logo) ? item.logo : '/assets/pizza.jpg',
    address: typeof item.address_complete === 'string' && item.address_complete !== 'null' ? item.address_complete : 'Address not provided',
  };
}
