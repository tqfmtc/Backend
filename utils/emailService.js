import nodemailer from 'nodemailer';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a Hadiya payment notification email to a tutor
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.tutorName - Tutor's name
 * @param {string} options.month - Month of payment
 * @param {number} options.year - Year of payment
 */
export const sendHadiyaPaymentEmail = async ({ to, tutorName, month, year }) => {
  console.log(`Attempting to send email to: ${to} for ${tutorName}`);
  console.log('Email service config:', {
    service: 'gmail',
    user: process.env.EMAIL_USER ? 'Set' : 'Not set',
    hasPassword: process.env.EMAIL_PASS ? 'Yes' : 'No'
  });
  
  try {
    const mailOptions = {
      from: `"Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Hadiya Payment Initiated - ${month} ${year}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h2>Hadiya Payment Initiated</h2>
          </div>
          <div style="padding: 20px;">
            <p>Dear ${tutorName},</p>
            <p>We have initiated your Hadiya payment for <strong>${month} ${year}</strong>.</p>
            
            <div style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Payment Details:</strong></p>
              <p style="margin: 5px 0;">• For: ${month} ${year}</p>
              <p style="margin: 5px 0;">• Payment Date: ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            
            <p>Please allow <strong>2-8 working days</strong> for the amount to be credited to your account.</p>
            
            <p>If you don't receive the payment after 8 working days, please contact us.</p>
            
            <p>Best regards,<br>Admin</p>
          </div>
        </div>
      `,
      text: `
        Hadiya Payment Initiated - ${month} ${year}
        
        Dear ${tutorName},
        
        We have initiated your Hadiya payment for ${month} ${year}.
        
        Payment Details:
        • For: ${month} ${year}
        • Payment Date: ${new Date().toLocaleDateString('en-IN')}
        
        Please allow 2-8 working days for the amount to be credited to your account.
        
        If you don't receive the payment after 8 working days, please contact us.
        
        Best regards,
        Admin
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payment notification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment notification email:', {
      error: error.message,
      stack: error.stack,
      to,
      tutorName,
      month,
      year,
      time: new Date().toISOString()
    });
    throw new Error(`Failed to send payment notification email: ${error.message}`);
  }
};

export default {
  sendHadiyaPaymentEmail,
};
