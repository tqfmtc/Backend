import express from 'express';
import { getAdminActivities, getActivityStats } from '../controllers/adminActivityController.js';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes - admin only
router.use(auth);

// @route   GET /api/admin/activities
// @desc    Get recent admin activities (last 50 by default)
// @access  Admin only
router.get('/', checkPermission('admins', 'read'), getAdminActivities);

// @route   GET /api/admin/activities/stats
// @desc    Get activity statistics
// @access  Admin only
router.get('/stats', checkPermission('admins', 'read'), getActivityStats);

export default router;