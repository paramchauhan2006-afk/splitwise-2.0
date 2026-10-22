import { Router } from 'express';
import * as expensesController from '../controllers/expenses.controller';

const router = Router({ mergeParams: true });

router.post('/', expensesController.createExpense);
router.get('/', expensesController.listExpenses);
router.get('/:expenseId', expensesController.getExpense);

export default router;
