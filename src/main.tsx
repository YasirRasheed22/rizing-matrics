//@ts-nocheck
import { createRoot } from 'react-dom/client'
import {HashRouter} from 'react-router-dom'
import App from './App.tsx'
import "bootstrap/dist/css/bootstrap.min.css";
import './index.css'
export const API_URL = "https://api.rizingmatrics.com";

export function formatToCurrency(amount, currency = 'USD', locale = 'en-US') {
    // Handle invalid/undefined input
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '—';
    }
  
    return new Intl.NumberFormat(locale, {
      style: 'currency',
    currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
}
createRoot(document.getElementById('root')!).render(
    <HashRouter>
        <App/>
     </HashRouter> 
       )
