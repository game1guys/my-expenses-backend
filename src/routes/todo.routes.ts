import { Router } from 'express';
import { createTodo, deleteTodo, listTodos } from '../controllers/todo.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', listTodos);
router.post('/', createTodo);
router.delete('/:id', deleteTodo);

export default router;
