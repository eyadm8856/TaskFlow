import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';

export default function ClientProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-wrapper">
          <Navbar />
          <main className="main-content" id="main-content">
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
