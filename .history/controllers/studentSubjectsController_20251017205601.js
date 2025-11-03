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
}