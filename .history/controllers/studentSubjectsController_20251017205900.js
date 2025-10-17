import StudentSubjects from '../models/StudentSubjects.js';

export const addSubject = async(req,res)=>{
    try{
        const {subject}=req.body
        if(!subject){
            return res.status(400).json("Subject field is required")
        }
        const newSubject= await StudentSubjects.create({subject})
        res.status(201).json(newSubject)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

const addStudentsToSubject= async(req,res)=>{
    try{
        const {subjectId, studentIds}=req.body
        if(!subjectId || !studentIds || !Array.isArray(studentIds)){
            return res.status(400).json("subjectId and studentIds(array) are required")
        }
        const subject= await StudentSubjects.findByPk(subjectId)
        if(!subject){
            return res.status(404).json("Subject not found")
        }
        await subject.addStudents(studentIds)
        res.status(200).json("Students added to subject successfully")
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const getAllSubjects = async(req,res)=>{
    try{
        const subjects= await StudentSubjects.findAll()
        res.status(200).json(subjects)
    }
    catch(error){
        res.status(500).json({message:error.message})
    }
}

export const getSubjectById = async(req,res)=>{
    try{
        const {id}=req.params
        const subject= await StudentSubjects.findByPk(id)
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
        const existingSubject= await StudentSubjects.findByPk(id)
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
        const existingSubject= await StudentSubjects.findByPk(id)
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
