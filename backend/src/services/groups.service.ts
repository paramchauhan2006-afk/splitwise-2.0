import { prisma } from '../lib/prisma';
import { calculateNetBalances } from './balanceEngine';

export async function checkAndArchiveExpiredTrips(userId: string): Promise<void> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: true,
    },
  });

  const now = new Date();

  for (const membership of memberships) {
    const group = membership.group;
    if (
      group.isTrip &&
      !group.isArchived &&
      group.tripEndDate &&
      group.tripEndDate < now
    ) {
      await prisma.group.update({
        where: { id: group.id },
        data: { isArchived: true },
      });
    }
  }
}

export async function createGroup(
  userId: string,
  data: { name: string; description?: string; isTrip?: boolean; tripEndDate?: Date }
) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        ...data,
        createdByUserId: userId,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: userId,
        role: 'ADMIN',
      },
    });

    return group;
  });
}

export async function listGroups(userId: string) {
  await checkAndArchiveExpiredTrips(userId);

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.group,
    memberCount: m.group._count.members,
    myRole: m.role,
    isTrip: m.group.isTrip,
    tripEndDate: m.group.tripEndDate,
    isArchived: m.group.isArchived,
  }));
}

export async function getGroup(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  });

  if (!membership) {
    throw new Error('Not a member of this group');
  }

  return prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function updateGroup(
  groupId: string,
  userId: string,
  data: { name?: string; description?: string; tripEndDate?: Date }
) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, role: 'ADMIN' },
  });

  if (!membership) {
    throw new Error('Only admins can update groups');
  }

  return prisma.group.update({
    where: { id: groupId },
    data,
  });
}

export async function archiveGroup(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, role: 'ADMIN' },
  });

  if (!membership) {
    throw new Error('Only admins can archive groups');
  }

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { isArchived: true },
  });

  const summary = await computeTripSummary(groupId);

  return { group, summary };
}

export async function getTripSummary(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  });

  if (!membership) {
    throw new Error('Not a member of this group');
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group || !group.isArchived) {
    throw new Error('Group must be archived to view summary');
  }

  return computeTripSummary(groupId);
}

async function computeTripSummary(groupId: string) {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: true,
    },
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const totalExpenses = expenses.length;
  const totalAmountPaise = expenses.reduce((sum, exp) => sum + exp.totalAmountPaise, 0);

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (expenses.length > 0) {
    const sortedDates = expenses.map((e) => e.date).sort((a, b) => a.getTime() - b.getTime());
    startDate = sortedDates[0];
    endDate = sortedDates[sortedDates.length - 1];
  }

  const perMember = [];

  for (const member of members) {
    const displayName = member.user?.name ?? member.placeholderName ?? 'Unknown';

    let totalPaidPaise = 0;
    if (member.userId) {
      totalPaidPaise = expenses
        .filter((exp) => exp.paidByUserId === member.userId)
        .reduce((sum, exp) => sum + exp.totalAmountPaise, 0);
    }

    const totalOwedPaise = expenses
      .flatMap((exp) => exp.splits)
      .filter((split) => split.groupMemberId === member.id)
      .reduce((sum, split) => sum + split.amountPaise, 0);

    const netPaise = totalPaidPaise - totalOwedPaise;

    perMember.push({
      memberId: member.id,
      displayName,
      totalPaidPaise,
      totalOwedPaise,
      netPaise,
    });
  }

  const rawBalances = await calculateNetBalances(groupId);

  const outstandingBalances = [];
  for (const balance of rawBalances) {
    const fromMember = members.find((m) => m.id === balance.fromMemberId);
    const toMember = members.find((m) => m.id === balance.toMemberId);

    if (fromMember && toMember) {
      outstandingBalances.push({
        fromMemberId: balance.fromMemberId,
        fromDisplayName: fromMember.user?.name ?? fromMember.placeholderName ?? 'Unknown',
        toMemberId: balance.toMemberId,
        toDisplayName: toMember.user?.name ?? toMember.placeholderName ?? 'Unknown',
        amountPaise: balance.amountPaise,
      });
    }
  }

  return {
    totalExpenses,
    totalAmountPaise,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    perMember,
    outstandingBalances,
  };
}
