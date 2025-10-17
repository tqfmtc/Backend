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