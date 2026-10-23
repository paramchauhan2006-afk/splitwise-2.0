import { Router } from 'express';
import * as groupsController from '../controllers/groups.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', groupsController.createGroup);
router.get('/', groupsController.listGroups);
router.get('/:groupId', groupsController.getGroup);
router.get('/:groupId/summary', groupsController.getTripSummary);
router.patch('/:groupId', groupsController.updateGroup);
router.delete('/:groupId', groupsController.archiveGroup);

export default router;
