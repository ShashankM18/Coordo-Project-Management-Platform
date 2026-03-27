import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  listWikiPages,
  updateWikiPage,
} from '../controllers/wiki.controller.js';

const router = Router();
router.use(protect);

router.get('/', listWikiPages);
router.post('/', createWikiPage);
router.get('/:id', getWikiPage);
router.patch('/:id', updateWikiPage);
router.delete('/:id', deleteWikiPage);

export default router;
