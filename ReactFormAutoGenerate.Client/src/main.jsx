/**
 * @file main.jsx
 * @description Entry point for the React application.
 * Initializes the React root and renders the main App component within StrictMode.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/**
 * !!! IMPORTANT: Root Initialization !!!
 * Creates the React root element using the 'root' DOM node and triggers the initial render.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
