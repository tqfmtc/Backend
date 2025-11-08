import express from 'express';
import upload from '../multer.js';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
import {
  getTutors,
  getTutor,
  createTutor,
  updateTutor,
  deleteTutor,
  getTutorAttendanceReport,
  getTutorPerformanceReport,
  getTutorStudentsReport,
  submitAttendance,
  getCenterLocation,
  getTutorCenter
} from '../controllers/tutorController.js';
import { uploadTutorDocuments } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Multer fields config for tutor docs
const tutorUploadFields = [
  { name: 'aadharPhoto', maxCount: 1 },
  { name: 'passbookPhoto', maxCount: 1 },
  { name: 'certificates', maxCount: 10 },
  { name: 'memos', maxCount: 10 },
  { name: 'resume', maxCount: 1 }
];

// Tutor validation rules
const tutorValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('assignedCenter').isMongoId().withMessage('Invalid center ID'),
  // Custom validation for subjects that handles both string and array
  body('subjects').custom((value) => {
    // Allow either a string (single subject) or array (multiple subjects)
    if (Array.isArray(value) && value.length > 0) {
      return true; // Valid array
    } 
    if (typeof value === 'string' && value.trim() !== '') {
      // Convert single string to array before it reaches controller
      return true; // Valid string subject
    }
    throw new Error('At least one subject is required');
  }),
  body('sessionType').isIn(['arabic', 'tuition']).withMessage('Invalid session type'),
  body('sessionTiming')
    .isIn(['after_fajr', 'after_zohar', 'after_asar', 'after_maghrib', 'after_isha'])
    .withMessage('Invalid session timing'),
  // Educational fields - optional
  body('qualifications').optional(),
  body('qualificationType').optional().isIn(['graduation', 'intermediate', 'ssc', 'alim', 'hafiz', 'others']).withMessage('Invalid qualification type'),
  body('qualificationOther').optional().isLength({ max: 50 }).withMessage('Qualification details cannot exceed 50 characters'),
  body('qualificationStatus').optional().isIn(['pursuing', 'completed']).withMessage('Invalid qualification status'),
  body('yearOfCompletion').optional().isLength({ min: 4, max: 4 }).withMessage('Year must be 4 digits'),
  body('madarsahName').optional().isLength({ max: 50 }).withMessage('Madarsah name cannot exceed 50 characters'),
  // Bank and identification fields - optional
  body('assignedHadiyaAmount').optional().isNumeric().withMessage('Hadiya amount must be a number'),
  body('bankName').optional().isLength({ max: 30 }).withMessage('Bank name cannot exceed 30 characters'),
  body('bankBranch').optional().isLength({ max: 30 }).withMessage('Bank branch cannot exceed 30 characters'),
  body('accountNumber').optional().isLength({ min: 5, max: 20 }).withMessage('Account number must be between 5-20 digits'),
  body('ifscCode').optional().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format'),
  body('aadharNumber').optional().matches(/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/).withMessage('Invalid Aadhar number format'),
  body('documents.aadharNumber').optional(),
  body('documents.aadharPhoto').optional(),
  body('documents.bankAccount.accountNumber').optional(),
  body('documents.bankAccount.ifscCode').optional(),
  body('documents.bankAccount.passbookPhoto').optional(),
  body('documents.certificates').optional(),
  body('documents.memos').optional(),
  body('documents.resume').optional()
];

// Update validation - similar to create but all fields optional
const updateValidation = [
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('qualifications').optional().notEmpty().withMessage('Qualifications cannot be empty'),
  body('assignedCenter').optional().isMongoId().withMessage('Invalid center ID'),
  // Custom validation for subjects that handles both string and array
  body('subjects').optional().custom((value) => {
    // Skip validation if value is undefined or null
    if (value === undefined || value === null) {
      return true;
    }
    // Allow either a string (single subject) or array (multiple subjects)
    if (Array.isArray(value) && value.length > 0) {
      return true; // Valid array
    } 
    if (typeof value === 'string' && value.trim() !== '') {
      // Convert single string to array before it reaches controller
      return true; // Valid string subject
    }
    throw new Error('If subjects are provided, at least one is required');
  }),
  body('sessionType').optional().isIn(['arabic', 'tuition']).withMessage('Invalid session type'),
  body('sessionTiming').optional()
    .isIn(['after_fajr', 'after_zohar', 'after_asar', 'after_maghrib', 'after_isha'])
    .withMessage('Invalid session timing'),
  // Educational fields for update - optional
  body('qualificationType').optional().isIn(['graduation', 'intermediate', 'ssc', 'alim', 'hafiz', 'others']).withMessage('Invalid qualification type'),
  body('qualificationOther').optional().isLength({ max: 50 }).withMessage('Qualification details cannot exceed 50 characters'),
  body('qualificationStatus').optional().isIn(['pursuing', 'completed']).withMessage('Invalid qualification status'),
  body('yearOfCompletion').optional().isLength({ min: 4, max: 4 }).withMessage('Year must be 4 digits'),
  body('madarsahName').optional().isLength({ max: 50 }).withMessage('Madarsah name cannot exceed 50 characters'),
  // Bank and identification fields for update - optional
  body('assignedHadiyaAmount').optional().isNumeric().withMessage('Hadiya amount must be a number'),
  body('bankName').optional().isLength({ max: 30 }).withMessage('Bank name cannot exceed 30 characters'),
  body('bankBranch').optional().isLength({ max: 30 }).withMessage('Bank branch cannot exceed 30 characters'),
  body('accountNumber').optional().isLength({ min: 5, max: 20 }).withMessage('Account number must be between 5-20 digits'),
  body('ifscCode').optional().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format'),
  body('aadharNumber').optional().matches(/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/).withMessage('Invalid Aadhar number format'),
  body('documents.aadharNumber').optional()
    .matches(/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/)
    .withMessage('Please enter a valid Aadhar number in format: XXXX XXXX XXXX'),
  body('documents.bankAccount.accountNumber').optional()
    .notEmpty()
    .withMessage('Bank account number cannot be empty'),
  body('documents.bankAccount.ifscCode').optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Please enter a valid IFSC code'),
  body('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status')
];

