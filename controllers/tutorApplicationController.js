console.log('Tutor Application Controller loaded');
import TutorApplication from '../models/TutorApplication.js';
import Admin from '../models/Admin.js';
import nodemailer from 'nodemailer';

// POST /api/tutor-applications
export const createTutorApplication = async (req, res) => {
  try {
    // Get all admin emails
    const admins = await Admin.find({}, 'email');
    const adminEmails = admins.map(a => a.email);

    // Set up Nodemailer transporter (example with Gmail, use env vars in production)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Prepare attachments
    const attachments = [];
    ['certificates', 'memos', 'resume'].forEach(field => {
      if (req.files && req.files[field]) {
        attachments.push({
          filename: req.files[field][0].originalname,
          content: req.files[field][0].buffer
        });
      }
    });

    // Prepare email body
    const { fullName, email, phone, qualifications } = req.body;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails,
      subject: 'New Tutor Application',
      text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nQualifications: ${qualifications}`,
      attachments
    };

    // Send response to frontend immediately
    res.status(200).json({ message: 'Application received and will be processed. Admins will be notified.' });

    // Proceed to send email in the background
    try {
      await transporter.sendMail(mailOptions);
      console.log('Tutor application email sent to admins.');
    } catch (emailError) {
      // Log email error, but don't send another response to client as one has already been sent
      console.error('Failed to send tutor application email to admins:', emailError);
    }
  } catch (error) { // Catch errors from initial setup (e.g., Admin.find)
    console.error('Failed to process tutor application:', error);
    // If a response hasn't been sent yet (e.g., error before res.json), send an error response.
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to process application', error: error.message });
    }
  }
};

// GET /api/tutor-applications
export const getTutorApplications = async (req, res) => {
  try {
    const applications = await TutorApplication.find().sort({ createdAt: -1 }).limit(10);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 