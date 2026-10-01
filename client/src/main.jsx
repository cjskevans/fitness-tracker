import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ConnectionStatus from './components/ConnectionStatus';
import './index.css';

// Both live above App because App early-returns the login screen when there is no
// user, and a backend outage is most likely to be noticed while logging in.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
    <ConnectionStatus />
    <App />
  </React.StrictMode>
);
