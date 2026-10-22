import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export function DashboardPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups');
      return response.data.data.groups;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Welcome, {currentUser?.name}!</h1>
        <button onClick={() => logout()}>Logout</button>
      </div>

      <h2>Your Groups</h2>
      <div>
        {data?.map((group: any) => (
          <div key={group.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px' }}>
            <Link to={'/groups/' + group.id}>
              <h3>{group.name}</h3>
            </Link>
            <p>{group.description}</p>
            <p>Members: {group.memberCount} | Role: {group.myRole}</p>
          </div>
        ))}
      </div>

      <Link to='/groups/create'>
        <button style={{ marginTop: '20px', padding: '10px 20px' }}>Create Group</button>
      </Link>
    </div>
  );
}
