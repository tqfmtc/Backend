import GuestTutor from '../models/GuestTutor.js';
import GuestRequest from '../models/GuestRequest.js';
import emailService from './emailService.js';

class GuestTutorService {
    // Generate a unique 4-digit PIN
    generatePin() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Create or update guest tutor
    async createOrUpdateGuestTutor(guestData) {
        const { phone } = guestData;
        
        try {
            // Try to find existing guest tutor
            let guestTutor = await GuestTutor.findOne({ phone });
            
            if (guestTutor) {
                // Update existing guest tutor
                guestTutor.name = guestData.name;
                guestTutor.qualification = guestData.qualification;
                await guestTutor.save();
                return guestTutor;
            }

            // Create new guest tutor
            guestTutor = new GuestTutor(guestData);
            await guestTutor.save();
            return guestTutor;
        } catch (error) {
            throw new Error(`Error creating/updating guest tutor: ${error.message}`);
        }
    }

    // Create a new guest request
    async createGuestRequest(tutorId, guestId, dateRange) {
        try {
            // Generate PINs for each day in the date range
            const pins = [];
            const currentDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            while (currentDate <= endDate) {
                pins.push({
                    date: new Date(currentDate),
                    pin: this.generatePin(),
                    status: 'active'
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const request = new GuestRequest({
                tutor: tutorId,
                guest: guestId,
                dateRange,
                pins
            });

            await request.save();
            return request;
        } catch (error) {
            throw new Error(`Error creating guest request: ${error.message}`);
        }
    }

    // Get all requests for a tutor
    async getTutorRequests(tutorId) {
        try {
            return await GuestRequest.find({ tutor: tutorId })
                .populate('guest', 'name phone qualification')
                .sort({ 'dateRange.start': -1 });
        } catch (error) {
            throw new Error(`Error fetching tutor requests: ${error.message}`);
        }
    }

    // Get all pending requests (for admin)
    async getPendingRequests() {
        try {
            return await GuestRequest.find({ status: 'pending' })
                .populate('tutor', 'name phone center')
                .populate('guest', 'name phone qualification')
                .sort({ createdAt: 1 });
        } catch (error) {
            throw new Error(`Error fetching pending requests: ${error.message}`);
        }
    }

    // Approve a guest request
    async approveRequest(requestId, adminId) {
        try {
            const request = await GuestRequest.findById(requestId)
                .populate('tutor', 'email')
                .populate('guest');

            if (!request) {
                throw new Error('Request not found');
            }

            request.status = 'approved';
            request.approvedBy = adminId;
            request.approvedAt = new Date();
            await request.save();

            // Send email to tutor with PIN details
            await emailService.sendPinEmail(
                request.tutor.email,
                request.guest,
                request.pins
            );

            // Update guest tutor usage statistics
            const guestTutor = await GuestTutor.findById(request.guest);
            if (!guestTutor.firstUsedDate) {
                guestTutor.firstUsedDate = request.dateRange.start;
            }
            guestTutor.lastUsedDate = request.dateRange.end;
            guestTutor.totalDaysUsed += Math.ceil(
                (request.dateRange.end - request.dateRange.start) / (1000 * 60 * 60 * 24)
            ) + 1;
            await guestTutor.save();

            return request;
        } catch (error) {
            throw new Error(`Error approving request: ${error.message}`);
        }
    }

    // Verify PIN and mark attendance
    async verifyPinAndMarkAttendance(phone, pin, date) {
        try {
            const today = new Date(date);
            today.setHours(0, 0, 0, 0);

            const request = await GuestRequest.findOne({
                'pins.date': today,
                'pins.pin': pin,
                'pins.status': 'active',
                status: 'approved'
            }).populate('guest');

            if (!request || request.guest.phone !== phone) {
                throw new Error('Invalid or expired PIN');
            }

            // Find and update the specific pin for today
            const pinIndex = request.pins.findIndex(
                p => p.date.getTime() === today.getTime() && p.pin === pin
            );

            if (pinIndex === -1) {
                throw new Error('PIN not found for today');
            }

            request.pins[pinIndex].status = 'used';
            request.pins[pinIndex].usedAt = new Date();
            await request.save();

            return {
                tutorId: request.tutor,
                guestId: request.guest._id,
                date: today
            };
        } catch (error) {
            throw new Error(`Error verifying PIN: ${error.message}`);
        }
    }
}

export default new GuestTutorService();
