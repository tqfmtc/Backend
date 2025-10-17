import express from 'express';
import {addStudentSubject, getAllStudentSubjectRecords, removeStudentSubject,addMarksToStudentSubject,getStudentSubjectRecord} from '../controllers/studentSubjectController.js';
import { auth } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
const router = express.Router();
// POST /api/student-subjects - Add a student-subject record
router.post('/',auth,addStudentSubject);
// GET /api/student-subjects - Get all student-subject records
router.get('/',auth,getStudentSubjects);

// PUT /api/student-subjects/:studentId/:subjectId - Update a student-subject record


// DELETE /api/student-subjects/:studentId/:subjectId - Delete a student-subject record
router.delete('/:studentId/:subjectId',auth,removeStudentSubject);
export default router;