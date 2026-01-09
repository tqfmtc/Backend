import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
    subjectName:{type:String, required:true},
    students:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],  
    tutors:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tutor'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
  }
});

const Subject = mongoose.model("Subject",SubjectSchema)

export default Subject