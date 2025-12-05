import express from 'express';
import {createStudentSubjectRecord, getAllStudentSubjectRecords, deleteMarksFromStudentSubject,addMarksToStudentSubject,getStudentSubjectRecord,updateStudentSubjectRecord,getSubjectsByStudent,getStudentsBySubject} from '../controllers/studentSubjectController.js';
import { auth } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
const router = express.Router();
// POST /api/student-subjects - Add a student-subject record
router.post('/',auth,createStudentSubjectRecord);
// GET /api/student-subjects - Get all student-subject records
router.get('/',auth, getAllStudentSubjectRecords);

// POST /api/student-subjects/marks/:studentId/:subjectId - Add marks to a student-subject record
router.post('/marks/:studentId/:subjectId',auth,addMarksToStudentSubject);

// PUT /api/student-subjects/:studentId/:subjectId - Update a student-subject record
router.put('/update/:studentId/:subjectId',auth,updateStudentSubjectRecord);

// GET /api/student-subjects/student/:studentId - Get all subjects for a student
router.get('/student/:studentId',auth,getSubjectsByStudent);

// GET /api/student-subjects/subject/:subjectId - Get all students for a subject
router.get('/subject/:subjectId',auth,getStudentsBySubject);



// DELETE /api/student-subjects/delete/:markId/:subjectId - Delete a mark from student-subject record
router.delete('/delete/:markId/:subjectId',auth,deleteMarksFromStudentSubject);
export default router;
