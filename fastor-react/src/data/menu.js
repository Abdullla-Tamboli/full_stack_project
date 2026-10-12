export const menu = [
  { id: 'sushi', name: 'Salmon Sushi', image: '/assets/sushi.jpg', price: 103, description: 'Fresh salmon, seasoned rice and crisp vegetables, rolled together for a delicious bite.' },
  { id: 'rice', name: 'Chicken Rice Bowl', image: '/assets/rice.jpg', price: 50, description: 'A comforting bowl of fragrant rice, tender chicken and fresh herbs.' },
  { id: 'pasta', name: 'Garden Lasagne', image: '/assets/pasta.jpg', price: 12.99, description: 'Layers of pasta, vegetables and creamy cheese, baked until golden.' },
  { id: 'cake', name: 'Berry Cupcake', image: '/assets/cake.jpg', price: 8.2, description: 'A fluffy cupcake topped with vanilla frosting and fresh berries.' },
  { id: 'pizza', name: 'Lorem ipsum dolor sit amet', image: '/assets/pizza.jpg', price: 4, description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.', portions: true },
  { id: 'shake', name: 'Strawberry Shake', image: '/assets/shake.jpg', price: 20, description: 'A creamy strawberry shake, blended with fresh fruit and topped with whipped cream.' },
  { id: 'burger', name: 'Chicken Burger', image: '/assets/burger.jpg', price: 20, description: 'A juicy chicken burger with fresh lettuce, tomato and our house sauce.' },
];
export const portions = [
  { name: 'Personal (4 Slides)', extra: 0 }, { name: 'Medium (8 Slides)', extra: 3 },
  { name: 'Familiar (10 Slides)', extra: 6 }, { name: 'Jumbo (12 Slides)', extra: 10 },
];
export const initialOrders = [
  { id: 'sample-shake', item: 'shake', date: '29 Nov, 01:20 pm', quantity: 2, status: 'Preparing' },
  { id: 'sample-burger', item: 'burger', date: '17 Oct, 01:20 pm', quantity: 1, status: 'Preparing' },
];
export const money = value => `₹${Number(value).toFixed(2)}`;
export function cartTotal(cart) { return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); }
