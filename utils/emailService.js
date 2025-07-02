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
export const sendHadiyaPaymentEmail = async ({ to, tutorName, month, year, amountPaid }) => {
  console.log(`Attempting to send email to: ${to} for ${tutorName}`);
  console.log('Email service config:', {
    service: 'gmail',
    user: process.env.EMAIL_USER ? 'Set' : 'Not set',
    hasPassword: process.env.EMAIL_PASS ? 'Yes' : 'No'
  });
  
  try {
    const mailOptions = {
      from: `"MTC" <${process.env.EMAIL_USER}>`,
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
              <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 10px;">Payment Details:</p>
              <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>For:</span> <span>${month} ${year}</span>
              </p>
              <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>Amount:</span> <span>₹${amountPaid.toFixed(2)}</span>
              </p>
              <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>Payment Date:</span> <span>${new Date().toLocaleDateString('en-IN')}</span>
              </p>
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
        • Amount: ₹${amountPaid.toFixed(2)}
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
    console.log('Error sending payment notification email:', {
      error: error.message,
      stack: error.stack,
      to,
      tutorName,
      month,
      year,
      amountPaid,
      time: new Date().toISOString()
    });
    throw new Error(`Failed to send payment notification email: ${error.message}`);
  }
};

/**
 * Sends an approval email with a login PIN to the requesting tutor
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.tutorName - Tutor's name
 * @param {string} options.guestName - Guest tutor name
 * @param {string} options.pin - 4-digit login pin
 * @param {Date}  options.startDate - Leave start date
 * @param {Date}  options.endDate - Leave end date
 */
// Helper to format a date in IST so that day/month isn't shifted when server is in UTC
const formatDateIST = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};

export const sendGuestApprovalEmail = async ({ to, tutorName, guestName, pin, startDate, endDate }) => {
  try {
    const mailOptions = {
      from: `"MTC" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Guest Tutor Request Approved',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background-color:#4CAF50;color:white;padding:20px;text-align:center;">
            <h2>Guest Tutor Request Approved</h2>
          </div>
          <div style="padding:20px;">
            <p>Dear ${tutorName},</p>
            <p>Your request for <strong>${guestName}</strong> has been approved.</p>
            <p>The login PIN for the guest tutor is:</p>
            <div style="font-size:32px;font-weight:bold;margin:20px 0;color:#4CAF50;text-align:center;">${pin}</div>
            <p>This PIN will be valid for all scheduled days between <strong>${formatDateIST(startDate)}</strong> and <strong>${formatDateIST(endDate)}</strong>.</p>
            <p>Please share this PIN with the guest tutor.</p>
            <p>Best regards,<br/>Admin</p>
          </div>
        </div>`,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending guest approval email: ', error);
  }
};

export default {
  sendHadiyaPaymentEmail,
  sendGuestApprovalEmail,
};
