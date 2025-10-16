import express from 'express';
import { markAttendance, getAttendanceReport, getRecentAttendance, clearRecentAttendance, todayAttendance,toggleAttendanceButton,buttonStatus } from '../controllers/attendanceController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes with authentication
router.use(auth);

//Disable/Enable attendance button
router.post('/buttonToggle',adminOnly,toggleAttendanceButton)

//get button status
router.get('/buttonStatus',buttonStatus)

// Mark attendance
router.post('/mark', adminOnly, markAttendance);

// Get recent attendance (accessible to both tutors and admins)
router.get('/recent', getRecentAttendance);

// Get attendance report
router.get('/report', adminOnly, getAttendanceReport);

// Get recent attendance
router.get('/recent', getRecentAttendance);

//today,s attendance only
router.get('/today',todayAttendance)

// Clear recent attendance (admin only)
router.post('/clear-recent', adminOnly, clearRecentAttendance);

export default router; 
