import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global safety definition for campusData
(window as any).campusData = (window as any).campusData || { locations: [], categories: [] };

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
