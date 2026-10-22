import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/moneyUtils';
import { AddMemberModal } from '../../components/group/AddMemberModal';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  placeholderPhone: string | null;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: User | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  isTrip: boolean;
  tripEndDate: string | null;
  members: Member[];
}

interface Expense {
  id: string;
  description: string;
  totalAmountPaise: number;
  date: string;
  paidBy: Member;
}

type TabType = 'members' | 'expenses' | 'balances';

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const { data: groupData, isLoading: groupLoading, refetch: refetchGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}`);
      return response.data.data.group as Group;
    },
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}/expenses`);
      return response.data.data.expenses as Expense[];
    },
    enabled: activeTab === 'expenses',
  });

  if (groupLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!groupData) {
    return <div style={{ padding: '20px' }}>Group not found</div>;
  }

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ddd',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          â† Back to Dashboard
        </button>
        <h1>{groupData.name}</h1>
        {groupData.description && <p style={{ color: '#666' }}>{groupData.description}</p>}
      </div>

      {/* Tab Bar */}
      <div style={{ borderBottom: '2px solid #007bff', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            padding: '10px 20px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontSize: '15px',
            backgroundColor: activeTab === 'members' ? '#007bff' : '#eee',
            color: activeTab === 'members' ? 'white' : '#333',
            fontWeight: activeTab === 'members' ? 'bold' : 'normal',
          }}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 20px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontSize: '15px',
            backgroundColor: activeTab === 'expenses' ? '#007bff' : '#eee',
            color: activeTab === 'expenses' ? 'white' : '#333',
            fontWeight: activeTab === 'expenses' ? 'bold' : 'normal',
          }}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          style={{
            padding: '10px 20px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            fontSize: '15px',
            backgroundColor: activeTab === 'balances' ? '#007bff' : '#eee',
            color: activeTab === 'balances' ? 'white' : '#333',
            fontWeight: activeTab === 'balances' ? 'bold' : 'normal',
          }}
        >
          Balances
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>Members</h2>
            <button
              onClick={() => setShowAddMemberModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Add Member
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groupData.members.map((member) => (
              <div
                key={member.id}
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
                  <div style={{ fontWeight: 'bold' }}>{getMemberDisplayName(member)}</div>
                  {member.user && <div style={{ fontSize: '14px', color: '#666' }}>{member.user.email}</div>}
                  {member.placeholderPhone && (
                    <div style={{ fontSize: '14px', color: '#666' }}>{member.placeholderPhone}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {member.userId === null && (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      Placeholder
                    </span>
                  )}
                  <span
                    style={{
                      padding: '4px 8px',
                      backgroundColor: member.role === 'ADMIN' ? '#2196F3' : '#999',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>Expenses</h2>
            <button
              onClick={() => navigate(`/groups/${groupId}/expenses/create`)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Add Expense
            </button>
          </div>
          {expensesLoading ? (
            <div>Loading expenses...</div>
          ) : expensesData && expensesData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expensesData.map((expense) => (
                <div
                  key={expense.id}
                  style={{
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'bold' }}>{expense.description}</div>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                      {formatCurrency(expense.totalAmountPaise)}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Paid by {getMemberDisplayName(expense.paidBy)} on{' '}
                    {new Date(expense.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No expenses yet. Add your first expense!
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div>
          <h2>Balances</h2>
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
            View Detailed Balances
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          groupId={groupId!}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => {
            setShowAddMemberModal(false);
            refetchGroup();
          }}
        />
      )}
    </div>
  );
}
