import { useEffect, useState } from 'react';
import { Icon } from './Icons';
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  return now;
}
export function StatusBar() {
  const now = useClock();
  return <div className="status-bar" aria-hidden="true"><time>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</time><div className="status-icons"><span className="signal"><i/><i/><i/><i/></span><Icon name="wifi" size={16}/><span className="battery"/></div></div>;
}
function WebsiteHeader() {
  const now = useClock();
  return <header className="website-header"><a className="website-brand" href="/menu">fastor<span>Food. Finds. Favourites.</span></a><div className="website-clock"><span>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span><time dateTime={now.toISOString()}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div></header>;
}
export function PhoneFrame({ children, className = '' }) {
  return <div className={`phone-frame ${className}`}><WebsiteHeader/><StatusBar/>{children}<div className="home-indicator" aria-hidden="true"/></div>;
}
export function BackButton({ onClick, label = 'Go back' }) {
  return <button className="back-button" onClick={onClick} aria-label={label}><Icon name="back"/></button>;
}
