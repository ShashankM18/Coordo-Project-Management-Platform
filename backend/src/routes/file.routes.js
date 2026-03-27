import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { upload, getProjectFiles, uploadFile, deleteFile } from '../controllers/file.controller.js';
const router = Router();
router.use(protect);
router.get('/', getProjectFiles);
router.post('/', upload.single('file'), uploadFile);
router.delete('/:id', deleteFile);
export default router;
