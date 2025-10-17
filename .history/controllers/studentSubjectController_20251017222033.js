import StudentSubject from '../models/StudentSubject.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';

export const createStudentSubjectRecord = async(req,res)=>{
    try{
        const {studentId, subjectId}=req.body
        