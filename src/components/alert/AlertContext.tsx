import React, { createContext, useContext, useState } from 'react';

// --------------------
// Global Alert Context
// --------------------
// Provides a global alert system for the app
interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
}
const AlertContext = createContext<AlertContextType>({ showAlert: () => {} });
export const useAlert = () => useContext(AlertContext);

// AlertProvider component to wrap your app (put in main.tsx or App.tsx)
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  // Show alert for 2.5s
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 2500);
  };
  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div style={{
          position: 'fixed', bottom: 24, left: 24, right: 'auto', transform: 'none',
          background: alert.type === 'error' ? '#ef4444' : alert.type === 'success' ? '#22c55e' : '#334155',
          color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 600, fontSize: 16, zIndex: 2000,
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)'
        }}>{alert.message}</div>
      )}
    </AlertContext.Provider>
  );
}; 