import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/moneyUtils';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  user: User | null;
}

interface Settlement {
  id: string;
  amountPaise: number;
  method: string;
  note: string | null;
  date: string;
  fromMember: Member;
  toMember: Member;
}

export function SettlementsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: settlementsData, isLoading } = useQuery({
    queryKey: ['settlements', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}/settlements`);
      return response.data.data.settlements as Settlement[];
    },
  });

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading settlements...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      <button
        onClick={() => navigate(`/groups/${groupId}`)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ddd',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        â† Back to Group
      </button>

      <h1>Settlement History</h1>

      {!settlementsData || settlementsData.length === 0 ? (
        <div
          style={{
            padding: '30px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            color: '#666',
          }}
        >
          <p>No settlements recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {settlementsData.map((settlement) => (
            <div
              key={settlement.id}
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '16px' }}>
                  <strong>{getMemberDisplayName(settlement.fromMember)}</strong> paid{' '}
                  <strong>{getMemberDisplayName(settlement.toMember)}</strong>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {formatCurrency(settlement.amountPaise)}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {formatDate(settlement.date)}
              </div>
              {settlement.note && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  Note: {settlement.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <button
          onClick={() => navigate(`/groups/${groupId}/balances`)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          View Current Balances
        </button>
      </div>
    </div>
  );
}
