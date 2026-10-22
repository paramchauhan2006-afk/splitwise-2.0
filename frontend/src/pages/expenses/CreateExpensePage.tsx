import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  role: 'ADMIN' | 'MEMBER';
  user: User | null;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

interface Split {
  memberId: string;
  amountRupees?: number;
  percentage?: number;
  shares?: number;
}

export function CreateExpensePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [splits, setSplits] = useState<Record<string, Split>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: groupData, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await api.get(`/groups/${groupId}`);
      return response.data.data.group as Group;
    },
  });

  useEffect(() => {
    if (!groupData?.members || groupData.members.length === 0) return;
    setSelectedMembers(new Set(groupData.members.map((m) => m.id)));
    const initialSplits: Record<string, Split> = {};
    groupData.members.forEach((member) => {
      initialSplits[member.id] = { memberId: member.id, shares: 1 };
    });
    setSplits(initialSplits);
  }, [groupData]);

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSplitChange = (
    memberId: string,
    field: 'amountRupees' | 'percentage' | 'shares',
    value: string
  ) => {
    setSplits((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        memberId,
        [field]: parseFloat(value || '0'),
      },
    }));
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    const totalAmountPaise = Math.floor(parseFloat(amount) * 100);
    if (isNaN(totalAmountPaise) || totalAmountPaise <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!paidByMemberId) {
      setError('Please select who paid');
      return;
    }

    if (selectedMembers.size === 0) {
      setError('Please select at least one member for split');
      return;
    }

    if (splitType === 'EXACT') {
      // User enters rupees — compare rupee sum to rupee total
      const sumRupees = Array.from(selectedMembers).reduce((acc, memberId) => {
        return acc + (splits[memberId]?.amountRupees || 0);
      }, 0);
      const totalRupees = parseFloat(amount);
      if (Math.abs(sumRupees - totalRupees) > 0.01) {
        setError(`Split amounts must equal total. Current sum: ${sumRupees.toFixed(2)}`);
        return;
      }
    }

    if (splitType === 'PERCENTAGE') {
      const sum = Array.from(selectedMembers).reduce((acc, memberId) => {
        return acc + (splits[memberId]?.percentage || 0);
      }, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setError(`Percentages must sum to 100. Current sum: ${sum.toFixed(2)}%`);
        return;
      }
    }

    const payload: any = {
      description: description.trim(),
      totalAmountPaise,
      paidByMemberId,
      splitType,
      date,
    };

    if (splitType === 'EQUAL') {
      payload.memberIds = Array.from(selectedMembers);
    } else if (splitType === 'EXACT') {
      // Convert rupees to paise at submit time
      payload.splits = Array.from(selectedMembers).map((memberId) => ({
        memberId,
        amountPaise: Math.floor((splits[memberId]?.amountRupees || 0) * 100),
      }));
    } else if (splitType === 'PERCENTAGE') {
      payload.splits = Array.from(selectedMembers).map((memberId) => ({
        memberId,
        percentage: splits[memberId]?.percentage || 0,
      }));
    } else if (splitType === 'SHARES') {
      payload.splits = Array.from(selectedMembers).map((memberId) => ({
        memberId,
        shares: splits[memberId]?.shares || 1,
      }));
    }

    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/expenses`, payload);
      navigate(`/groups/${groupId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create expense');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!groupData) {
    return <div style={{ padding: '20px' }}>Group not found</div>;
  }

  return (
    <div style={{ maxWidth: '700px', margin: '20px auto', padding: '20px' }}>
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
        Back to Group
      </button>

      <h1>Add Expense to {groupData.name}</h1>

      <form onSubmit={validateAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description *
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="amount" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Amount (Rs.) *
          </label>
          <input
            id="amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="paidBy" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Paid By *
          </label>
          <select
            id="paidBy"
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          >
            <option value="">Select member</option>
            {groupData.members.map((member) => (
              <option key={member.id} value={member.id}>
                {getMemberDisplayName(member)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Date *
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="splitType" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Split Type *
          </label>
          <select
            id="splitType"
            value={splitType}
            onChange={(e) => {
              setSplitType(e.target.value as SplitType);
              setSplits({});
            }}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          >
            <option value="EQUAL">Equal</option>
            <option value="EXACT">Exact Amounts</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="SHARES">Shares</option>
          </select>
        </div>

        <div>
          <h3>Split Details</h3>

          {splitType === 'EQUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupData.members.map((member) => (
                <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                  />
                  <span>{getMemberDisplayName(member)}</span>
                </label>
              ))}
            </div>
          )}

          {splitType === 'EXACT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupData.members.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                  />
                  <span style={{ flex: 1 }}>{getMemberDisplayName(member)}</span>
                  {selectedMembers.has(member.id) && (
                    <input
                      type="text"
                      placeholder="0.00"
                      value={splits[member.id]?.amountRupees || ''}
                      onChange={(e) => handleSplitChange(member.id, 'amountRupees', e.target.value)}
                      style={{ width: '100px', padding: '6px' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {splitType === 'PERCENTAGE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupData.members.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                  />
                  <span style={{ flex: 1 }}>{getMemberDisplayName(member)}</span>
                  {selectedMembers.has(member.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="text"
                        placeholder="0"
                        value={splits[member.id]?.percentage || ''}
                        onChange={(e) => handleSplitChange(member.id, 'percentage', e.target.value)}
                        style={{ width: '80px', padding: '6px' }}
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {splitType === 'SHARES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupData.members.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                  />
                  <span style={{ flex: 1 }}>{getMemberDisplayName(member)}</span>
                  {selectedMembers.has(member.id) && (
                    <input
                      type="text"
                      placeholder="1"
                      value={splits[member.id]?.shares || ''}
                      onChange={(e) => handleSplitChange(member.id, 'shares', e.target.value)}
                      style={{ width: '80px', padding: '6px' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Expense'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}`)}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}