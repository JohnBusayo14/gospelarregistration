import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ChurchProvider } from './churchContext.jsx';
import { AuthProvider } from './authContext.jsx';
import { TopBarProvider } from './context/TopBarContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChurchProvider>
          <TopBarProvider>
            <App />
          </TopBarProvider>
        </ChurchProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
