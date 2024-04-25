import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app'; // Import the 'App' component

const element = document.getElementById('app') as HTMLElement;
const root = createRoot(element);
root.render(<App />);