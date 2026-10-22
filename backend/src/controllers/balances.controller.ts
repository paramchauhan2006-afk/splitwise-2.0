import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as balanceEngine from '../services/balanceEngine';

export async function getBalances(req: AuthRequest, res: Response) {
  try {
    const rawBalances = await balanceEngine.calculateNetBalances(req.params.groupId);
    const optimizedTransfers = balanceEngine.minimizeTransfers(rawBalances);
    
    res.json({
      success: true,
      data: {
        rawBalances,
        optimizedTransfers,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'GET_BALANCES_FAILED', message: error.message },
    });
  }
}