// Protect all routes
router.use(protect);

// Routes that require admin access
router.route('/')
  .get(getTutors)
  .post(adminOnly, createActivityLogger('CREATE_TUTOR', 'Tutor'), upload.fields(tutorUploadFields), tutorValidation, validateRequest, createTutor);

router.route('/:id')
  .get(getTutor)
  .put(adminOnly, createActivityLogger('UPDATE_TUTOR', 'Tutor'), upload.fields(tutorUploadFields), updateValidation, validateRequest, updateTutor)
  .delete(adminOnly, createActivityLogger('DELETE_TUTOR', 'Tutor'), deleteTutor);

// Report routes
router.get('/:id/attendance', getTutorAttendanceReport);
router.get('/:id/performance', getTutorPerformanceReport);
router.get('/:id/students', getTutorStudentsReport);

// Attendance submission route
router.post('/attendance', [
  body('currentLocation').isArray().withMessage('Current location must be an array of [longitude, latitude]'),
  body('currentLocation.*').isNumeric().withMessage('Location coordinates must be numbers'),
  validateRequest
], submitAttendance);

// Get center location route
router.post('/get-center-location', [
  body('tutorId').isMongoId().withMessage('Invalid tutor ID'),
  validateRequest
], getCenterLocation);

// Get logged-in tutor's center information
router.get('/my-center', getTutorCenter);

// Middleware to ensure subjects is always an array
const ensureSubjectsArray = (req, res, next) => {
  if (req.body.subjects) {
    // Convert subjects to array if it's not already
    req.body.subjects = Array.isArray(req.body.subjects) 
      ? req.body.subjects 
      : [req.body.subjects];
    
    console.log('Processed subjects:', req.body.subjects);
  }
  next();
};

// Create tutor with file uploads
router.post('/', adminOnly, 
  upload.fields(tutorUploadFields),
  // First convert subjects to array BEFORE validation runs
  ensureSubjectsArray,
  // Then run the validation
  tutorValidation,
  validateRequest,
  createTutor
);

// Email queue monitoring (Admin only)
router.get('/email-queue-status', adminOnly, async (req, res) => {
  try {
    const { getEmailQueueStatus } = await import('../utils/emailQueue.js');
    const status = getEmailQueueStatus();
    
    res.json({
      success: true,
      emailQueue: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Email queue status error:', error);
    res.status(500).json({ 
      message: 'Failed to get email queue status', 
      error: error.message 
    });
  }
});

// Clear failed email jobs (Admin only)
router.post('/clear-failed-emails', adminOnly, async (req, res) => {
  try {
    const { clearFailedEmails } = await import('../utils/emailQueue.js');
    const clearedCount = clearFailedEmails();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} failed email jobs`,
      clearedCount
    });
  } catch (error) {
    console.error('Clear failed emails error:', error);
    res.status(500).json({ 
      message: 'Failed to clear failed emails', 
      error: error.message 
    });
  }
});

// Test email functionality (for development/testing purposes)
router.post('/test-attendance-email', adminOnly, [
  body('tutorId').isMongoId().withMessage('Invalid tutor ID'),
  validateRequest
], async (req, res) => {
  try {
    const { queueAttendanceEmail } = await import('../utils/emailQueue.js');
    const Tutor = (await import('../models/Tutor.js')).default;
    const tutor = await Tutor.findById(req.body.tutorId).populate('assignedCenter', 'name location');
    
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }
    
    if (!tutor.email) {
      return res.status(400).json({ message: 'Tutor email not available' });
    }
    
    const currentTime = new Date();
    const emailJobId = queueAttendanceEmail({
      to: tutor.email,
      tutorName: tutor.name,
      date: currentTime,
      time: currentTime,
      centerName: tutor.assignedCenter?.name || 'Test Center',
      location: [28.6139, 77.2090], // Sample Delhi coordinates
      address: tutor.assignedCenter?.location || 'Test Address, Delhi'
    });
    
    res.json({ 
      message: 'Test attendance confirmation email queued successfully',
      emailJobId,
      sentTo: tutor.email 
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      message: 'Failed to queue test email', 
      error: error.message 
    });
  }
});

export default router;