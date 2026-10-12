import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { fetchRestaurants } from '../lib/api';
import { readStored, writeStored } from '../lib/storage';
import { initialOrders, menu, money } from '../data/menu';
import { PhoneFrame } from '../components/PhoneFrame';
import { Icon } from '../components/Icons';
import FoodImage from '../components/FoodImage';
import Modal from '../components/Modal';

export default function Menu() {
  const { session, signOut, cart, total, updateCart } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(location.state?.added ? 'Added to your cart' : '');
  const [orders, setOrders] = useState(() => {
    const saved = readStored('fastor-sample-orders', initialOrders);
    return Array.isArray(saved) ? saved.filter(row => initialOrders.some(order => order.id === row?.id)) : initialOrders;
  });
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetchRestaurants(session.token, controller.signal).then(result => setRestaurants(result.restaurants)).catch(err => {
      if (controller.signal.aborted) return;
      if (err.status === 401) { signOut(); navigate('/', { replace: true }); return; }
      setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session.token, retry]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  const visible = restaurants.filter(row => `${row.name} ${row.address}`.toLowerCase().includes(query.toLowerCase()));
  function cancel(id) { const next = orders.filter(row => row.id !== id); setOrders(next); writeStored('fastor-sample-orders', next); setModal(null); setToast('Sample order cancelled'); }
  return <PhoneFrame className="menu-frame"><header className="location-header"><button onClick={() => setModal({ type: 'location' })}><span>Current Location</span><strong>Model Town, New Delhi</strong></button></header><div className="welcome-row"><button className="profile-button" onClick={() => setModal({ type: 'account' })}>{session.name || 'Karan'}</button><div className="quick-actions"><button className="contact-action" aria-label="Contact information" onClick={() => setModal({ type: 'contact' })}><Icon name="phone" size={25}/></button><button className="receipt-action" aria-label="Open cart" onClick={() => setModal({ type: 'cart' })}><Icon name="receipt" size={25}/>{cart.length > 0 && <span className="cart-badge">{cart.reduce((sum, row) => sum + row.quantity, 0)}</span>}</button></div></div>
  <div className="menu-content"><section className="best-sellers"><h1>Best Seller</h1><p className="sample-caption">Sample menu from the design</p><div className="best-seller-grid">{menu.slice(0, 4).map(item => <button key={item.id} aria-label={`View ${item.name}`} onClick={() => navigate(`/item/${item.id}`)}><FoodImage src={item.image} alt={item.name}/><span>${item.price.toFixed(item.price % 1 ? 2 : 1)}</span></button>)}</div></section><button className="promotion" onClick={() => navigate('/item/pizza')} aria-label="View pizza offer"><img src="/assets/promotion.jpg" alt="Experience our delicious new dish — 30% OFF"/></button><div className="carousel-dots" aria-hidden="true"><i/><i/><i className="active"/><i/><i/></div>
  <section className="popular-items"><h2>Popular Items</h2><p className="sample-caption">Sample orders · dates shown in the design</p>{orders.map(order => { const item = menu.find(row => row.id === order.item); return <article className="order-card" key={order.id}><button className="order-photo" onClick={() => navigate(`/item/${item.id}`)} aria-label={`View ${item.name}`}><FoodImage src={item.image} alt={item.name}/></button><div className="order-info"><div className="order-title"><button onClick={() => navigate(`/item/${item.id}`)}>{item.name}</button><strong>{money(item.price)}</strong></div><div className="order-meta"><span>{order.date}</span><span>{order.quantity} {order.quantity === 1 ? 'item' : 'items'}</span></div><div className="order-actions"><button onClick={() => setModal({ type: 'cancel', order })}>Cancel Order</button><button onClick={() => setModal({ type: 'track', order })}>Track Driver</button></div></div></article>; })}{orders.length === 0 && <div className="empty-orders"><p>No sample orders.</p><button onClick={() => { setOrders(initialOrders); writeStored('fastor-sample-orders', initialOrders); }}>Restore sample orders</button></div>}</section>
  <section className="restaurants-section"><div className="section-title"><h2>Restaurants near you</h2><button aria-label="Refresh restaurants" onClick={() => setRetry(value => value + 1)}>Refresh</button></div><label className="restaurant-search"><Icon name="search" size={17}/><input aria-label="Search restaurants" placeholder="Search restaurants" value={query} onChange={event => setQuery(event.target.value)}/></label>{loading ? <div className="loading-state" role="status">Finding restaurants…<div className="skeleton"/><div className="skeleton"/></div> : error ? <div className="error-state" role="alert"><p>{error}</p><button className="primary-button" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : visible.length === 0 ? <p className="empty-state">{query ? 'No restaurants match your search.' : 'No restaurants available right now.'}</p> : <div className="restaurant-grid">{visible.map(restaurant => <button className="restaurant-card" key={restaurant.id} onClick={() => setModal({ type: 'restaurant', restaurant })}><FoodImage src={restaurant.image} alt={restaurant.name}/><span><strong>{restaurant.name}</strong><small>{restaurant.address}</small></span><Icon name="arrow" size={17}/></button>)}</div>}</section></div>
  {toast && <div className="toast" role="status">{toast}</div>}
  {modal && <Modal title={{ cart: 'Your cart', location: 'Current location', account: 'Your account', contact: 'Contact information', cancel: 'Cancel sample order?', track: 'Sample order status', restaurant: modal.restaurant?.name }[modal.type]} onClose={() => setModal(null)}>
    {modal.type === 'cart' && (cart.length ? <><div className="cart-items">{cart.map(row => <article className="cart-item" key={row.key}><FoodImage src={row.image} alt={row.name}/><div><strong>{row.name}</strong><small>{row.portion} · Qty {row.quantity}</small><span>{money(row.unitPrice * row.quantity)}</span></div><button className="icon-button" aria-label={`Remove ${row.name}`} onClick={() => updateCart(cart.filter(item => item.key !== row.key))}><Icon name="close" size={17}/></button></article>)}</div><div className="cart-total"><strong>Total</strong><strong>{money(total)}</strong></div><button className="primary-button" onClick={() => setModal(null)}>Continue browsing</button></> : <div className="empty-state"><Icon name="bag" size={36}/><p>Your cart is waiting for something delicious.</p><button className="primary-button" onClick={() => { setModal(null); navigate('/item/pizza'); }}>Explore the menu</button></div>)}
    {modal.type === 'location' && <div><p><Icon name="location"/> Model Town, New Delhi</p><p className="muted">Showing the restaurant list for the assignment's configured city.</p></div>}
    {modal.type === 'account' && <><p>Signed in as <strong>{session.name}</strong></p><button className="primary-button" onClick={() => { signOut(); navigate('/', { replace: true }); }}>Sign out</button></>}
    {modal.type === 'contact' && <p>Open a restaurant below to see the contact and location information provided by Fastor. No phone number was provided for this sample menu.</p>}
    {modal.type === 'cancel' && <><p>This removes the sample order from this device.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep order</button><button className="primary-button" onClick={() => cancel(modal.order.id)}>Cancel order</button></div></>}
    {modal.type === 'track' && <><p className="muted">Sample order · {menu.find(item => item.id === modal.order.item)?.name}</p><ol className="order-timeline"><li className="complete">Order received</li><li className="current">Preparing your food</li><li>Out for delivery</li><li>Delivered</li></ol></>}
    {modal.type === 'restaurant' && <><FoodImage className="restaurant-hero" src={modal.restaurant.image} alt={modal.restaurant.name}/><p><Icon name="location" size={17}/> {modal.restaurant.address}</p><p className="muted">Restaurant information from Fastor.</p><button className="primary-button" onClick={() => { setModal(null); navigate('/item/pizza'); }}>Explore sample menu</button></>}
  </Modal>}
  </PhoneFrame>;
}

