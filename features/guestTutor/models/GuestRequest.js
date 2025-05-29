import mongoose from 'mongoose';

const guestRequestSchema = new mongoose.Schema({
    tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tutor',
        required: true
    },
    guest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GuestTutor',
        required: true
    },
    dateRange: {
        start: {
            type: Date,
            required: true
        },
        end: {
            type: Date,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    },
    pins: [{
        date: {
            type: Date,
            required: true
        },
        pin: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'used', 'expired'],
            default: 'active'
        },
        usedAt: Date
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    approvedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for frequent queries
guestRequestSchema.index({ 'tutor': 1, 'dateRange.start': 1 });
guestRequestSchema.index({ 'guest': 1 });
guestRequestSchema.index({ status: 1 });
guestRequestSchema.index({ 'pins.date': 1, 'pins.status': 1 });

const GuestRequest = mongoose.model('GuestRequest', guestRequestSchema);

export default GuestRequest;
