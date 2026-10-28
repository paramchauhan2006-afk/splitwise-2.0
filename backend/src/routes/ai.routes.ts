import { Router } from 'express';
import multer from 'multer';
import * as aiController from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.use(authMiddleware);

router.post('/parse-expense', aiController.parseExpense);
router.post('/scan-bill', upload.single('image'), aiController.scanBill);

export default router;
