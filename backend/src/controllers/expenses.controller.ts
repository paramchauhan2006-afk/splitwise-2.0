import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as expensesService from '../services/expenses.service';

const createExpenseSchema = z.object({
  description: z.string().min(1),
  totalAmountPaise: z.number().int().positive(),
  paidByMemberId: z.string(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  date: z.string().optional(),
  notes: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  splits: z.array(z.any()).optional(),
});

export async function createExpense(req: AuthRequest, res: Response) {
  try {
    const body = createExpenseSchema.parse(req.body);
    const result = await expensesService.createExpense(
      req.params.groupId,
      req.userId!,
      {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
      }
    );
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_EXPENSE_FAILED', message: error.message },
    });
  }
}

export async function listExpenses(req: AuthRequest, res: Response) {
  try {
    const expenses = await expensesService.listExpenses(req.params.groupId);
    res.json({ success: true, data: { expenses } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_EXPENSES_FAILED', message: error.message },
    });
  }
}

export async function getExpense(req: AuthRequest, res: Response) {
  try {
    const expense = await expensesService.getExpense(req.params.expenseId);
    res.json({ success: true, data: { expense } });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: { code: 'GET_EXPENSE_FAILED', message: error.message },
    });
  }
}
