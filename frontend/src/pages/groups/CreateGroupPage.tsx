import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export function CreateGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTrip, setIsTrip] = useState(false);
  const [tripEndDate, setTripEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        isTrip,
      };

      if (isTrip && tripEndDate) {
        payload.tripEndDate = tripEndDate;
      }

      const response = await api.post('/groups', payload);
      const newGroupId = response.data.data.group.id;
      navigate(`/groups/${newGroupId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create group');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>Create New Group</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Group Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isTrip}
              onChange={(e) => setIsTrip(e.target.checked)}
            />
            <span>This is a trip</span>
          </label>
        </div>

        {isTrip && (
          <div>
            <label htmlFor="tripEndDate" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Trip End Date
            </label>
            <input
              id="tripEndDate"
              type="date"
              value={tripEndDate}
              onChange={(e) => setTripEndDate(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>
        )}

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
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
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
