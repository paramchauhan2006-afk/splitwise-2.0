import { prisma } from '../lib/prisma';

export async function createSettlement(
  groupId: string,
  data: {
    fromGroupMemberId: string;
    toGroupMemberId: string;
    amountPaise: number;
    method: 'MANUAL' | 'UPI_DEEPLINK' | 'UPI_GATEWAY';
    note?: string;
  }
) {
  if (data.fromGroupMemberId === data.toGroupMemberId) {
    throw new Error('Cannot settle with self');
  }

  if (data.amountPaise <= 0) {
    throw new Error('Amount must be positive');
  }

  return prisma.settlement.create({
    data: {
      groupId,
      ...data,
    },
  });
}

export async function listSettlements(groupId: string) {
  return prisma.settlement.findMany({
    where: { groupId },
    include: {
      fromMember: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      toMember: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { settledAt: 'desc' },
  });
}
