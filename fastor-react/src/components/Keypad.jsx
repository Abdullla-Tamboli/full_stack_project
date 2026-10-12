import { Icon } from './Icons';
const letters = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
export default function Keypad({ onDigit, onDelete }) {
  return <div className="keypad" aria-label="Numeric keypad">{Array.from({ length: 9 }, (_, i) => <button key={i} type="button" onClick={() => onDigit(String(i + 1))} aria-label={`Digit ${i + 1}`}><span>{i + 1}</span><small>{letters[i]}</small></button>)}<div/><button type="button" onClick={() => onDigit('0')} aria-label="Digit 0"><span>0</span></button><button type="button" className="delete-key" onClick={onDelete} aria-label="Delete last digit"><Icon name="delete" size={23}/></button></div>;
}
