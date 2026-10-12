export default function FoodImage({ src, alt, ...props }) {
  return <img src={src} alt={alt} loading="lazy" onError={event => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = '/assets/pizza.jpg'; } }} {...props}/>;
}
