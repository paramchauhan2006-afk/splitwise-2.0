import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as groupsService from '../services/groups.service';

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isTrip: z.boolean().optional(),
  tripEndDate: z.string().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tripEndDate: z.string().optional(),
});

export async function createGroup(req: AuthRequest, res: Response) {
  try {
    const body = createGroupSchema.parse(req.body);
    const group = await groupsService.createGroup(req.userId!, {
      ...body,
      tripEndDate: body.tripEndDate ? new Date(body.tripEndDate) : undefined,
    });
    res.status(201).json({ success: true, data: { group } });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_GROUP_FAILED', message: error.message },
    });
  }
}

export async function listGroups(req: AuthRequest, res: Response) {
  try {
    const groups = await groupsService.listGroups(req.userId!);
    res.json({ success: true, data: { groups } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_GROUPS_FAILED', message: error.message },
    });
  }
}

export async function getGroup(req: AuthRequest, res: Response) {
  try {
    const group = await groupsService.getGroup(req.params.groupId, req.userId!);
    res.json({ success: true, data: { group } });
  } catch (error: any) {
    res.status(403).json({
      success: false,
      error: { code: 'GET_GROUP_FAILED', message: error.message },
    });
  }
}

export async function updateGroup(req: AuthRequest, res: Response) {
  try {
    const body = updateGroupSchema.parse(req.body);
    const group = await groupsService.updateGroup(req.params.groupId, req.userId!, {
      ...body,
      tripEndDate: body.tripEndDate ? new Date(body.tripEndDate) : undefined,
    });
    res.json({ success: true, data: { group } });
  } catch (error: any) {
    res.status(403).json({
      success: false,
      error: { code: 'UPDATE_GROUP_FAILED', message: error.message },
    });
  }
}

export async function archiveGroup(req: AuthRequest, res: Response) {
  try {
    const group = await groupsService.archiveGroup(req.params.groupId, req.userId!);
    res.json({ success: true, data: { group } });
  } catch (error: any) {
    res.status(403).json({
      success: false,
      error: { code: 'ARCHIVE_GROUP_FAILED', message: error.message },
    });
  }
}
