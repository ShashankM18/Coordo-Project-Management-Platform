import { Router } from 'express';
import { body } from 'express-validator';
import {
  register, login, refresh, logout, getMe,
  forgotPassword, resetPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password needs uppercase, lowercase and number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/refresh', body('refreshToken').notEmpty(), validate, refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', body('email').isEmail(), validate, forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 8 })], validate, resetPassword);

export default router;
