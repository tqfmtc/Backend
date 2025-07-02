import Admin from '../models/Admin.js';
import nodemailer from 'nodemailer';

export const sendContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    // Get all admin emails
    const admins = await Admin.find({}, 'email');
    const adminEmails = admins.map(a => a.email);

    // Set up Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmails,
      subject: `Contact Form: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    // Send response to frontend immediately
    res.status(200).json({ message: 'Message received and will be processed. Admins will be notified.' });

    // Proceed to send email in the background
    try {
      await transporter.sendMail(mailOptions);
      console.log('Contact form email sent to admins.');
    } catch (emailError) {
      // Log email error, but don't send another response to client as one has already been sent
      console.error('Failed to send contact form email to admins:', emailError);
    }
  } catch (error) { // Catch errors from initial setup (e.g., Admin.find)
    console.error('Failed to process contact form:', error);
    // If a response hasn't been sent yet (e.g., error before res.json), send an error response.
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to process contact form', error: error.message });
    }
  }
}; 