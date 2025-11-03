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
    marksPercentage: [
    {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
    createdAt:{
        type: Date,
        default: Date.now
    }
});

const StudentSubject = mongoose.model("StudentSubject",studentSubjectSchema)

export default StudentSubject
