import { Router } from 'express';
import * as membersController from '../controllers/members.controller';

const router = Router({ mergeParams: true });

router.post('/', membersController.addMember);
router.delete('/:memberId', membersController.removeMember);

export default router;
