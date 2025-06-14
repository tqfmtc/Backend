import mongoose from 'mongoose';

const GuestRequestSchema = new mongoose.Schema({
    tutor: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tutor',
        required: true,
    },
    guest: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        qualification: { type: String, required: true },
    },
    dateRange: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('GuestRequest', GuestRequestSchema);
