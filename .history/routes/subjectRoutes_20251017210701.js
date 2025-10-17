import express from 'express';
import studentSubjectController from '../controllers/studentSubjectController.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';

const router = express.Router();

// POST /api/subjects - Add a new subject (admin only)
router.post('/', auth, adminOnly, createActivityLogger('CREATE_SUBJECT', 'StudentSubject'), studentSubjectController.addSubject);

// POST /api/subjects/add-students - Add students to a subject (admin only)
router.post('/add-students', auth, adminOnly, createActivityLogger('ADD_STUDENTS_TO_SUBJECT', 'StudentSubject'), studentSubjectController.addStudentsToSubject);