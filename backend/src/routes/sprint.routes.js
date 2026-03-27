import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createSprint, deleteSprint, listSprints, updateSprint } from '../controllers/sprint.controller.js';

const router = Router();
router.use(protect);

router.get('/', listSprints);
router.post('/', createSprint);
router.patch('/:id', updateSprint);
router.delete('/:id', deleteSprint);

export default router;
