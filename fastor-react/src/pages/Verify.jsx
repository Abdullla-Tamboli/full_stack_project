import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { loginWithOtp, registerPhone } from '../lib/api';
import { readStored, writeStored } from '../lib/storage';
import { BackButton, PhoneFrame } from '../components/PhoneFrame';
import Keypad from '../components/Keypad';

export default function Verify() {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // A direct verification link supports an OTP already obtained outside this tab.
  // Login still requires a valid OTP verified by Fastor; this never grants a session.
  const [phone] = useState(() => params.get('phone') || readStored('fastor-phone', '', sessionStorage));
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [sentAt, setSentAt] = useState(() => readStored('fastor-otp-sent', Date.now(), sessionStorage));
  const [remaining, setRemaining] = useState(30);
  const refs = useRef([]);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((sentAt + 30000 - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [sentAt]);
  if (!/^[6-9]\d{9}$/.test(phone)) return <Navigate to="/" replace/>;
  function edit(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp(current => {
      const digits = Array.from({ length: 6 }, (_, i) => current[i] || ' ');
      digits[index] = digit || ' ';
      return digits.join('').trimEnd();
    });
    setError('');
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError('Enter the complete 6-digit code.'); return; }
    setBusy(true); setError('');
    try { signIn(await loginWithOtp(phone, otp)); navigate('/menu', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function resend() {
    if (remaining || resending || busy) return;
    setResending(true); setError('');
    try { await registerPhone(phone); const now = Date.now(); setSentAt(now); writeStored('fastor-otp-sent', now, sessionStorage); }
    catch (err) { setError(err.message); } finally { setResending(false); }
  }
  return <PhoneFrame className="auth-frame"><form className="auth-content" onSubmit={submit}>
    <BackButton onClick={() => navigate('/')}/><h1>6-digit code</h1>
    <p className="auth-subtitle">Please enter the code we've sent to<br/><strong>+91 {phone.slice(0, 5)} {phone.slice(5)}</strong></p>
    <div className="otp-fields" onPaste={event => { const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (digits) { event.preventDefault(); setOtp(digits); refs.current[Math.min(digits.length, 5)]?.focus(); } }}>{Array.from({ length: 6 }, (_, index) => <span key={index} className={index === 3 ? 'otp-after-gap' : ''}><input ref={node => { refs.current[index] = node; }} aria-label={`OTP digit ${index + 1}`} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} value={otp[index]?.trim() || ''} disabled={busy || resending} onChange={event => edit(index, event.target.value)} onKeyDown={event => { if (event.key === 'Backspace' && !otp[index]?.trim() && index > 0) refs.current[index - 1]?.focus(); if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus(); if (event.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus(); }}/></span>)}</div>
    <p className="resend-line">I didn't receive a code <button type="button" onClick={resend} disabled={remaining > 0 || busy || resending}>{remaining ? `(00:${String(remaining).padStart(2, '0')})` : resending ? 'Sending…' : 'Resend'}</button></p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="auth-actions otp-actions"><button className="primary-button" disabled={busy || resending}>{busy ? 'Verifying…' : 'Continue'}</button></div>
  </form><Keypad onDigit={digit => { if (!busy && !resending) setOtp(value => (value.replace(/\s/g, '') + digit).slice(0, 6)); }} onDelete={() => { if (!busy && !resending) setOtp(value => value.slice(0, -1)); }}/></PhoneFrame>;
}
