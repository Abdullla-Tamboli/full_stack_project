import { createContext, useContext, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { readSession, readStored, writeStored } from './lib/storage';
import Signup from './pages/Signup';
import Verify from './pages/Verify';
import Menu from './pages/Menu';
import ItemDetail from './pages/ItemDetail';
import { cartTotal } from './data/menu';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
function Protected({ children }) {
  const { session } = useApp();
  return session ? children : <Navigate to="/" replace/>;
}
export default function App() {
  const [session, setSession] = useState(readSession);
  const [cart, setCart] = useState(() => {
    const saved = readStored('fastor-cart', []);
    return Array.isArray(saved) ? saved.filter(item => item && typeof item.key === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice)) : [];
  });
  function signIn(value) { writeStored('fastor-session', value, sessionStorage); setSession(value); }
  function signOut() { writeStored('fastor-session', null, sessionStorage); setSession(null); updateCart([]); }
  function updateCart(next) { setCart(next); writeStored('fastor-cart', next); }
  function addToCart(item) {
    const existing = cart.find(row => row.key === item.key);
    updateCart(existing ? cart.map(row => row.key === item.key ? { ...row, quantity: row.quantity + item.quantity } : row) : [...cart, item]);
  }
  return <AppContext.Provider value={{ session, signIn, signOut, cart, updateCart, addToCart, total: cartTotal(cart) }}><main className="app-stage"><Routes>
    <Route path="/" element={session ? <Navigate to="/menu" replace/> : <Signup/>}/>
    <Route path="/verify" element={session ? <Navigate to="/menu" replace/> : <Verify/>}/>
    <Route path="/menu" element={<Protected><Menu/></Protected>}/>
    <Route path="/item/:id" element={<Protected><ItemDetail/></Protected>}/>
    <Route path="*" element={<Navigate to={session ? '/menu' : '/'} replace/>}/>
  </Routes></main></AppContext.Provider>;
}
