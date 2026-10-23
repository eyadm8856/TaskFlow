import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardPage from './DashboardPage';
import LoginPage from './LoginPage';
import Loader from '@/components/Loader';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return user ? <DashboardPage /> : <LoginPage />;
}
