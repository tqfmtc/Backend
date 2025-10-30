import express from 'express';
import {addStudentSubject, getAllStudentSubjectRecords, deleteStudentSubjectRecord,addMarksToStudentSubject,getStudentSubjectRecord,updateStudentSubjectRecord,getSubjectsByStudent,getStudentsBySubject} from '../controllers/studentSubjectController.js';
import { auth } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
const router = express.Router();
// POST /api/student-subjects - Add a student-subject record
router.post('/',auth,createStudentSubjectRecord);
// GET /api/student-subjects - Get all student-subject records
router.get('/',auth,getAllStudentSubjectRecords);

// PUT /api/student-subjects/:studentId/:subjectId - Update a student-subject record
router.put('/:studentId/:subjectId',auth,updateStudentSubjectRecord);

// POST /api/student-subjects/:studentId/:subjectId/marks - Add marks to a student-subject record
router.post('/:studentId/:subjectId/marks',auth,addMarksToStudentSubject);

// GET /api/student-subjects/student/:studentId - Get all subjects for a student
router.get('/student/:studentId',auth,getSubjectsByStudent);

// GET /api/student-subjects/subject/:subjectId - Get all students for a subject
router.get('/subject/:subjectId',auth,getStudentsBySubject);



// DELETE /api/student-subjects/:studentId/:subjectId - Delete a student-subject record
router.delete('/:studentId/:subjectId',auth,deleteStudentSubjectRecord);
export default router;