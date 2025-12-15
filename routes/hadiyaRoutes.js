import express from 'express';
const router = express.Router();
import { recordHadiyaPayment, getHadiyaReport } from '../controllers/hadiyaController.js';
import { protect, adminOnly, checkPermission } from '../middleware/auth.js'; // Assuming your auth middleware

// @route   POST /api/hadiya/record
// @desc    Record a Hadiya payment for a tutor
// @access  Private/Admin
router.post('/record', protect, checkPermission('hadiya', 'write'), recordHadiyaPayment);

// @route   GET /api/hadiya/report
// @desc    Get Hadiya payment report
// @access  Private/Admin
router.get('/report', protect, checkPermission('hadiya', 'read'), getHadiyaReport);

export default router;
