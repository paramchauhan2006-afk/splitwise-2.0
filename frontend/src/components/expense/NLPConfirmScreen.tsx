import React, { useState } from 'react';
import { api } from '../../lib/api';
import { ParsedExpense } from '../../types/expense';

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  user: { id: string; name: string; email: string } | null;
}

interface Props {
  groupId: string;
  parsed: ParsedExpense;
  members: Member[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function NLPConfirmScreen({ groupId, parsed, members, onConfirm, onCancel }: Props) {
  const [description, setDescription] = useState(parsed.description);
  const [amount, setAmount] = useState((parsed.totalAmountPaise / 100).toFixed(2));
  const [selectedPayerId, setSelectedPayerId] = useState(parsed.suggestedPayerMemberId || '');
  const [checkedMemberIds, setCheckedMemberIds] = useState<Set<string>>(new Set(parsed.participantMemberIds));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const handleMemberToggle = (memberId: string) => {
    const newChecked = new Set(checkedMemberIds);
    if (newChecked.has(memberId)) {
      newChecked.delete(memberId);
    } else {
      newChecked.add(memberId);
    }
    setCheckedMemberIds(newChecked);
  };

  const handleConfirm = async () => {
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

    if (!selectedPayerId) {
      setError('Please select who paid');
      return;
    }

    if (checkedMemberIds.size === 0) {
      setError('Please select at least one member for split');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        totalAmountPaise,
        paidByMemberId: selectedPayerId,
        splitType: 'EQUAL',
        memberIds: Array.from(checkedMemberIds),
        date: new Date().toISOString(),
      };

      await api.post(`/groups/${groupId}/expenses`, payload);
      onConfirm();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create expense');
      setIsSubmitting(false);
    }
  };

  const getConfidenceBadge = () => {
    if (parsed.confidence >= 0.8) {
      return (
        <span
          style={{
            padding: '4px 8px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          High confidence
        </span>
      );
    } else if (parsed.confidence >= 0.5) {
      return (
        <span
          style={{
            padding: '4px 8px',
            backgroundColor: '#ff9800',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Review carefully
        </span>
      );
    } else {
      return (
        <span
          style={{
            padding: '4px 8px',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Low confidence Ã¢â‚¬â€ verify all fields
        </span>
      );
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Review AI-Parsed Expense</h3>
        {getConfidenceBadge()}
      </div>

      <div
        style={{
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px',
        }}
      >
        <strong>Original text:</strong> "{parsed.rawText}"
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description *
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="amount" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Amount (Ã¢â€šÂ¹) *
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
            value={selectedPayerId}
            onChange={(e) => setSelectedPayerId(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {getMemberDisplayName(member)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Members Included in Split *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((member) => (
              <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checkedMemberIds.has(member.id)}
                  onChange={() => handleMemberToggle(member.id)}
                />
                <span>{getMemberDisplayName(member)}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#fee',
              border: '1px solid #c00',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#c00',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isSubmitting ? 'Saving...' : 'Confirm & Save'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
