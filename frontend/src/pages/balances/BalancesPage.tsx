
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/moneyUtils';
import { SettleUpModal } from '../../components/balance/SettleUpModal';
import { buildUpiLink } from '../../utils/upiUtils';

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  upiId: string | null;
  user: { id: string; name: string; email: string; upiId?: string | null } | null;
}

interface Balance {
  fromMember: Member;
  toMember: Member;
  amountPaise: number;
}

interface BalancesData {
  rawBalances: Balance[];
  optimizedTransfers: Balance[];
}

interface SettleUpState {
  fromMember: Member;
  toMember: Member;
  amountPaise: number;
}

export function BalancesPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOptimized, setShowOptimized] = useState(true);
  const [settleUpState, setSettleUpState] = useState<SettleUpState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['balances', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}/balances`);
      return response.data.data as BalancesData;
    },
  });

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const handleUpiPayClick = (balance: Balance) => {
    const upiId = balance.toMember.user?.upiId ?? balance.toMember.upiId;
    if (!upiId) return;

    const upiLink = buildUpiLink({
      upiId,
      name: getMemberDisplayName(balance.toMember),
      amountPaise: balance.amountPaise,
      note: 'Splitwise 2.0 settlement',
    });
    
    window.open(upiLink, '_blank');
  };

  const handleSettleUpClick = (balance: Balance) => {
    setSettleUpState({
      fromMember: balance.fromMember,
      toMember: balance.toMember,
      amountPaise: balance.amountPaise,
    });
  };

  const handleSettleUpSuccess = () => {
    setSettleUpState(null);
    queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading balances...</div>;
  }

  if (!data) {
    return <div style={{ padding: '20px' }}>Failed to load balances</div>;
  }

  const displayBalances = showOptimized ? data.optimizedTransfers : data.rawBalances;

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

      <h1>Balances</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <button
          onClick={() => setShowOptimized(!showOptimized)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showOptimized ? 'Show All Balances' : 'Show Optimized'}
        </button>

        {showOptimized && data.rawBalances.length > 0 && (
          <span style={{ color: '#666', fontSize: '14px' }}>
            Simplified from {data.rawBalances.length} transfer{data.rawBalances.length !== 1 ? 's' : ''} to{' '}
            {data.optimizedTransfers.length}
          </span>
        )}
      </div>

      {displayBalances.length === 0 ? (
        <div
          style={{
            padding: '30px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            color: '#666',
          }}
        >
          <h2>All settled up! ðŸŽ‰</h2>
          <p>No outstanding balances in this group.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayBalances.map((balance, index) => (
            <div
              key={index}
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '16px' }}>
                  <strong>{getMemberDisplayName(balance.fromMember)}</strong> owes{' '}
                  <strong>{getMemberDisplayName(balance.toMember)}</strong>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f44336', marginTop: '5px' }}>
                  {formatCurrency(balance.amountPaise)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(balance.toMember.user?.upiId || balance.toMember.upiId) && (
                    <button
                      onClick={() => handleUpiPayClick(balance)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Pay via UPI
                    </button>
                  )}
                  <button
                    onClick={() => handleSettleUpClick(balance)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Settle Up
                  </button>
                </div>
                {(balance.toMember.user?.upiId || balance.toMember.upiId) && (
                  <span style={{ fontSize: '12px', color: '#666', textAlign: 'right', maxWidth: '200px' }}>
                    Opens your UPI app. Come back and mark as settled after paying.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <button
          onClick={() => navigate(`/groups/${groupId}/settlements`)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          View Settlement History
        </button>
      </div>

      {settleUpState && (
        <SettleUpModal
          groupId={groupId!}
          fromMember={settleUpState.fromMember}
          toMember={settleUpState.toMember}
          suggestedAmountPaise={settleUpState.amountPaise}
          onClose={() => setSettleUpState(null)}
          onSuccess={handleSettleUpSuccess}
        />
      )}
    </div>
  );
}
