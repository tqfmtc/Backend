import GuestRequest from '../models/GuestRequest.js';
import Tutor from '../models/Tutor.js';
import asyncHandler from 'express-async-handler';
import emailService from '../utils/emailService.js';
import jwt from 'jsonwebtoken';
import Center from '../models/Center.js';
import Attendance from '../models/Attendance.js';
import { isWithinRadius, calculateDistance } from '../utils/geoUtils.js';

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

    // Generate a single 4-digit PIN valid for the whole date range
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Build an array entry for each date in the range (same pin)
    const start = new Date(request.dateRange.startDate);
    const end = new Date(request.dateRange.endDate);
    const dayMillis = 24 * 60 * 60 * 1000;
    const pinsArr = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMillis)) {
        const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); // Midnight UTC for the specific calendar date
        pinsArr.push({ date: dateOnly, pin });
    }

    request.pins = pinsArr;
    request.status = 'approved';
    await request.save();

    // Send approval email with the PIN
    try {
        const tutor = await Tutor.findById(request.tutor);
        if (tutor && tutor.email) {
            await emailService.sendGuestApprovalEmail({
                to: tutor.email,
                tutorName: tutor.name,
                guestName: request.guest.name,
                pin,
                startDate: request.dateRange.startDate,
                endDate: request.dateRange.endDate,
            });
        }
    } catch (err) {
        console.error('Failed to send guest approval email', err);
    }

    res.status(200).json({ success: true, data: request });
});

// =====================================================
// Guest Tutor Login
// =====================================================
export const guestLogin = asyncHandler(async (req, res) => {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
        return res.status(400).json({ message: 'Phone and PIN are required' });
    }

    const today = new Date();

    // Define start and end of current day (UTC) for pin date matching
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    // Find approved request for the phone whose pin matches and today within date range
    const request = await GuestRequest.findOne({
        status: 'approved',
        'guest.phone': phone,
        pins: { $elemMatch: { date: { $gte: startOfDay, $lte: endOfDay }, pin } }
    });

    if (!request) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Fetch tutor to get center coordinates
    const tutor = await Tutor.findById(request.tutor).populate('assignedCenter', 'coordinates');
    let centerCoords = null;
    let centerId = null;
    if (tutor && tutor.assignedCenter) {
        centerCoords = tutor.assignedCenter.coordinates;
        centerId = tutor.assignedCenter._id;
    }

    const token = jwt.sign(
        { id: request._id, role: 'guest', tutorId: tutor._id },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    res.status(200).json({
        token,
        name: request.guest.name,
        tutorId: tutor._id,
        centerId,
        centerCoordinates: centerCoords,
        message: 'Login successful'
    });
});

// =====================================================
// Guest Attendance Submission
// =====================================================
export const submitGuestAttendance = asyncHandler(async (req, res) => {
    try {
        const guestRequestId = req.user._id; // set as user in auth stub
        const tutorId = req.tutorId;
        const { currentLocation } = req.body;

        if (!currentLocation || !Array.isArray(currentLocation) || currentLocation.length !== 2) {
            return res.status(400).json({ message: 'Invalid location data provided' });
        }

        const tutor = await Tutor.findById(tutorId);
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const center = await Center.findById(tutor.assignedCenter);
        if (!center) {
            return res.status(404).json({ message: 'Assigned center not found' });
        }

        const [guestLat, guestLon] = currentLocation;
        const [centerLat, centerLon] = center.coordinates;

        const withinRange = isWithinRadius(guestLat, guestLon, centerLat, centerLon, 1300);
        if (!withinRange) {
            const dist = calculateDistance(guestLat, guestLon, centerLat, centerLon);
            return res.status(400).json({ message: 'You must be within 1300 meters of the center to submit attendance', distance: dist });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if attendance already marked for today
        const existingAttendance = await Attendance.findOne({ tutor: tutor._id, date: today });
        if (existingAttendance) {
            return res.status(409).json({ message: 'Attendance already marked for today' });
        }

        // Create Attendance document
        await Attendance.create({
            tutor: tutor._id,
            center: center._id,
            date: today,
            status: 'present',
            markedBy: guestRequestId,
            location: { type: 'Point', coordinates: [guestLon, guestLat] }
        });

        // Update tutor embedded array
        const existingIndex = tutor.attendance.findIndex(r => r.date.getTime() === today.getTime());
        const attendanceRecord = {
            date: today,
            status: 'present',
            center: center._id,
            centerName: center.name,
            location: { type: 'Point', coordinates: [guestLon, guestLat] },
            markedBy: guestRequestId
        };
        if (existingIndex === -1) {
            tutor.attendance.push(attendanceRecord);
        } else {
            tutor.attendance[existingIndex] = attendanceRecord;
        }
        await tutor.save();

        res.status(200).json({ message: 'Attendance marked successfully', attendance: attendanceRecord });
    } catch (error) {
        console.error('Guest attendance error:', error);
        res.status(500).json({ message: 'Failed to mark attendance', error: error.message });
    }
});
