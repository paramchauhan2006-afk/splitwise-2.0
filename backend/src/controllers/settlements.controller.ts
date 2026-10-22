import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as settlementsService from '../services/settlements.service';

const createSettlementSchema = z.object({
  fromGroupMemberId: z.string(),
  toGroupMemberId: z.string(),
  amountPaise: z.number().int().positive(),
  method: z.enum(['MANUAL', 'UPI_DEEPLINK', 'UPI_GATEWAY']),
  note: z.string().optional(),
});

export async function createSettlement(req: AuthRequest, res: Response) {
  try {
    const body = createSettlementSchema.parse(req.body);
    const settlement = await settlementsService.createSettlement(
      req.params.groupId,
      body
    );
    res.status(201).json({ success: true, data: { settlement } });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_SETTLEMENT_FAILED', message: error.message },
    });
  }
}

export async function listSettlements(req: AuthRequest, res: Response) {
  try {
    const settlements = await settlementsService.listSettlements(req.params.groupId);
    res.json({ success: true, data: { settlements } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_SETTLEMENTS_FAILED', message: error.message },
    });
  }
}
