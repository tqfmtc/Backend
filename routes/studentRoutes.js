import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect, adminOnly, checkPermission } from '../middleware/auth.js';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  markAttendance,
  getStudentAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentProgress,
  changeAssignedTutor,
  getStudentByCenter,
  markDailyAttendance,
  getStudentFullReport
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

// Full report validation
const fullReportValidation = [
  body('fromMonth').notEmpty().withMessage('fromMonth is required'),
  body('toMonth').notEmpty().withMessage('toMonth is required'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('studentIds').isArray({ min: 1 }).withMessage('studentIds must be a non-empty array'),
  body('studentIds.*').isMongoId().withMessage('Each studentId must be a valid MongoDB ID')
];

router.route('/')
  .get(protect, checkPermission('students', 'read'), getStudents)
  .post(protect, checkPermission('students', 'write'), studentValidation, validateRequest, createStudent);

router.get('/getByCenter/:centerId', protect, checkPermission('students', 'read'), getStudentByCenter);

router.post('/markDailyAttendance', protect, checkPermission('students', 'write'), markDailyAttendance)

// Full report endpoint
router.post('/FullReport/students', protect, checkPermission('students', 'read'), fullReportValidation, validateRequest, getStudentFullReport);

router.route('/:id')
  .get(protect, checkPermission('students', 'read'), getStudent)
  .put(protect, checkPermission('students', 'write'), studentValidation, validateRequest, updateStudent)
  .delete(protect, checkPermission('students', 'write'), deleteStudent);

// Change assigned tutor endpoint
router.post('/change-assigned-tutor', protect, checkPermission('students', 'write'), changeAssignedTutor);

router.route('/:id/attendance')
  .post(protect, checkPermission('students', 'write'), attendanceValidation, validateRequest, markAttendance);

// Report routes
router.get('/:id/attendance-report', protect, checkPermission('students', 'read'), dateRangeValidation, validateRequest, getStudentAttendanceReport);
router.get('/reports/monthly', protect, checkPermission('students', 'read'), dateRangeValidation, validateRequest, getMonthlyAttendanceReport);
// router.get('/:id/progress', protect, getStudentProgress);

export default router;