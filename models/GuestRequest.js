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
    // Array of daily login PINs generated upon approval
    pins: [{
        date: { type: Date, required: true },
        pin: { type: String, required: true }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('GuestRequest', GuestRequestSchema);
