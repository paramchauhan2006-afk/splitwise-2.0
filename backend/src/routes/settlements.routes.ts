import { Router } from 'express';
import * as settlementsController from '../controllers/settlements.controller';

const router = Router({ mergeParams: true });

router.post('/', settlementsController.createSettlement);
router.get('/', settlementsController.listSettlements);

export default router;
