import express from 'express';
import {addSubject, addStudentsToSubject,createStudentSubjectRecord,removeStudentFromSubject, addTutorsToSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject, toggleSubjectStatus, getByCenter} from '../controllers/subjectController.js';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';

const router = express.Router();

// POST /api/subjects - Add a new subject (admin only)
router.post('/', auth, checkPermission('subjects', 'write'), createActivityLogger('CREATE_SUBJECT', 'StudentSubject'), addSubject);

// DELETE /api/subject/remove-students/:id - Delete students from subject
router.delete('/remove-students/:id', auth, checkPermission('subjects', 'write'), removeStudentFromSubject); 

// POST /api/subjects/add-students - Add students to a subject (admin only)
router.post('/add-students', auth, checkPermission('subjects', 'write'), addStudentsToSubject,createStudentSubjectRecord);

// POST /api/subjects/add-tutors - Add tutors to a subject (admin only)
router.post('/add-tutors', auth, checkPermission('subjects', 'write'), createActivityLogger('ADD_TUTORS_TO_SUBJECT', 'StudentSubject'), addTutorsToSubject);

// GET /api/subjects - Get all subjects
router.get('/', auth, checkPermission('subjects', 'read'), getAllSubjects);

router.get('/:id/:centerId', auth, checkPermission('subjects', 'read'), getByCenter);

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', auth, checkPermission('subjects', 'read'), getSubjectById);

// PUT /api/subjects/:id - Update subject (admin only)
router.put('/:id', auth, checkPermission('subjects', 'write'), createActivityLogger('UPDATE_SUBJECT', 'StudentSubject'), updateSubject);

// PATCH /api/subjects/:id/toggle-status - Toggle subject active status (admin only)
router.patch('/:id/toggle-status', auth, checkPermission('subjects', 'write'), createActivityLogger('TOGGLE_SUBJECT_STATUS', 'Subject'), toggleSubjectStatus);

// DELETE /api/subjects/:id - Delete subject (admin only)
router.delete('/:id', auth, checkPermission('subjects', 'write'), createActivityLogger('DELETE_SUBJECT', 'StudentSubject'), deleteSubject);

export default router;