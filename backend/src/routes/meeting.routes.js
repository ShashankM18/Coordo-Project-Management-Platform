import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createMeeting, getMeeting, listMeetings } from '../controllers/meeting.controller.js';

const router = Router();
router.use(protect);

router.post('/', createMeeting);
router.get('/', listMeetings);
router.get('/:id', getMeeting);

export default router;

