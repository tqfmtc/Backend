import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import {adminOnly, auth} from '../middleware/auth.js';
import {
  adminLogin,
  tutorLogin,
  registerAdmin,
  forceResetTutorPassword,
  supervisorLogin,
  registerSupervisor
} from '../controllers/authController.js';

const router = express.Router();

// Admin login validation
const adminLoginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const supervisorLoginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Tutor login validation
const tutorLoginValidation = [
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').notEmpty().withMessage('Password is required')
];

// Admin registration validation
const adminRegisterValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const supervisorRegisterValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('assignedCenters').isArray().withMessage('Assigned centers must be an array')
];

router.post('/admin/login', adminLoginValidation, validateRequest, adminLogin);
router.post('/admin/register',auth,adminOnly, adminRegisterValidation, validateRequest, registerAdmin);
router.post('/tutor/login', tutorLoginValidation, validateRequest, tutorLogin);
router.post('/supervisor/login', supervisorLoginValidation,validateRequest, supervisorLogin)
router.post('/supervisor/register',auth,adminOnly,supervisorRegisterValidation,validateRequest, registerSupervisor)

// Fast password reset endpoint for debugging
router.post('/force-reset-tutor-password', forceResetTutorPassword);

export default router;