import React, { useState } from 'react';
import { api } from '../../lib/api';

interface AddMemberModalProps {
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'registered' | 'placeholder';

export function AddMemberModal({ groupId, onClose, onSuccess }: AddMemberModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('registered');
  const [email, setEmail] = useState('');
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderPhone, setPlaceholderPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRegistered = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/groups/${groupId}/members`, { email: email.trim() });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add member');
      setIsSubmitting(false);
    }
  };

  const handleSubmitPlaceholder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!placeholderName.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        placeholderName: placeholderName.trim(),
      };
      if (placeholderPhone.trim()) {
        payload.placeholderPhone = placeholderPhone.trim();
      }
      await api.post(`/groups/${groupId}/members`, payload);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add placeholder member');
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
        <h2 style={{ marginTop: 0 }}>Add Member</h2>

        {/* Tab Bar */}
        <div style={{ borderBottom: '2px solid #007bff', marginBottom: '20px' }}>
          <button
            onClick={() => {
              setActiveTab('registered');
              setError('');
            }}
            style={{
              padding: '10px 20px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontSize: '15px',
              backgroundColor: activeTab === 'registered' ? '#007bff' : '#eee',
              color: activeTab === 'registered' ? 'white' : '#333',
              fontWeight: activeTab === 'registered' ? 'bold' : 'normal',
            }}
          >
            Registered User
          </button>
          <button
            onClick={() => {
              setActiveTab('placeholder');
              setError('');
            }}
            style={{
              padding: '10px 20px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontSize: '15px',
              backgroundColor: activeTab === 'placeholder' ? '#007bff' : '#eee',
              color: activeTab === 'placeholder' ? 'white' : '#333',
              fontWeight: activeTab === 'placeholder' ? 'bold' : 'normal',
            }}
          >
            Placeholder
          </button>
        </div>

        {/* Registered User Tab */}
        {activeTab === 'registered' && (
          <form onSubmit={handleSubmitRegistered} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                required
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
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* Placeholder Tab */}
        {activeTab === 'placeholder' && (
          <form onSubmit={handleSubmitPlaceholder} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label htmlFor="placeholderName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Name *
              </label>
              <input
                id="placeholderName"
                type="text"
                value={placeholderName}
                onChange={(e) => setPlaceholderName(e.target.value)}
                placeholder="Enter name"
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                required
              />
            </div>

            <div>
              <label htmlFor="placeholderPhone" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Phone (optional)
              </label>
              <input
                id="placeholderPhone"
                type="tel"
                value={placeholderPhone}
                onChange={(e) => setPlaceholderPhone(e.target.value)}
                placeholder="Enter phone number"
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
                {isSubmitting ? 'Adding...' : 'Add Placeholder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
