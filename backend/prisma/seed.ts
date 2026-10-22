import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@test.com',
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@test.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@test.com',
      passwordHash,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@test.com' },
    update: {},
    create: {
      name: 'Charlie',
      email: 'charlie@test.com',
      passwordHash,
    },
  });

  const flatGroup = await prisma.group.create({
    data: {
      name: 'Flat 4B',
      description: 'Roommates',
      createdByUserId: alice.id,
      isTrip: false,
    },
  });

  const aliceMember = await prisma.groupMember.create({
    data: {
      groupId: flatGroup.id,
      userId: alice.id,
      role: 'ADMIN',
    },
  });

  const bobMember = await prisma.groupMember.create({
    data: {
      groupId: flatGroup.id,
      userId: bob.id,
      role: 'MEMBER',
    },
  });

  const charlieMember = await prisma.groupMember.create({
    data: {
      groupId: flatGroup.id,
      userId: charlie.id,
      role: 'MEMBER',
    },
  });

  const goaGroup = await prisma.group.create({
    data: {
      name: 'Goa 2024',
      description: 'Beach trip',
      createdByUserId: alice.id,
      isTrip: true,
      tripEndDate: new Date('2024-12-31'),
    },
  });

  await prisma.groupMember.create({
    data: {
      groupId: goaGroup.id,
      userId: alice.id,
      role: 'ADMIN',
    },
  });

  await prisma.groupMember.create({
    data: {
      groupId: goaGroup.id,
      userId: bob.id,
      role: 'MEMBER',
    },
  });

  const rahulPlaceholder = await prisma.groupMember.create({
    data: {
      groupId: goaGroup.id,
      placeholderName: 'Rahul',
      placeholderPhone: '+919876543210',
      role: 'MEMBER',
    },
  });

  const equalExpense = await prisma.expense.create({
    data: {
      groupId: flatGroup.id,
      description: 'Groceries',
      totalAmountPaise: 30000,
      paidByUserId: alice.id,
      splitType: 'EQUAL',
      createdByUserId: alice.id,
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: equalExpense.id, groupMemberId: aliceMember.id, amountPaise: 10000 },
      { expenseId: equalExpense.id, groupMemberId: bobMember.id, amountPaise: 10000 },
      { expenseId: equalExpense.id, groupMemberId: charlieMember.id, amountPaise: 10000 },
    ],
  });

  const exactExpense = await prisma.expense.create({
    data: {
      groupId: flatGroup.id,
      description: 'Dinner',
      totalAmountPaise: 90000,
      paidByUserId: bob.id,
      splitType: 'EXACT',
      createdByUserId: bob.id,
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: exactExpense.id, groupMemberId: aliceMember.id, amountPaise: 40000 },
      { expenseId: exactExpense.id, groupMemberId: bobMember.id, amountPaise: 30000 },
      { expenseId: exactExpense.id, groupMemberId: charlieMember.id, amountPaise: 20000 },
    ],
  });

  const percentageExpense = await prisma.expense.create({
    data: {
      groupId: flatGroup.id,
      description: 'Utilities',
      totalAmountPaise: 100000,
      paidByUserId: charlie.id,
      splitType: 'PERCENTAGE',
      createdByUserId: charlie.id,
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: percentageExpense.id, groupMemberId: aliceMember.id, amountPaise: 40000 },
      { expenseId: percentageExpense.id, groupMemberId: bobMember.id, amountPaise: 30000 },
      { expenseId: percentageExpense.id, groupMemberId: charlieMember.id, amountPaise: 30000 },
    ],
  });

  const sharesExpense = await prisma.expense.create({
    data: {
      groupId: flatGroup.id,
      description: 'Hotel',
      totalAmountPaise: 1800000,
      paidByUserId: alice.id,
      splitType: 'SHARES',
      createdByUserId: alice.id,
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: sharesExpense.id, groupMemberId: aliceMember.id, amountPaise: 720000 },
      { expenseId: sharesExpense.id, groupMemberId: bobMember.id, amountPaise: 360000 },
      { expenseId: sharesExpense.id, groupMemberId: charlieMember.id, amountPaise: 720000 },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
