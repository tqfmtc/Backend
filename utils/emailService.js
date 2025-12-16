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

/**
 * Sends an attendance confirmation email to a tutor
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.tutorName - Tutor's name
 * @param {Date} options.date - Attendance date
 * @param {string} options.time - Attendance time
 * @param {string} options.centerName - Center name
 * @param {Array} options.location - [latitude, longitude] of attendance location
 * @param {string} options.address - Readable address (optional)
 */
export const sendAttendanceConfirmationEmail = async ({ 
  to, 
  tutorName, 
  date, 
  time, 
  centerName, 
  location, 
  address 
}) => {
  console.log(`Attempting to send attendance confirmation email to: ${to} for ${tutorName}`);
  
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = new Date(time).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const locationText = location ? `${location[0].toFixed(6)}, ${location[1].toFixed(6)}` : 'Not available';
    const addressText = address || 'Address not available';

    const mailOptions = {
      from: `"MTC - Attendance System" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Attendance Confirmed - ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 25px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">✅ Attendance Confirmed</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your attendance has been successfully recorded</p>
          </div>
          
          <div style="padding: 30px 25px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 25px;">Dear <strong>${tutorName}</strong>,</p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              Your attendance has been successfully marked and recorded in our system.
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #4CAF50;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">📋 Attendance Details</h3>
              
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">📅 Date:</span>
                  <span style="color: #6c757d;">${formattedDate}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">⏰ Time:</span>
                  <span style="color: #6c757d;">${formattedTime}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">🏫 Center:</span>
                  <span style="color: #6c757d;">${centerName}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="font-weight: 600; color: #495057;">📍 Location:</span>
                  <span style="color: #6c757d; font-family: monospace; font-size: 12px;">${locationText}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600; color: #495057;">🗺️ Address:</span>
                  <span style="color: #6c757d; text-align: right; max-width: 60%;">${addressText}</span>
                </div>
              </div>
            </div>
            
            <div style="background-color: #e8f5e8; border-radius: 6px; padding: 15px; margin: 20px 0; border: 1px solid #c3e6c3;">
              <p style="margin: 0; color: #2d5a2d; font-size: 14px;">
                <strong>✅ Status:</strong> Your attendance is now recorded in the system and will be reflected in your monthly reports.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              If you have any questions about your attendance or notice any discrepancies, please contact the administration immediately.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong>MTC Administration Team</strong>
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px 25px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Attendance Confirmed - ${formattedDate}
        
        Dear ${tutorName},
        
        Your attendance has been successfully marked and recorded in our system.
        
        Attendance Details:
        • Date: ${formattedDate}
        • Time: ${formattedTime}
        • Center: ${centerName}
        • Location: ${locationText}
        • Address: ${addressText}
        
        Status: Your attendance is now recorded in the system and will be reflected in your monthly reports.
        
        If you have any questions about your attendance or notice any discrepancies, please contact the administration immediately.
        
        Best regards,
        MTC Administration Team
        
        ---
        This is an automated message. Please do not reply to this email.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Attendance confirmation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.log('Error sending attendance confirmation email:', {
      error: error.message,
      stack: error.stack,
      to,
      tutorName,
      date,
      time,
      centerName,
      location,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to send attendance confirmation email: ${error.message}`);
  }
};

/**
 * Sends an admin account deletion notification email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email (deleted admin)
 * @param {string} options.deletedAdminName - Name of the deleted admin
 * @param {string} options.deletionDate - Date of deletion
 * @param {string} options.deletedByName - Name of the admin who performed the deletion
 * @param {string} options.deletedByEmail - Email of the admin who performed the deletion
 * @param {string} options.deletedByPhone - Phone of the admin who performed the deletion
 */
export const sendAdminDeletionEmail = async ({ 
  to, 
  deletedAdminName, 
  deletionDate, 
  deletedByName, 
  deletedByEmail, 
  deletedByPhone 
}) => {
  console.log(`Sending admin deletion notification to: ${to}`);
  
  try {
    const mailOptions = {
      from: `"MTC" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Admin Account Deletion Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h2>Admin Account Deleted</h2>
          </div>
          <div style="padding: 20px;">
            <p>Dear ${deletedAdminName},</p>
            <p>This is to inform you that your admin account has been deleted from the MTC system.</p>
            
            <div style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid #dc3545;">
              <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 10px;">Deletion Details:</p>
              <p style="margin: 8px 0;">
                <strong>Date of Deletion:</strong> ${deletionDate}
              </p>
              <p style="margin: 8px 0;">
                <strong>Deleted By:</strong> ${deletedByName}
              </p>
              <p style="margin: 8px 0;">
                <strong>Email:</strong> ${deletedByEmail}
              </p>
              <p style="margin: 8px 0;">
                <strong>Phone:</strong> ${deletedByPhone}
              </p>
            </div>
            
            <p>You no longer have access to the MTC admin system. If you believe this deletion was made in error, please contact the administrator listed above.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>MTC Administration Team</p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin deletion notification email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.log('Error sending admin deletion email:', {
      error: error.message,
      stack: error.stack,
      to,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to send admin deletion email: ${error.message}`);
  }
};

export default {
  sendHadiyaPaymentEmail,
  sendGuestApprovalEmail,
  sendAttendanceConfirmationEmail,
  sendAdminDeletionEmail,
};
