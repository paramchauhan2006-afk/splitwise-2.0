import { Router } from 'express';
import * as balancesController from '../controllers/balances.controller';

const router = Router({ mergeParams: true });

router.get('/', balancesController.getBalances);

export default router;
