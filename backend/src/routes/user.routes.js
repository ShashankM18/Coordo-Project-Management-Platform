import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware.js';
import { getMyProfile, updateProfile, uploadAvatar, getUserProfile, searchUsers } from '../controllers/user.controller.js';

const router = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.get('/me', getMyProfile);
router.patch('/me', updateProfile);
router.patch('/me/avatar', upload.single('avatar'), uploadAvatar);
router.get('/search', searchUsers);
router.get('/:id', getUserProfile);

export default router;
