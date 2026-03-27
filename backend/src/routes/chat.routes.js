import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createChannel, getChannels, getMessages, sendMessage } from '../controllers/chat.controller.js';

const router = Router();
router.use(protect);

router.post('/channel', createChannel);
router.get('/channel/:workspaceId', getChannels);
router.post('/message', sendMessage);
router.get('/messages', getMessages);

export default router;
