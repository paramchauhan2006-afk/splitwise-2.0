import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/groups/GroupsListPage';
import { CreateGroupPage } from './pages/groups/CreateGroupPage';
import { GroupDetailPage } from './pages/groups/GroupDetailPage';
import { CreateExpensePage } from './pages/expenses/CreateExpensePage';
import { BalancesPage } from './pages/balances/BalancesPage';
import { SettlementsPage } from './pages/settlements/SettlementsPage';

function App() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    fetchMe();
  }, []);

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={currentUser ? <Navigate to='/dashboard' /> : <Navigate to='/login' />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/dashboard' element={currentUser ? <DashboardPage /> : <Navigate to='/login' />} />
          <Route path='/groups/create' element={currentUser ? <CreateGroupPage /> : <Navigate to='/login' />} />
          <Route path='/groups/:groupId' element={currentUser ? <GroupDetailPage /> : <Navigate to='/login' />} />
          <Route path='/groups/:groupId/expenses/create' element={currentUser ? <CreateExpensePage /> : <Navigate to='/login' />} />
          <Route path='/groups/:groupId/balances' element={currentUser ? <BalancesPage /> : <Navigate to='/login' />} />
          <Route path='/groups/:groupId/settlements' element={currentUser ? <SettlementsPage /> : <Navigate to='/login' />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
