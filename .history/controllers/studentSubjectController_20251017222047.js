import StudentSubject from '../models/StudentSubject.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';

export const createStudentSubjectRecord = async(req,res)=>{
    try{
        const {studentId, subjectId}=req.body
        if(!studentId || !subjectId){
            return res.status(400).json("studentId and subjectId are required")
        }
        const student= await Student.findById(studentId)
        if(!student){
            return res.status(404).json("Student not found")
        }
        const subject= await Subject.findById(subjectId)
        if(!subject){
            return res.status(404).json("Subject not found")
        }
        const existingRecord= await