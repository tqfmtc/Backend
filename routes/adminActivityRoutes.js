import express from 'express';
import { getAdminActivities, getActivityStats } from '../controllers/adminActivityController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes - admin only
router.use(auth, adminOnly);

// @route   GET /api/admin/activities
// @desc    Get recent admin activities (last 50 by default)
// @access  Admin only
router.get('/', getAdminActivities);

// @route   GET /api/admin/activities/stats
// @desc    Get activity statistics
// @access  Admin only
router.get('/stats', getActivityStats);

export default router;