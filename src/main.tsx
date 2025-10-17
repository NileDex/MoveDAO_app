import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import '@mosaicag/swap-widget/style.css';
import './index.css';
import {
  WalletProvider,
  RazorWallet,
  NightlyWallet,
  LeapWallet
} from '@razorlabs/razorkit';
import '@razorlabs/razorkit/style.css';
import { AlertProvider } from './components/alert/AlertContext';
import { DAOStateProvider } from './contexts/DAOStateContext';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <ThemeProvider>
          <WalletProvider defaultWallets={[
            RazorWallet,
            NightlyWallet,
            LeapWallet
          ]} autoConnect={false}>
            <DAOStateProvider>
              <App />
            </DAOStateProvider>
          </WalletProvider>
        </ThemeProvider>
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>
);
