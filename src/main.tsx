
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check for stored theme preference and apply it before render
const storedTheme = localStorage.getItem('theme') || 'light';
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
