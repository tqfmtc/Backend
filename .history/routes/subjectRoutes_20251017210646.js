import express from 'express';
import studentSubjectController from '../controllers/studentSubjectController.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';

const router = express.Router();

// POST /api/subjects - Add a new subject (admin only)
router.post('/', auth, adminOnly, createActivityLogger('CREATE_SUBJECT', 'StudentSubject'), studentSubjectController.addSubject);
    if (phone) updateData.phone = phone;
    if (password) updateData.password = password;
    if (assignedCenters) updateData.assignedCenters = assignedCenters;
    