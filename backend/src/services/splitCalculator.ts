interface CalculatedSplit {
  memberId: string;
  amountPaise: number;
}

interface ExactSplit {
  memberId: string;
  amountPaise: number;
}

interface PercentageSplit {
  memberId: string;
  percentage: number;
}

interface SharesSplit {
  memberId: string;
  shares: number;
}

export function calculateEqualSplit(
  totalAmountPaise: number,
  memberIds: string[]
): CalculatedSplit[] {
  const memberCount = memberIds.length;
  const baseAmount = Math.floor(totalAmountPaise / memberCount);
  const remainder = totalAmountPaise % memberCount;

  const splits: CalculatedSplit[] = memberIds.map((memberId, index) => ({
    memberId,
    amountPaise: baseAmount + (index === 0 ? remainder : 0),
  }));

  validateSplitInvariant(
    splits.map((s) => s.amountPaise),
    totalAmountPaise
  );

  return splits;
}

export function calculateExactSplit(
  totalAmountPaise: number,
  splits: ExactSplit[]
): CalculatedSplit[] {
  const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
  if (sum !== totalAmountPaise) {
    throw new Error(
      'Split Invariant violated: sum('  + sum +  ') !== total(' + totalAmountPaise + ')'
    );
  }

  return splits.map((s) => ({
    memberId: s.memberId,
    amountPaise: s.amountPaise,
  }));
}

export function calculatePercentageSplit(
  totalAmountPaise: number,
  splits: PercentageSplit[]
): CalculatedSplit[] {
  const percentageSum = splits.reduce((acc, s) => acc + s.percentage, 0);
  if (Math.abs(percentageSum - 100.0) > 0.01) {
    throw new Error('Percentages must sum to 100, got ' + percentageSum);
  }

  const calculated = splits.map((s) => ({
    memberId: s.memberId,
    amountPaise: Math.floor((totalAmountPaise * s.percentage) / 100),
  }));

  const sum = calculated.reduce((acc, s) => acc + s.amountPaise, 0);
  const remainder = totalAmountPaise - sum;
  if (remainder > 0) {
    calculated[0].amountPaise += remainder;
  }

  validateSplitInvariant(
    calculated.map((s) => s.amountPaise),
    totalAmountPaise
  );

  return calculated;
}

export function calculateSharesSplit(
  totalAmountPaise: number,
  splits: SharesSplit[]
): CalculatedSplit[] {
  const totalShares = splits.reduce((acc, s) => acc + s.shares, 0);

  const calculated = splits.map((s) => ({
    memberId: s.memberId,
    amountPaise: Math.floor((totalAmountPaise * s.shares) / totalShares),
  }));

  const sum = calculated.reduce((acc, s) => acc + s.amountPaise, 0);
  const remainder = totalAmountPaise - sum;
  if (remainder > 0) {
    calculated[0].amountPaise += remainder;
  }

  validateSplitInvariant(
    calculated.map((s) => s.amountPaise),
    totalAmountPaise
  );

  return calculated;
}

function validateSplitInvariant(amounts: number[], totalAmountPaise: number): void {
  const sum = amounts.reduce((acc, amt) => acc + amt, 0);
  if (sum !== totalAmountPaise) {
    throw new Error(
      'Split Invariant violated: sum(' + sum + ') !== total(' + totalAmountPaise + ')'
    );
  }
}
