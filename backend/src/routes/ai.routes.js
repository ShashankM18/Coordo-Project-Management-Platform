import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { estimateTask, breakdownTask, nlpCreateTask, suggestAssignee, projectHealthScore, aiChat } from '../controllers/ai.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();
router.use(protect);

// Stricter rate limit for AI endpoints (cost control)
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { message: 'Too many AI requests' } });
router.use(aiLimiter);

router.post('/estimate', estimateTask);
router.post('/breakdown', breakdownTask);
router.post('/nlp-create', nlpCreateTask);
router.post('/suggest-assignee', suggestAssignee);
router.get('/health/:projectId', projectHealthScore);
router.post('/chat', aiChat);
export default router;
