import React, { useState } from 'react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/moneyUtils';

interface Member {
  id: string;
  userId: string | null;
  placeholderName: string | null;
  user: { id: string; name: string; email: string } | null;
}

interface Props {
  groupId: string;
  members: Member[];
  onComplete: () => void;
  onCancel: () => void;
}

interface ScannedBill {
  items: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
    totalPricePaise: number;
  }>;
  subtotalPaise: number;
  taxPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  vendor: string | null;
  confidence: number;
}

type ScanState = 'upload' | 'review' | 'assign';

export function BillScanner({ groupId, members, onComplete, onCancel }: Props) {
  const [scanState, setScanState] = useState<ScanState>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [scannedBill, setScannedBill] = useState<ScannedBill | null>(null);
  const [editedGrandTotal, setEditedGrandTotal] = useState('');
  const [editedItems, setEditedItems] = useState<ScannedBill['items']>([]);
  const [memberSelections, setMemberSelections] = useState<Record<number, Set<string>>>({});
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getMemberDisplayName = (member: Member) => {
    return member.user?.name ?? member.placeholderName ?? 'Unknown';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleScanBill = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsScanning(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('groupId', groupId);

      const response = await api.post('/ai/scan-bill', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

      const bill = response.data.data.scannedBill as ScannedBill;
      setScannedBill(bill);
      setEditedGrandTotal((bill.grandTotalPaise / 100).toFixed(2));
      setEditedItems(bill.items);

      // Initialize member selections - all members checked for all items
      const initialSelections: Record<number, Set<string>> = {};
      bill.items.forEach((_, index) => {
        initialSelections[index] = new Set(members.map((m) => m.id));
      });
      setMemberSelections(initialSelections);

      setScanState('review');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to scan bill');
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemDescriptionChange = (index: number, newDescription: string) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], description: newDescription };
    setEditedItems(newItems);
  };

  const toggleMemberForItem = (itemIndex: number, memberId: string) => {
    const newSelections = { ...memberSelections };
    if (!newSelections[itemIndex]) {
      newSelections[itemIndex] = new Set();
    }
    const itemSet = new Set(newSelections[itemIndex]);
    if (itemSet.has(memberId)) {
      itemSet.delete(memberId);
    } else {
      itemSet.add(memberId);
    }
    newSelections[itemIndex] = itemSet;
    setMemberSelections(newSelections);
  };

  const handleConfirmAndSave = async () => {
    if (!scannedBill) return;

    setError('');

    if (!selectedPayerId) {
      setError('Please select who paid');
      return;
    }

    // Calculate each member's total
    const memberTotals: Record<string, number> = {};
    const grandTotalPaise = Math.floor(parseFloat(editedGrandTotal) * 100);

    members.forEach((member) => {
      memberTotals[member.id] = 0;
    });

    // Calculate subtotal for each member based on items they ordered
    let totalMemberSubtotal = 0;
    editedItems.forEach((item, index) => {
      const membersForItem = memberSelections[index] || new Set();
      const memberCount = membersForItem.size;
      if (memberCount > 0) {
        const perMemberShare = Math.floor(item.totalPricePaise / memberCount);
        membersForItem.forEach((memberId) => {
          memberTotals[memberId] += perMemberShare;
          totalMemberSubtotal += perMemberShare;
        });
      }
    });

    // Distribute tax proportionally
    if (scannedBill.taxPaise > 0 && totalMemberSubtotal > 0) {
      members.forEach((member) => {
        if (memberTotals[member.id] > 0) {
          const memberTax = Math.floor((scannedBill.taxPaise * memberTotals[member.id]) / totalMemberSubtotal);
          memberTotals[member.id] += memberTax;
        }
      });
    }

    // Distribute discount proportionally (subtract)
    if (scannedBill.discountPaise > 0 && totalMemberSubtotal > 0) {
      members.forEach((member) => {
        if (memberTotals[member.id] > 0) {
          const memberDiscount = Math.floor((scannedBill.discountPaise * memberTotals[member.id]) / totalMemberSubtotal);
          memberTotals[member.id] -= memberDiscount;
        }
      });
    }

    // Handle rounding: add remainder to first member with a share
    const calculatedTotal = Object.values(memberTotals).reduce((sum, val) => sum + val, 0);
    const remainder = grandTotalPaise - calculatedTotal;
    if (remainder !== 0) {
      const firstMemberWithShare = members.find((m) => memberTotals[m.id] > 0);
      if (firstMemberWithShare) {
        memberTotals[firstMemberWithShare.id] += remainder;
      }
    }

    // Validate
    const finalTotal = Object.values(memberTotals).reduce((sum, val) => sum + val, 0);
    if (Math.abs(finalTotal - grandTotalPaise) > 1) {
      setError(`Split total mismatch. Expected ${formatCurrency(grandTotalPaise)}, got ${formatCurrency(finalTotal)}`);
      return;
    }

    // Build splits (only non-zero amounts)
    const splits = members
      .map((member) => ({
        memberId: member.id,
        amountPaise: memberTotals[member.id] || 0,
      }))
      .filter((s) => s.amountPaise > 0);

    if (splits.length === 0) {
      setError('At least one member must have items assigned');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        description: scannedBill.vendor || 'Bill split',
        totalAmountPaise: grandTotalPaise,
        paidByMemberId: selectedPayerId,
        splitType: 'EXACT',
        splits,
        date: new Date().toISOString(),
      };

      await api.post(`/groups/${groupId}/expenses`, payload);
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create expense');
      setIsSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
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
    } else if (confidence >= 0.5) {
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
          Low confidence — verify all fields
        </span>
      );
    }
  };

  // STATE 1: UPLOAD
  if (scanState === 'upload') {
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
        <h3>Scan Bill</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label htmlFor="billImage" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select Bill Image
            </label>
            <input
              id="billImage"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ padding: '8px', fontSize: '16px' }}
            />
          </div>

          {previewUrl && (
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Preview:</p>
              <img
                src={previewUrl}
                alt="Bill preview"
                style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px',
                backgroundColor: '#fee',
                border: '1px solid #c00',
                borderRadius: '4px',
                color: '#c00',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleScanBill}
              disabled={!selectedFile || isScanning}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !selectedFile || isScanning ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isScanning ? 'Scanning...' : 'Scan Bill'}
            </button>
            <button
              onClick={onCancel}
              disabled={isScanning}
              style={{
                padding: '10px 20px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isScanning ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: REVIEW
  if (scanState === 'review' && scannedBill) {
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
          <h3 style={{ margin: 0 }}>Review Scanned Bill</h3>
          {getConfidenceBadge(scannedBill.confidence)}
        </div>

        {scannedBill.vendor && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Vendor:</strong> {scannedBill.vendor}
          </div>
        )}

        <div
          style={{
            padding: '10px',
            backgroundColor: '#fff3e0',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
          }}
        >
          <strong>Warning:</strong> Review all items before assigning to members
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Unit Price</th>
                <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {editedItems.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemDescriptionChange(index, e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '2px' }}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>
                    {formatCurrency(item.unitPricePaise)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>
                    {formatCurrency(item.totalPricePaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Subtotal:</strong>
            <span>{formatCurrency(scannedBill.subtotalPaise)}</span>
          </div>
          {scannedBill.taxPaise > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Tax:</strong>
              <span>{formatCurrency(scannedBill.taxPaise)}</span>
            </div>
          )}
          {scannedBill.discountPaise > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Discount:</strong>
              <span>-{formatCurrency(scannedBill.discountPaise)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #333' }}>
            <strong>Grand Total:</strong>
            <input
              type="text"
              value={editedGrandTotal}
              onChange={(e) => setEditedGrandTotal(e.target.value)}
              style={{ width: '100px', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setScanState('assign')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Assign Items
          </button>
          <button
            onClick={() => {
              setScanState('upload');
              setScannedBill(null);
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Re-scan
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: ASSIGN
  if (scanState === 'assign' && scannedBill) {
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
        <h3>Assign Items to Members</h3>

        <div style={{ marginBottom: '20px' }}>
          {editedItems.map((item, itemIndex) => (
            <div
              key={itemIndex}
              style={{
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '4px',
                marginBottom: '10px',
                border: '1px solid #ddd',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                {item.description} - {formatCurrency(item.totalPricePaise)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {members.map((member) => (
                  <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={memberSelections[itemIndex]?.has(member.id) || false}
                      onChange={() => toggleMemberForItem(itemIndex, member.id)}
                    />
                    <span>{getMemberDisplayName(member)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
            <span>Grand Total:</span>
            <span>{formatCurrency(Math.floor(parseFloat(editedGrandTotal) * 100))}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
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

        {error && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#fee',
              border: '1px solid #c00',
              borderRadius: '4px',
              color: '#c00',
              marginBottom: '15px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleConfirmAndSave}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
          <button
            onClick={() => setScanState('review')}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return null;
}
