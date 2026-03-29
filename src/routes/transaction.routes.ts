import { Router } from 'express';
import { addTransaction, getTransactions, getSummary, getTransactionById, updateTransaction, deleteTransaction } from '../controllers/transaction.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(requireAuth);
router.post('/', upload.single('invoice'), addTransaction);
router.get('/', getTransactions);
router.get('/summary', getSummary);
router.get('/:id', getTransactionById);
router.put('/:id', upload.single('invoice'), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
