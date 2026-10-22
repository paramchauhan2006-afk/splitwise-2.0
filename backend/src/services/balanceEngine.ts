import { prisma } from '../lib/prisma';

interface Balance {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

export async function calculateNetBalances(groupId: string): Promise<Balance[]> {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: true,
    },
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  const debtMap = new Map<string, number>();

  for (const expense of expenses) {
    const payerGroupMember = await prisma.groupMember.findFirst({
      where: {
        userId: expense.paidByUserId,
        groupId: expense.groupId,
      },
    });

    if (!payerGroupMember) continue;

    for (const split of expense.splits) {
      const splitGroupMemberId = split.groupMemberId;

      if (splitGroupMemberId === payerGroupMember.id) continue;

      const key = splitGroupMemberId + '_' + payerGroupMember.id;
      const currentDebt = debtMap.get(key) || 0;
      debtMap.set(key, currentDebt + split.amountPaise);
    }
  }

  for (const settlement of settlements) {
    const key = settlement.fromGroupMemberId + '_' + settlement.toGroupMemberId;
    const currentDebt = debtMap.get(key) || 0;
    debtMap.set(key, currentDebt - settlement.amountPaise);
  }

  const balances: Balance[] = [];
  for (const [key, amount] of debtMap.entries()) {
    if (amount > 0) {
      const [fromMemberId, toMemberId] = key.split('_');
      balances.push({ fromMemberId, toMemberId, amountPaise: amount });
    }
  }

  return balances;
}

export function minimizeTransfers(balances: Balance[]): Transfer[] {
  const netPosition = new Map<string, number>();

  for (const balance of balances) {
    const debtorCurrent = netPosition.get(balance.fromMemberId) || 0;
    netPosition.set(balance.fromMemberId, debtorCurrent - balance.amountPaise);

    const creditorCurrent = netPosition.get(balance.toMemberId) || 0;
    netPosition.set(balance.toMemberId, creditorCurrent + balance.amountPaise);
  }

  const creditors: Array<{ memberId: string; amount: number }> = [];
  const debtors: Array<{ memberId: string; amount: number }> = [];

  for (const [memberId, amount] of netPosition.entries()) {
    if (amount > 0) {
      creditors.push({ memberId, amount });
    } else if (amount < 0) {
      debtors.push({ memberId, amount: -amount });
    }
  }

  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const maxCreditor = creditors[0];
    const maxDebtor = debtors[0];

    const settleAmount = Math.min(maxCreditor.amount, maxDebtor.amount);

    transfers.push({
      fromMemberId: maxDebtor.memberId,
      toMemberId: maxCreditor.memberId,
      amountPaise: settleAmount,
    });

    maxCreditor.amount -= settleAmount;
    maxDebtor.amount -= settleAmount;

    if (maxCreditor.amount === 0) {
      creditors.shift();
    }
    if (maxDebtor.amount === 0) {
      debtors.shift();
    }
  }

  return transfers;
}
