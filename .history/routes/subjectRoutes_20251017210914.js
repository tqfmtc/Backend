import express from 'express';
import {addSubject, addStudentsToSubject, addTutorsToSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject} from '../controllers/studentSubjectController.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';

const router = express.Router();

// POST /api/subjects - Add a new subject (admin only)
router.post('/', auth, adminOnly, createActivityLogger('CREATE_SUBJECT', 'StudentSubject'), addSubject);

// POST /api/subjects/add-students - Add students to a subject (admin only)
router.post('/add-students', auth, adminOnly, createActivityLogger('ADD_STUDENTS_TO_SUBJECT', 'StudentSubject'), addStudentsToSubject);

// POST /api/subjects/add-tutors - Add tutors to a subject (admin only)
router.post('/add-tutors', auth, adminOnly, createActivityLogger('ADD_TUTORS_TO_SUBJECT', 'StudentSubject'), addTutorsToSubject);

// GET /api/subjects - Get all subjects
router.get('/', auth, getAllSubjects);

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', auth, getSubjectById);

// PUT /api/subjects/:id - Update subject (admin only)
router.put('/:id', auth, adminOnly, createActivityLogger('UPDATE_SUBJECT', 'StudentSubject'), updateSubject);

// DELETE /api/subjects/:id - Delete subject (admin only)
router.delete('/:id', auth, adminOnly, createActivityLogger('DELETE_SUBJECT', 'StudentSubject'), deleteSubject);

    