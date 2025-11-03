import mongoose from 'mongoose';

const studentSubjectSchema=new mongoose.Schema({
    student:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    },
    subject:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});
)