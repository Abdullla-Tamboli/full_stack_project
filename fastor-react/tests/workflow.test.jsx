import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

const jwt = `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.x`;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, status: 200, json: async () => url.includes('/register') ? { status: 'Success' } : url.includes('/login') ? { status: 'Success', data: { token: jwt, user_name: 'Karan' } } : { status: 'Success', data: { results: [{ restaurant_id: 75, restaurant_name: 'VYB', logo: '', address_complete: 'New Delhi' }], meta: { total_count: 1 } } } })));
});
it('completes signup, OTP, live-data rendering, cart, and owner session flow', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><App/></MemoryRouter>);
  await user.type(screen.getByLabelText('Mobile number'), '9818979450');
  await user.click(screen.getByRole('button', { name: 'Get OTP' }));
  await screen.findByRole('heading', { name: '6-digit code' });
  for (let index = 0; index < 6; index++) await user.type(screen.getByLabelText(`OTP digit ${index + 1}`), String(index + 1));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Best Seller' });
  await screen.findByRole('button', { name: /VYB/ });
  expect(JSON.parse(sessionStorage.getItem('fastor-session')).token).toBe(jwt);
  await user.click(screen.getByRole('button', { name: 'View pizza offer' }));
  expect(screen.getByLabelText('Quantity')).toHaveTextContent('3');
  expect(screen.getByLabelText('Jumbo (12 Slides)')).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
  await user.click(screen.getByLabelText('Medium (8 Slides)'));
  await user.click(screen.getByRole('button', { name: 'Add to cart' }));
  await screen.findByRole('heading', { name: 'Best Seller' });
  await user.click(screen.getByRole('button', { name: 'Open cart' }));
  expect(screen.getByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem('fastor-cart'));
  expect(saved[0]).toMatchObject({ quantity: 4, unitPrice: 7, portion: 'Medium (8 Slides)' });
  expect(screen.getAllByText('₹28.00').length).toBeGreaterThan(0);
  await user.click(screen.getByRole('button', { name: 'Close dialog' }));
  await user.click(screen.getByRole('button', { name: 'Karan' }));
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Sign Up to Fastor' });
  expect(JSON.parse(sessionStorage.getItem('fastor-session'))).toBeNull();
});
it('validates mobile input before calling registration', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><App/></MemoryRouter>);
  await user.type(screen.getByLabelText('Mobile number'), '123');
  await user.click(screen.getByRole('button', { name: 'Get OTP' }));
  expect(screen.getByRole('alert')).toHaveTextContent('valid 10-digit');
  expect(fetch).not.toHaveBeenCalled();
});
it('supports pasting a complete OTP and keeps login errors on screen', async () => {
  sessionStorage.setItem('fastor-phone', JSON.stringify('9818979450'));
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'Error', status_code: 401, message: 'Invalid OTP' }) });
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/verify']}><App/></MemoryRouter>);
  fireEvent.paste(screen.getByLabelText('OTP digit 1'), { clipboardData: { getData: () => '123456' } });
  expect(screen.getByLabelText('OTP digit 6')).toHaveValue('6');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid OTP'));
  expect(screen.getByRole('heading', { name: '6-digit code' })).toBeInTheDocument();
});
it('redirects anonymous visitors away from protected screens', () => {
  render(<MemoryRouter initialEntries={['/item/pizza']}><App/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Sign Up to Fastor' })).toBeInTheDocument();
});
it('supports a verification link without sending a new OTP', () => {
  render(<MemoryRouter initialEntries={['/verify?phone=9818979450']}><App/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: '6-digit code' })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
