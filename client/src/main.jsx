import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1b26',
            color: '#f1f5f9',
            border: '1px solid #2f3044',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#1a1b26' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
