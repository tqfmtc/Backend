import mongoose from 'mongoose';

const studentSubjectSchema=new mongoose.Schema({
    student:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    },
)