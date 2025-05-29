import guestTutorService from '../services/guestTutorService.js';
import { validateGuestTutor } from '../validation/guestValidation.js';

class GuestTutorController {
    // Request a guest tutor
    async requestGuestTutor(req, res) {
        try {
            const { guestDetails, dateRange } = req.body;
            const tutorId = req.user._id; // From auth middleware

            // Validate guest details
            const { error } = validateGuestTutor(guestDetails);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Create or update guest tutor
            const guestTutor = await guestTutorService.createOrUpdateGuestTutor(guestDetails);

            // Create guest request
            const request = await guestTutorService.createGuestRequest(
                tutorId,
                guestTutor._id,
                dateRange
            );

            res.status(201).json({
                message: 'Guest tutor request created successfully',
                request
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get tutor's guest requests
    async getTutorRequests(req, res) {
        try {
            const tutorId = req.user._id;
            const requests = await guestTutorService.getTutorRequests(tutorId);
            res.json(requests);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get all pending requests (admin only)
    async getPendingRequests(req, res) {
        try {
            const requests = await guestTutorService.getPendingRequests();
            res.json(requests);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Approve guest request (admin only)
    async approveRequest(req, res) {
        try {
            const { requestId } = req.params;
            const adminId = req.user._id;

            const request = await guestTutorService.approveRequest(requestId, adminId);
            res.json({
                message: 'Request approved successfully',
                request
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Guest tutor login
    async guestLogin(req, res) {
        try {
            const { phone, pin, date } = req.body;

            const result = await guestTutorService.verifyPinAndMarkAttendance(
                phone,
                pin,
                date
            );

            res.json({
                message: 'Login successful',
                ...result
            });
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    }
}

export default new GuestTutorController();
