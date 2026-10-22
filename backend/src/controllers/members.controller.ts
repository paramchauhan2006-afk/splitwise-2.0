import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as membersService from '../services/members.service';

const addMemberSchema = z.object({
  email: z.string().email().optional(),
  placeholderName: z.string().optional(),
  placeholderPhone: z.string().optional(),
  placeholderEmail: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

export async function addMember(req: AuthRequest, res: Response) {
  try {
    const body = addMemberSchema.parse(req.body);
    const member = await membersService.addMember(
      req.params.groupId,
      req.userId!,
      body
    );
    res.status(201).json({ success: true, data: { member } });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ADD_MEMBER_FAILED', message: error.message },
    });
  }
}

export async function removeMember(req: AuthRequest, res: Response) {
  try {
    await membersService.removeMember(
      req.params.groupId,
      req.params.memberId,
      req.userId!
    );
    res.json({ success: true, data: { message: 'Member removed' } });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REMOVE_MEMBER_FAILED', message: error.message },
    });
  }
}
