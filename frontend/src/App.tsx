import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/groups/GroupsListPage';

function App() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={currentUser ? <Navigate to='/dashboard' /> : <Navigate to='/login' />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/dashboard' element={currentUser ? <DashboardPage /> : <Navigate to='/login' />} />
          <Route path='/groups/:groupId' element={currentUser ? <div>Group Detail</div> : <Navigate to='/login' />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
