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
        const existingRecord= await StudentSubject.findOne({student:studentId, subject:subjectId})
        if(existingRecord){
            return res.status(400).json("Record for this student and subject already exists")
        }
        const newRecord= await StudentSubject.create({student:studentId, subject:subjectId})
        res.status(201).json(newRecord)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const addMarksToStudentSubject = async(req,res)=>{
    try{
        const {studentId, subjectId, marksPercentage}=req.body
        if(!studentId || !subjectId || marksPercentage===undefined){
            return res.status(400).json("studentId, subjectId and marksPercentage are required")
        }
        