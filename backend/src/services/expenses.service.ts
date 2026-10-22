import { prisma } from '../lib/prisma';
import * as splitCalculator from './splitCalculator';

export async function createExpense(
  groupId: string,
  userId: string,
  data: {
    description: string;
    totalAmountPaise: number;
    paidByMemberId: string;
    splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
    date?: Date;
    notes?: string;
    memberIds?: string[];
    splits?: any[];
  }
) {
  let calculatedSplits;

  switch (data.splitType) {
    case 'EQUAL':
      calculatedSplits = splitCalculator.calculateEqualSplit(
        data.totalAmountPaise,
        data.memberIds!
      );
      break;
    case 'EXACT':
      calculatedSplits = splitCalculator.calculateExactSplit(
        data.totalAmountPaise,
        data.splits!
      );
      break;
    case 'PERCENTAGE':
      calculatedSplits = splitCalculator.calculatePercentageSplit(
        data.totalAmountPaise,
        data.splits!
      );
      break;
    case 'SHARES':
      calculatedSplits = splitCalculator.calculateSharesSplit(
        data.totalAmountPaise,
        data.splits!
      );
      break;
  }

  const sum = calculatedSplits.reduce((acc, s) => acc + s.amountPaise, 0);
  if (sum !== data.totalAmountPaise) {
    throw new Error('Split Invariant violated');
  }

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        groupId,
        description: data.description,
        totalAmountPaise: data.totalAmountPaise,
        paidByUserId: data.paidByMemberId,
        splitType: data.splitType,
        date: data.date || new Date(),
        notes: data.notes,
        createdByUserId: userId,
      },
    });

    const splits = await Promise.all(
      calculatedSplits.map((split) =>
        tx.expenseSplit.create({
          data: {
            expenseId: expense.id,
            groupMemberId: split.memberId,
            amountPaise: split.amountPaise,
            isSettled: false,
          },
        })
      )
    );

    const totalSplit = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    if (totalSplit !== expense.totalAmountPaise) {
      throw new Error('Split Invariant violated in transaction');
    }

    return { expense, splits };
  });
}

export async function listExpenses(groupId: string) {
  return prisma.expense.findMany({
    where: { groupId },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { splits: true },
      },
    },
    orderBy: { date: 'desc' },
  });
}

export async function getExpense(expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      splits: {
        include: {
          groupMember: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
