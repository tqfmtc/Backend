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
      // Get the tutors collection
      const tutorsCollection = mongoose.connection.db.collection('tutors');
      
      // Find all tutors
      const tutors = await tutorsCollection.find({}).toArray();
      console.log(`Found ${tutors.length} tutors in the database`);
      
      // Create a log directory if it doesn't exist
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const logsDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
      }
      
      // Create a log file
      const logFile = path.join(logsDir, 'password_reset.log');
      const logStream = fs.createWriteStream(logFile, { flags: 'w' });
      
      logStream.write('Tutor Password Reset Log\n');
      logStream.write('=======================\n\n');
      logStream.write(`Default Password: ${DEFAULT_PASSWORD}\n\n`);
      
      // Reset all tutor passwords
      let successCount = 0;
      for (const tutor of tutors) {
        try {
          // Hash the default password
          const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
          
          // Verify hash works before updating
          const verifyHash = await bcrypt.compare(DEFAULT_PASSWORD, hashedPassword);
          
          if (!verifyHash) {
            logStream.write(`WARNING: Hash verification failed for tutor ${tutor.name} (${tutor.phone})\n`);
            continue;
          }
          
          // Update the tutor's password
          await tutorsCollection.updateOne(
            { _id: tutor._id },
            { $set: { password: hashedPassword } }
          );
          
          // Verify the update was successful by fetching the tutor again
          const updatedTutor = await tutorsCollection.findOne({ _id: tutor._id });
          
          // Test if we can verify the password after update
          const confirmVerify = await bcrypt.compare(DEFAULT_PASSWORD, updatedTutor.password);
          
          logStream.write(`Tutor: ${tutor.name} (${tutor.phone})\n`);
          logStream.write(`- Original password: ${tutor.password ? (tutor.password.substring(0, 10) + '...') : 'not set'}\n`);
          logStream.write(`- New password hash: ${updatedTutor.password.substring(0, 10)}...\n`);
          logStream.write(`- Verification test: ${confirmVerify ? 'PASSED' : 'FAILED'}\n`);
          
          if (confirmVerify) {
            successCount++;
            logStream.write(`- Status: SUCCESS\n`);
          } else {
            logStream.write(`- Status: FAILED\n`);
          }
          
          logStream.write('\n');
        } catch (error) {
          logStream.write(`ERROR: Failed to update password for tutor ${tutor.name} (${tutor.phone})\n`);
          logStream.write(`- Error: ${error.message}\n\n`);
        }
      }
      
      // Summary
      logStream.write('\nSummary\n');
      logStream.write('=======\n');
      logStream.write(`Total tutors: ${tutors.length}\n`);
      logStream.write(`Successfully reset: ${successCount}\n`);
      logStream.write(`Failed: ${tutors.length - successCount}\n\n`);
      
      if (successCount === tutors.length) {
        logStream.write('All tutor passwords have been reset successfully!\n');
      } else {
        logStream.write('WARNING: Some tutor passwords failed to reset.\n');
      }
      
      console.log(`Password reset complete. Results logged to ${logFile}`);
      console.log(`${successCount} of ${tutors.length} passwords reset successfully`);
      console.log(`Default password for all tutors is now: ${DEFAULT_PASSWORD}`);
      
      logStream.end();
    } catch (error) {
      console.error('Error resetting tutor passwords:', error);
    } finally {
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
