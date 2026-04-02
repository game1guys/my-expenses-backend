import { Router } from 'express';
import { createTodo, deleteTodo, listTodos, updateTodoStatus } from '../controllers/todo.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/', listTodos);
router.post('/', createTodo);
router.delete('/:id', deleteTodo);
router.patch('/:id/status', updateTodoStatus);

export default router;
