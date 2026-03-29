import { Router } from 'express';
import { getParties, createParty, addUdharTransaction, updateParty, deleteParty, triggerManualReminder } from '../controllers/party.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getParties);
router.post('/', createParty);
router.put('/:id', updateParty);
router.delete('/:id', deleteParty);
router.post('/udhar-transaction', addUdharTransaction);
router.post('/trigger-reminder', triggerManualReminder);

export default router;
