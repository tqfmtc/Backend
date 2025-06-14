import GuestRequest from '../models/GuestRequest.js';
import Tutor from '../models/Tutor.js';
import asyncHandler from 'express-async-handler';

// @desc    Submit a guest tutor request
// @route   POST /api/guest/request
// @access  Private (Tutor)
export const submitGuestRequest = asyncHandler(async (req, res) => {
    const { name, phone, qualification, dateRange } = req.body;
    const tutorId = req.user.id;

    if (!name || !phone || !qualification || !dateRange || !dateRange.startDate || !dateRange.endDate) {
        res.status(400);
        throw new Error('Please provide all required fields for the guest request.');
    }

    const guestRequest = new GuestRequest({
        tutor: tutorId,
        guest: {
            name,
            phone,
            qualification,
        },
        dateRange,
    });

    const createdRequest = await guestRequest.save();

    res.status(201).json({
        success: true,
        data: createdRequest,
    });
});

// @desc    Get guest tutor requests for the logged-in tutor
// @route   GET /api/guest/my-requests
// @access  Private (Tutor)
export const getMyGuestRequests = asyncHandler(async (req, res) => {
    const requests = await GuestRequest.find({ tutor: req.user.id }).populate('guest');

    res.status(200).json({
        success: true,
        data: requests,
    });
});

// @desc    Get all pending guest tutor requests
// @route   GET /api/guest/pending
// @access  Private (Admin)
export const getPendingGuestRequests = asyncHandler(async (req, res) => {
    const requests = await GuestRequest.find({ status: 'pending' }).populate('tutor', 'name');

    res.status(200).json(requests);
});

// @desc    Approve a guest tutor request
// @route   POST /api/guest/approve/:id
// @access  Private (Admin)
export const approveGuestRequest = asyncHandler(async (req, res) => {
    const request = await GuestRequest.findById(req.params.id);

    if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
    }

    request.status = 'approved';
    await request.save();

    res.status(200).json({ success: true, data: request });
});
