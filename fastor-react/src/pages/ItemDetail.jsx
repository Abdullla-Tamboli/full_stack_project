import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import { menu, money, portions } from '../data/menu';
import { BackButton, PhoneFrame } from '../components/PhoneFrame';
import FoodImage from '../components/FoodImage';

export default function ItemDetail() {
  const { id } = useParams();
  const item = menu.find(row => row.id === id);
  const navigate = useNavigate();
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState(3);
  const [portion, setPortion] = useState(3);
  if (!item) return <PhoneFrame><div className="empty-state"><h1>Item not found</h1><button className="primary-button" onClick={() => navigate('/menu')}>Back to menu</button></div></PhoneFrame>;
  const unitPrice = item.price + (item.portions ? portions[portion].extra : 0);
  function add() {
    addToCart({ key: `${item.id}-${item.portions ? portion : 0}`, itemId: item.id, name: item.name, image: item.image, portion: item.portions ? portions[portion].name : 'Regular', quantity, unitPrice });
    navigate('/menu', { state: { added: true } });
  }
  return <PhoneFrame className="detail-frame"><section className="detail-content"><BackButton onClick={() => navigate('/menu')}/><FoodImage className="detail-image" src={item.image} alt={item.id === 'pizza' ? 'Freshly baked pepperoni pizza' : item.name}/><div className="price-row"><strong>{money(unitPrice)}</strong><div className="quantity-control"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="Decrease quantity">−</button><span aria-label="Quantity">{quantity}</span><button onClick={() => setQuantity(value => Math.min(99, value + 1))} disabled={quantity === 99} aria-label="Increase quantity">+</button></div></div><h1>{item.name}</h1><p className="item-description">{item.description}</p>{item.portions && <fieldset className="portion-options"><legend>Personal portion</legend>{portions.map((option, index) => <label key={option.name}><span>{option.name}</span><i/><span>${option.extra.toFixed(2)}</span><input type="radio" name="portion" checked={portion === index} onChange={() => setPortion(index)} aria-label={option.name}/></label>)}</fieldset>}</section><div className="detail-footer"><button className="primary-button" onClick={add}>Add to cart</button></div></PhoneFrame>;
}
