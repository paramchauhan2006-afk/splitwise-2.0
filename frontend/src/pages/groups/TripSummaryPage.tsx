import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/moneyUtils';

interface PerMember {
  memberId: string;
  displayName: string;
  totalPaidPaise: number;
  totalOwedPaise: number;
  netPaise: number;
}

interface OutstandingBalance {
  fromMemberId: string;
  fromDisplayName: string;
  toMemberId: string;
  toDisplayName: string;
  amountPaise: number;
}

interface TripSummary {
  totalExpenses: number;
  totalAmountPaise: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  perMember: PerMember[];
  outstandingBalances: OutstandingBalance[];
}

export function TripSummaryPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['trip-summary', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}/summary`);
      return response.data.data.summary as TripSummary;
    },
  });

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}`);
      return response.data.data.group;
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading summary...</div>;
  }

  if (error || !summaryData) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: '#c00' }}>Failed to load trip summary. This group may not be archived yet.</p>
        <button onClick={() => navigate('/dashboard')} style={{ marginTop: '10px', padding: '8px 16px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', padding: '20px' }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ddd',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        â† Back to Dashboard
      </button>

      <div style={{ marginBottom: '30px' }}>
        <h1>{groupData?.name || 'Trip Summary'}</h1>
        <h2 style={{ color: '#666', fontWeight: 'normal' }}>Trip Summary</h2>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '30px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Date Range</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {formatDate(summaryData.dateRange.start)} to {formatDate(summaryData.dateRange.end)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Expenses</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{summaryData.totalExpenses} expenses</div>
          </div>
        </div>
        <div style={{ marginTop: '15px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Spent</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
            {formatCurrency(summaryData.totalAmountPaise)}
          </div>
        </div>
      </div>

      {/* Per-Member Breakdown */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Per-Member Breakdown</h2>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Member</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Paid</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Owed</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.perMember.map((member) => (
                <tr key={member.memberId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{member.displayName}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(member.totalPaidPaise)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(member.totalOwedPaise)}</td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color:
                        member.netPaise > 0
                          ? '#4CAF50'
                          : member.netPaise < 0
                          ? '#f44336'
                          : '#999',
                    }}
                  >
                    {member.netPaise === 0
                      ? 'Settled'
                      : member.netPaise > 0
                      ? `+${formatCurrency(member.netPaise)}`
                      : `-${formatCurrency(Math.abs(member.netPaise))}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding Balances */}
      {summaryData.outstandingBalances.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Still to Settle</h2>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              border: '1px solid #ff9800',
            }}
          >
            {summaryData.outstandingBalances.map((balance, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 0',
                  borderBottom: index < summaryData.outstandingBalances.length - 1 ? '1px solid #ffe0b2' : 'none',
                }}
              >
                <strong>{balance.fromDisplayName}</strong> owes <strong>{balance.toDisplayName}</strong>{' '}
                <span style={{ fontWeight: 'bold', color: '#f44336' }}>{formatCurrency(balance.amountPaise)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summaryData.outstandingBalances.length === 0 && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#2e7d32',
            fontWeight: 'bold',
          }}
        >
          âœ“ All settled up! No outstanding balances.
        </div>
      )}
    </div>
  );
}
