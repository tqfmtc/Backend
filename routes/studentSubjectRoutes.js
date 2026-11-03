import express from 'express';
import {createStudentSubjectRecord, getAllStudentSubjectRecords, deleteMarksFromStudentSubject,addMarksToStudentSubject,getStudentSubjectRecord,updateStudentSubjectRecord,getSubjectsByStudent,getStudentsBySubject} from '../controllers/studentSubjectController.js';
import { auth, checkPermission } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
const router = express.Router();
// Admins need the students permission; tutors are allowed only on the routes they use,
// and the controller limits them to students in their own center. Guests/supervisors are denied.
const tutorOk = { allowTutor: true };

// POST /api/student-subjects - Add a student-subject record
router.post('/',auth,checkPermission('students','write'),createStudentSubjectRecord);
// GET /api/student-subjects - Get all student-subject records
router.get('/',auth,checkPermission('students','read'), getAllStudentSubjectRecords);

// POST /api/student-subjects/marks/:studentId/:subjectId - Add marks to a student-subject record
router.post('/marks/:studentId/:subjectId',auth,checkPermission('students','write',tutorOk),addMarksToStudentSubject);

// PUT /api/student-subjects/:studentId/:subjectId - Update a student-subject record
router.put('/update/:studentId/:subjectId',auth,checkPermission('students','write',tutorOk),updateStudentSubjectRecord);

// GET /api/student-subjects/student/:studentId - Get all subjects for a student
router.get('/student/:studentId',auth,checkPermission('students','read',tutorOk),getSubjectsByStudent);

// GET /api/student-subjects/subject/:subjectId - Get all students for a subject
router.get('/subject/:subjectId',auth,checkPermission('students','read'),getStudentsBySubject);



// DELETE /api/student-subjects/delete/:markId/:subjectId - Delete a mark from student-subject record
router.delete('/delete/:markId/:subjectId',auth,checkPermission('students','write',tutorOk),deleteMarksFromStudentSubject);
export default router;
