import mongoose from 'mongoose';

const StudentSubjects = new mongoose.Schema({
    subjectName:{type:String, required:true},
    percentageMarks: