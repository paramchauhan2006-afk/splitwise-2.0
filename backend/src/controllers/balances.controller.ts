import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as balanceEngine from '../services/balanceEngine';
import { prisma } from '../lib/prisma';

export async function getBalances(req: AuthRequest, res: Response) {
  try {
    const rawBalances = await balanceEngine.calculateNetBalances(req.params.groupId);
    const optimizedTransfers = balanceEngine.minimizeTransfers(rawBalances);

    // Collect all unique member IDs from both lists
    const allMemberIds = new Set([
      ...rawBalances.flatMap(b => [b.fromMemberId, b.toMemberId]),
      ...optimizedTransfers.flatMap(b => [b.fromMemberId, b.toMemberId]),
    ]);

    // Fetch member details in one query
    const members = await prisma.groupMember.findMany({
      where: { id: { in: Array.from(allMemberIds) } },
      include: { user: { select: { id: true, name: true, email: true, upiId: true } } },
    });
    const memberMap = new Map(members.map(m => [m.id, m]));

    // Enrich balances with member objects
    const enrich = (b: any) => ({
      fromMember: memberMap.get(b.fromMemberId),
      toMember: memberMap.get(b.toMemberId),
      amountPaise: b.amountPaise,
    });

    res.json({
      success: true,
      data: {
        rawBalances: rawBalances.map(enrich),
        optimizedTransfers: optimizedTransfers.map(enrich),
        summary: {
          totalRawTransfers: rawBalances.length,
          totalOptimizedTransfers: optimizedTransfers.length,
          savingsCount: rawBalances.length - optimizedTransfers.length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'GET_BALANCES_FAILED', message: error.message },
    });
  }
}