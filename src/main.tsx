import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletProvider, RazorWallet } from '@razorlabs/razorkit';
import '@razorlabs/razorkit/style.css';
import { AlertProvider } from './components/alert/AlertContext';
import { DAOStateProvider } from './contexts/DAOStateContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
      <WalletProvider defaultWallets={[RazorWallet]} autoConnect={false}>
        <DAOStateProvider>
          <App />
        </DAOStateProvider>
      </WalletProvider>
    </AlertProvider>
  </StrictMode>
);
