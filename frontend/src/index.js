import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Make sure we're targeting the correct element
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Failed to find the root element. Make sure your public/index.html has a <div id="root"></div>');
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}