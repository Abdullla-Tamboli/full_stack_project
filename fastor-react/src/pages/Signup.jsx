import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPhone } from '../lib/api';
import { readStored, writeStored } from '../lib/storage';
import { BackButton, PhoneFrame } from '../components/PhoneFrame';
import Keypad from '../components/Keypad';
import Modal from '../components/Modal';

export default function Signup() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => readStored('fastor-phone', '', sessionStorage));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState(null);
  function change(value) { setPhone(value.replace(/\D/g, '').slice(0, 10)); setError(''); }
  async function submit(event) {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    setBusy(true); setError('');
    try {
      await registerPhone(phone);
      writeStored('fastor-phone', phone, sessionStorage);
      writeStored('fastor-otp-sent', Date.now(), sessionStorage);
      navigate('/verify');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <PhoneFrame className="auth-frame"><form className="auth-content" onSubmit={submit}>
    <BackButton onClick={() => change('')} label="Clear mobile number"/>
    <h1>Sign Up to Fastor</h1>
    <p className="auth-subtitle">Let us know your mobile number and we will send<br className="desktop-break"/> you an OTP for verification.</p>
    <div className={`phone-input ${error ? 'input-error' : ''}`}><span>+91</span><i aria-hidden="true"/><input aria-label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="- 00000" value={phone} onChange={event => change(event.target.value)} maxLength={10} disabled={busy}/></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="auth-actions"><button className="primary-button" disabled={busy}>{busy ? 'Sending OTP…' : 'Get OTP'}</button><p className="legal">By clicking, I accept the <button type="button" onClick={() => setPolicy('Terms & Conditions')}>Terms & Conditions</button> and <button type="button" onClick={() => setPolicy('Privacy Policy')}>Privacy Policy</button></p></div>
  </form><Keypad onDigit={digit => { if (!busy) change(phone + digit); }} onDelete={() => { if (!busy) change(phone.slice(0, -1)); }}/>
  {policy && <Modal title={policy} onClose={() => setPolicy(null)}><p>This assignment app sends your phone number and OTP to Fastor's staging service when you sign in. Session information stays in this browser tab; the cart stays on this device.</p><p>These are app information notes. Official Fastor legal policies were not supplied with the assignment.</p></Modal>}
  </PhoneFrame>;
}
