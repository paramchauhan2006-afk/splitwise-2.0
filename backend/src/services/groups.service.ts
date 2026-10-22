import { prisma } from '../lib/prisma';

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

  return prisma.group.update({
    where: { id: groupId },
    data: { isArchived: true },
  });
}
