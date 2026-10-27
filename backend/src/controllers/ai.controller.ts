import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { parseExpenseFromText } from '../services/aiService';
import { prisma } from '../lib/prisma';

const parseExpenseSchema = z.object({
  text: z.string().min(1),
  groupId: z.string().min(1),
});

export async function parseExpense(req: AuthRequest, res: Response) {
  try {
    const body = parseExpenseSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: body.groupId,
        userId: req.userId!,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_MEMBER', message: 'Not a member of this group' },
      });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: body.groupId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const groupMembers = members.map((m) => ({
      id: m.id,
      displayName: m.user?.name ?? m.placeholderName ?? 'Unknown',
    }));

    const parsedExpense = await parseExpenseFromText(body.text, groupMembers);

    let warning = 'AI-generated data. Please review before saving.';
    if (parsedExpense.confidence < 0.7) {
      warning += ' Low confidence Ã¢â‚¬â€ please check all fields carefully.';
    }

    res.json({
      success: true,
      data: {
        parsedExpense,
        warning,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing text or groupId' },
      });
    }

    console.error('Parse expense error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PARSE_FAILED', message: 'Failed to parse expense' },
    });
  }
}
