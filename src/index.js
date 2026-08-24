import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TeacherPortal from './TeacherPortal';

const isMaestro = new URLSearchParams(window.location.search).get("maestro");
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isMaestro ? <TeacherPortal /> : <App />}
  </React.StrictMode>
);
