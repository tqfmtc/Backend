import StudentSubjects from '../models/StudentSubjects.js';

export const addSubject = async(req,res)=>{
    try{
        const {subject,students}=req.body
        if(!subject){
            return res.status(400).json("Subject field is required")
        }

    }
}