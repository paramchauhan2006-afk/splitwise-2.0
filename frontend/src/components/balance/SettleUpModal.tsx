import React, { useState } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, paiseToRupees } from '../../utils/moneyUtils';

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  user: { id: string; name: string; email: string } | null;
}

interface SettleUpModalProps {
  groupId: string;
  fromMember: Member;
  toMember: Member;
  suggestedAmountPaise: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettleUpModal({
  groupId,
  fromMember,
  toMember,
  suggestedAmountPaise,
  onClose,
  onSuccess,
}: SettleUpModalProps) {
  const [amount, setAmount] = useState(paiseToRupees(suggestedAmountPaise));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountPaise = Math.floor(parseFloat(amount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        fromGroupMemberId: fromMember.id,
        toGroupMemberId: toMember.id,
        amountPaise,
        method: 'MANUAL',
      };

      if (note.trim()) {
        payload.note = note.trim();
      }

      await api.post(`/groups/${groupId}/settlements`, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to record settlement');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Settle Up</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div
            style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          >
            <strong>{getMemberDisplayName(fromMember)}</strong> pays <strong>{getMemberDisplayName(toMember)}</strong>
          </div>

          <div>
            <label htmlFor="amount" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Amount (â‚¹) *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
            />
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Suggested: {formatCurrency(suggestedAmountPaise)}
            </div>
          </div>

          <div>
            <label htmlFor="note" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Note (optional)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Payment details or note"
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
