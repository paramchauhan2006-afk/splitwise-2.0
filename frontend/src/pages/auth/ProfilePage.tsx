
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { isValidUpiId } from '../../utils/upiUtils';

export function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, setUser } = useAuthStore();
  const [upiId, setUpiId] = useState(currentUser?.upiId ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { upiId: string }) => {
      const response = await api.patch('/auth/profile', data);
      return response.data.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccess('UPI ID saved!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message ?? 'Failed to update profile');
      setSuccess('');
    },
  });

  const handleSave = () => {
    setError('');
    setSuccess('');

    if (upiId.trim() && !isValidUpiId(upiId)) {
      setError('Invalid UPI ID format. It must contain @ symbol (e.g., yourname@upi)');
      return;
    }

    updateProfileMutation.mutate({ upiId: upiId.trim() });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <button
        onClick={() => navigate('/groups')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ddd',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        ← Back to Dashboard
      </button>

      <h1>My Profile</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        {/* Name (read-only) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Name</label>
          <input
            type="text"
            value={currentUser?.name ?? ''}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
              color: '#666',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            value={currentUser?.email ?? ''}
            disabled
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
              color: '#666',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {/* UPI ID (editable) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>UPI ID</label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
            Your UPI ID lets others pay you directly from the app. Find it in GPay, PhonePe, or Paytm settings.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              border: '1px solid #ef5350',
            }}
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              borderRadius: '4px',
              border: '1px solid #66bb6a',
            }}
          >
            {success}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          style={{
            padding: '12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: updateProfileMutation.isPending ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: updateProfileMutation.isPending ? 0.6 : 1,
          }}
        >
          {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
