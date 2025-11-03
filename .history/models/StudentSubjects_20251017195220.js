import mongoose from 'mongoose';

const StudentSubjects = new mongoose.Schema({
    subjectName:{type:String, required:true},
    students:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],  
    tutors:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tutor'
    }],
    createdAt: {
        type: Date,
        default: Date.now
  }
});

const StudentSubjects = mongoose.model("StudentSubjects",Stude)