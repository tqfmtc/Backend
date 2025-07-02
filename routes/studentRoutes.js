import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  markAttendance,
  getStudentAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentProgress
} from '../controllers/studentController.js';

const router = express.Router();

// Student validation rules
const studentValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('fatherName').notEmpty().withMessage('Father\'s name is required'),
  body('contact').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
  body('medium').isIn(['English', 'Hindi', 'Urdu']).withMessage('Invalid medium'),
  body('aadharNumber').matches(/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/).withMessage('Invalid Aadhar number format'),
  body('assignedCenter').isMongoId().withMessage('Invalid center ID'),
  body('assignedTutor').optional().isMongoId().withMessage('Invalid tutor ID')
];

// Attendance validation rules
const attendanceValidation = [
  body('month').notEmpty().withMessage('Month is required'),
  body('presentDays').isInt({ min: 0 }).withMessage('Present days must be a positive number'),
  body('totalDays').isInt({ min: 0 }).withMessage('Total days must be a positive number')
];

// Report date range validation
const dateRangeValidation = [
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date')
];

router.route('/')
  .get(protect, getStudents)
  .post(protect, studentValidation, validateRequest, createStudent);

router.route('/:id')
  .get(protect, getStudent)
  .put(protect, studentValidation, validateRequest, updateStudent)
  .delete(protect, deleteStudent);

router.route('/:id/attendance')
  .post(protect, attendanceValidation, validateRequest, markAttendance);

// Report routes
router.get('/:id/attendance-report', protect, dateRangeValidation, validateRequest, getStudentAttendanceReport);
router.get('/reports/monthly', protect, dateRangeValidation, validateRequest, getMonthlyAttendanceReport);
router.get('/:id/progress', protect, getStudentProgress);

export default router;