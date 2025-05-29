import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendPinEmail(tutorEmail, guestDetails, pins) {
        const datesHtml = pins.map(pin => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date(pin.date).toLocaleDateString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${pin.pin}</strong></td>
            </tr>
        `).join('');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: tutorEmail,
            subject: 'Guest Tutor Request Approved',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Guest Tutor Request Approved</h2>
                    <p>Your guest tutor request has been approved by the admin.</p>
                    
                    <h3 style="color: #34495e;">Guest Tutor Details:</h3>
                    <ul>
                        <li><strong>Name:</strong> ${guestDetails.name}</li>
                        <li><strong>Phone:</strong> ${guestDetails.phone}</li>
                        <li><strong>Qualification:</strong> ${guestDetails.qualification}</li>
                    </ul>

                    <h3 style="color: #34495e;">PIN Details:</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">PIN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datesHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                        <p style="margin: 0; color: #e74c3c;"><strong>Important:</strong></p>
                        <ul style="margin-top: 10px;">
                            <li>Each PIN is valid only for its specific date</li>
                            <li>PINs expire at midnight of their assigned date</li>
                            <li>Share the PIN with your guest tutor securely</li>
                        </ul>
                    </div>

                    <p style="margin-top: 20px; color: #7f8c8d; font-size: 12px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }
}

export default new EmailService();
