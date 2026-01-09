import express from 'express';
import { markAttendance, getAttendanceReport, getRecentAttendance, clearRecentAttendance, todayAttendance,getTutorMonthlyCoordinates,getTutorCoordinatesRange,toggleAttendanceButton,buttonStatus } from '../controllers/attendanceController.js';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

//Disable/Enable attendance button
router.post('/buttonToggle', checkPermission('tutorAttendance', 'write'), toggleAttendanceButton)

//get button status
router.get('/buttonStatus', checkPermission('tutorAttendance', 'read'), buttonStatus)

// Mark attendance
router.post('/mark', checkPermission('tutorAttendance', 'write'), markAttendance);

// Get recent attendance (accessible to both tutors and admins)
router.get('/recent', checkPermission('tutorAttendance', 'read'), getRecentAttendance);

// Get attendance report
router.get('/report', adminOnly, getAttendanceReport);

// Get tutor monthly coordinates (admin only)
router.get('/tutor-coordinates', adminOnly, getTutorMonthlyCoordinates);

// Get tutor coordinates across date range (admin only)
router.post('/tutor-coordinates-range', adminOnly, getTutorCoordinatesRange);

// Get recent attendance
router.get('/recent', getRecentAttendance);

//today,s attendance only
router.get('/today',todayAttendance)

// Clear recent attendance (admin only)
router.post('/clear-recent', adminOnly, clearRecentAttendance);

export default router; 