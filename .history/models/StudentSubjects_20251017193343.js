import mongoose from 'mongoose';

const StudentSubjects = new mongoose.Schema({
    subjectName:{type:String, required:true},
    percentageMarks:{type:Number, required:true},
    students:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }]
});