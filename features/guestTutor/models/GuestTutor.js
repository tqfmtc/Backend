import mongoose from 'mongoose';

const guestTutorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    qualification: {
        type: String,
        required: true,
        trim: true
    },
    firstUsedDate: {
        type: Date
    },
    lastUsedDate: {
        type: Date
    },
    totalDaysUsed: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for phone number lookups
guestTutorSchema.index({ phone: 1 });

const GuestTutor = mongoose.model('GuestTutor', guestTutorSchema);

export default GuestTutor;
