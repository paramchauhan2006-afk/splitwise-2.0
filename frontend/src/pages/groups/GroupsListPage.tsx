
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Group {
  id: string;
  name: string;
  description: string | null;
  isTrip: boolean;
  tripEndDate: string | null;
  isArchived: boolean;
  memberCount: number;
  myRole: string;
}

export function DashboardPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups');
      return response.data.data.groups as Group[];
    },
  });

  if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>;

  const activeGroups = data?.filter((g) => !g.isArchived) || [];
  const archivedGroups = data?.filter((g) => g.isArchived) || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Welcome, {currentUser?.name}!</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            My Profile
          </button>
          <button
            onClick={() => logout()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Active Groups Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Active Groups</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeGroups.length === 0 ? (
            <p style={{ color: '#666' }}>No active groups yet. Create one to get started!</p>
          ) : (
            activeGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Link
                      to={`/groups/${group.id}`}
                      style={{ textDecoration: 'none', color: '#007bff', fontSize: '18px', fontWeight: 'bold' }}
                    >
                      {group.name}
                    </Link>
                    {group.isTrip && (
                      <span
                        style={{
                          marginLeft: '10px',
                          padding: '2px 8px',
                          backgroundColor: '#ff9800',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        TRIP
                      </span>
                    )}
                    {group.description && <p style={{ margin: '5px 0', color: '#666' }}>{group.description}</p>}
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#999' }}>
                      Members: {group.memberCount} | Role: {group.myRole}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Trips Section */}
      {archivedGroups.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2>Past Trips</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {archivedGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  opacity: 0.7,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{group.name}</span>
                      <span
                        style={{
                          marginLeft: '10px',
                          padding: '2px 8px',
                          backgroundColor: '#999',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ARCHIVED
                      </span>
                    </div>
                    {group.description && <p style={{ margin: '5px 0', color: '#666' }}>{group.description}</p>}
                  </div>
                  <button
                    onClick={() => navigate(`/groups/${group.id}/summary`)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    View Summary
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/groups/create">
        <button
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Create Group
        </button>
      </Link>
    </div>
  );
}
