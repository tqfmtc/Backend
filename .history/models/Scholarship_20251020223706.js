import mongoose from 'mongoose';

const scholarshiipSchema=new mongoose.Schema({
    student:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    },
    scholarshipType:{
        type: String,
        required: true
    },
    amount:{
        type: Number,
        required: true
    },
    awardedAt:{
        type: Date,
        default: Date.now
    }
});

const Scholarship = mongoose.model("Scholarship",scholarshiipSchema)

export default Scholarship