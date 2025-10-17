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