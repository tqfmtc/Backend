import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';

export const addSubject = async(req,res)=>{
    try{
        const {subject}=req.body
        if(!subject){
            return res.status(400).json("Subject field is required")
        }
        const newSubject= await Subject.create({subject})
        res.status(201).json(newSubject)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const addStudentsToSubject= async(req,res)=>{
    try{
        const {subjectId, studentIds}=req.body
        if(!subjectId || !studentIds || !Array.isArray(studentIds)){
            return res.status(400).json("subjectId and studentIds(array) are required")
        }
        const subject= await Subject.findByPk(subjectId)
        if(!subject){
            return res.status(404).json("Subject not found")
        }
        for (const i of studentIds) {
            const student = await Student.findByPk(i);
            if (!student) {
                return res.status(404).json(`Student with ID ${i} not found`);
            }
        }
        await subject.addStudents(studentIds)
        res.status(200).json("Students added to subject successfully")
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const addTutorsToSubject= async(req,res)=>{
    try{
        const {subjectId, tutorIds}=req.body
        if(!subjectId || !tutorIds || !Array.isArray(tutorIds)){
            return res.status(400).json("subjectId and tutorIds(array) are required")
        }
        const subject= await Subject.findByPk(subjectId)
        if(!subject){
            return res.status(404).json("Subject not found")
        }
        for (const i of tutorIds) {
            const tutor = await Tutor.findByPk(i);
            if (!tutor) {
                return res.status(404).json(`Tutor with ID ${i} not found`);
            }
        }
        await subject.addTutors(tutorIds)
        res.status(200).json("Tutors added to subject successfully")
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const getAllSubjects = async(req,res)=>{
    try{
        const subjects= await Subject.findAll()
        res.status(200).json(subjects)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const getSubjectById = async(req,res)=>{
    try{
        const {id}=req.params
        const subject= await Subject.findByPk(id)
        if(!subject){
            return res.status(404).json("Subject not found")
        }
        res.status(200).json(subject)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const updateSubject = async(req,res)=>{
    try{
        const {id}=req.params
        const {subject}=req.body
        const existingSubject= await Subject.findByPk(id)
        if(!existingSubject){
            return res.status(404).json("Subject not found")
        }
        existingSubject.subject=subject || existingSubject.subject
        await existingSubject.save()
        res.status(200).json(existingSubject)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}
export const deleteSubject = async(req,res)=>{
    try{
        const {id}=req.params
        const existingSubject= await Subjects.findByPk(id)
        if(!existingSubject){
            return res.status(404).json("Subject not found")
        }
        await existingSubject.destroy()
        res.status(200).json("Subject deleted successfully")
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}
