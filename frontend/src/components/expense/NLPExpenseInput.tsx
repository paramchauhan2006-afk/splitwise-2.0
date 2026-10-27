import React, { useState } from 'react';
import { api } from '../../lib/api';
import { ParsedExpense } from '../../types/expense';

interface Props {
  groupId: string;
  onParsed: (parsed: ParsedExpense) => void;
}

export function NLPExpenseInput({ groupId, onParsed }: Props) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');

    if (!text.trim()) {
      setError('Please enter expense details');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/ai/parse-expense', {
        text: text.trim(),
        groupId,
      });

      setWarning(response.data.data.warning);
      onParsed(response.data.data.parsedExpense);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to parse expense');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "I paid Rs. 900 for dinner for me, Bob and Rahul"'
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? 'Parsing...' : 'Parse'}
          </button>
        </div>

        {warning && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#e65100',
            }}
          >
            {warning}
          </div>
        )}

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
      </form>
    </div>
  );
}
