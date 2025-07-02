import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

// Define the DEFAULT_PASSWORD
const DEFAULT_PASSWORD = '***REMOVED***';

// Function to hash password with bcrypt
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB:', mongoose.connection.host);
    
    try {
      // Get the admins collection
      const adminsCollection = mongoose.connection.db.collection('admins');
      
      // Find all admins
      const admins = await adminsCollection.find({}).toArray();
      console.log(`Found ${admins.length} admins in the database`);
      
      // Create a log directory if it doesn't exist
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const logsDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
      }
      
      // Create a log file
      const logFile = path.join(logsDir, 'admin_password_reset.log');
      const logStream = fs.createWriteStream(logFile, { flags: 'w' });
      
      logStream.write('Admin Password Reset Log\n');
      logStream.write('=======================\n\n');
      logStream.write(`Default Password: ${DEFAULT_PASSWORD}\n\n`);
      
      // Reset all admin passwords
      let successCount = 0;
      for (const admin of admins) {
        try {
          // Store the original password type
          const isBcryptHash = admin.password && 
            (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$'));
            
          // Hash the default password
          const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
          
          // Verify hash works before updating
          const verifyHash = await bcrypt.compare(DEFAULT_PASSWORD, hashedPassword);
          
          if (!verifyHash) {
            logStream.write(`WARNING: Hash verification failed for admin ${admin.name} (${admin.email})\n`);
            continue;
          }
          
          // Update the admin's password
          await adminsCollection.updateOne(
            { _id: admin._id },
            { $set: { password: hashedPassword } }
          );
          
          // Verify the update was successful by fetching the admin again
          const updatedAdmin = await adminsCollection.findOne({ _id: admin._id });
          
          // Test if we can verify the password after update
          const confirmVerify = await bcrypt.compare(DEFAULT_PASSWORD, updatedAdmin.password);
          
          logStream.write(`Admin: ${admin.name} (${admin.email})\n`);
          logStream.write(`- Original password type: ${isBcryptHash ? 'bcrypt hash' : 'plain text'}\n`);
          logStream.write(`- New password hash: ${updatedAdmin.password.substring(0, 20)}...\n`);
          logStream.write(`- Verification test: ${confirmVerify ? 'PASSED' : 'FAILED'}\n`);
          
          if (confirmVerify) {
            successCount++;
            logStream.write(`- Status: SUCCESS\n`);
          } else {
            logStream.write(`- Status: FAILED\n`);
          }
          
          logStream.write('\n');
        } catch (error) {
          logStream.write(`ERROR: Failed to update password for admin ${admin.name} (${admin.email})\n`);
          logStream.write(`- Error: ${error.message}\n\n`);
        }
      }
      
      // Summary
      logStream.write('\nSummary\n');
      logStream.write('=======\n');
      logStream.write(`Total admins: ${admins.length}\n`);
      logStream.write(`Successfully reset: ${successCount}\n`);
      logStream.write(`Failed: ${admins.length - successCount}\n\n`);
      
      if (successCount === admins.length) {
        logStream.write('All admin passwords have been reset successfully!\n');
      } else {
        logStream.write('WARNING: Some admin passwords failed to reset.\n');
      }
      
      console.log(`Password reset complete. Results logged to ${logFile}`);
      console.log(`${successCount} of ${admins.length} passwords reset successfully`);
      console.log(`Default password for all admins is now: ${DEFAULT_PASSWORD}`);
      
      logStream.end();
    } catch (error) {
      console.error('Error resetting admin passwords:', error);
    } finally {
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
