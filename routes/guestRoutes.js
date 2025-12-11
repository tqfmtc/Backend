import express from 'express';
const router = express.Router();
import { protect } from '../middleware/auth.js';
import { adminOnly, tutorOnly, guestOnly, checkPermission } from '../middleware/auth.js';
import { submitGuestRequest, getMyGuestRequests, getPendingGuestRequests, getGuestRequests, approveGuestRequest, guestLogin, submitGuestAttendance } from '../controllers/guestController.js';

// @desc    Submit a guest tutor request
// @route   POST /api/guest/request
// @access  Private (Tutor)
router.post('/login', guestLogin);

router.post('/request', protect, tutorOnly, submitGuestRequest);

// @desc    Get guest tutor requests for the logged-in tutor
// @route   GET /api/guest/my-requests
// @access  Private (Tutor)
router.get('/my-requests', protect, tutorOnly, getMyGuestRequests);

// @desc    Get all pending guest tutor requests
// @route   GET /api/guest/pending
// @access  Private (Admin)
router.get('/pending', protect, checkPermission('guestTutors', 'read'), getPendingGuestRequests);

// @desc    Get guest tutor requests (all or filtered)
// @route   GET /api/guest/requests
// @access  Private (Admin)
router.get('/requests', protect, checkPermission('guestTutors', 'read'), getGuestRequests);

// @desc    Approve a guest tutor request
// @route   POST /api/guest/approve/:id
// @access  Private (Admin)
router.post('/approve/:id', protect, checkPermission('guestTutors', 'write'), approveGuestRequest);

// @desc Guest attendance submission
// @route POST /api/guest/attendance
router.post('/attendance', protect, guestOnly, submitGuestAttendance);

export default router;
