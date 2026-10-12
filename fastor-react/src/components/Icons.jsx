export function Icon({ name, size = 20, ...props }) {
  const shapes = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h4"/></>,
    phone: <path d="m7 3 3 5-3 3a16 16 0 0 0 6 6l3-3 5 3-2 4C10 23 1 14 3 5l4-2Z"/>,
    delete: <><path d="m9 6-6 6 6 6h12V6H9Z"/><path d="m12 9 6 6m0-6-6 6"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    arrow: <path d="m9 5 7 7-7 7"/>,
    logout: <><path d="M9 4H4v16h5m6-15 6 7-6 7m-7-7h13"/></>,
    wifi: <><path d="M3 8a15 15 0 0 1 18 0M6 11a10 10 0 0 1 12 0m-9 3a5 5 0 0 1 6 0"/><circle cx="12" cy="17" r=".8"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{shapes[name]}</svg>;
}
