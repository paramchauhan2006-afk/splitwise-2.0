import { prisma } from '../lib/prisma';

export async function addMember(
  groupId: string,
  callerUserId: string,
  data: {
    email?: string;
    placeholderName?: string;
    placeholderPhone?: string;
    placeholderEmail?: string;
    role?: 'ADMIN' | 'MEMBER';
  }
) {
  // Verify caller is a member
  const callerMembership = await prisma.groupMember.findFirst({
    where: { groupId, userId: callerUserId },
  });

  if (!callerMembership) {
    throw new Error('Not a member of this group');
  }

  // Enforce Placeholder Invariant
  const hasUserId = !!data.email;
  const hasPlaceholder = !!data.placeholderName;

  if (!hasUserId && !hasPlaceholder) {
    throw new Error('Placeholder Invariant violated: must provide either email or placeholderName');
  }

  if (hasUserId && hasPlaceholder) {
    throw new Error('Placeholder Invariant violated: cannot provide both email and placeholderName');
  }

  if (data.email) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new Error('User not found');
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new Error('User already a member');
    }

    return prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role: data.role || 'MEMBER',
      },
    });
  } else {
    return prisma.groupMember.create({
      data: {
        groupId,
        placeholderName: data.placeholderName,
        placeholderPhone: data.placeholderPhone,
        placeholderEmail: data.placeholderEmail,
        role: data.role || 'MEMBER',
      },
    });
  }
}

export async function removeMember(
  groupId: string,
  memberId: string,
  callerUserId: string
) {
  const callerMembership = await prisma.groupMember.findFirst({
    where: { groupId, userId: callerUserId, role: 'ADMIN' },
  });

  if (!callerMembership) {
    throw new Error('Only admins can remove members');
  }

  const unsettledSplits = await prisma.expenseSplit.count({
    where: {
      groupMemberId: memberId,
      isSettled: false,
    },
  });

  if (unsettledSplits > 0) {
    throw new Error('Cannot remove member with unsettled balances');
  }

  await prisma.groupMember.delete({ where: { id: memberId } });
}
