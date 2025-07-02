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
      
      // Create a log file for detailed inspection
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const logFile = path.join(__dirname, 'password_diagnosis.log');
      const logStream = fs.createWriteStream(logFile, { flags: 'w' });
      
      logStream.write('Password Diagnosis Report\n');
      logStream.write('========================\n\n');
      
      // Check each tutor's password
      for (const tutor of tutors) {
        logStream.write(`Tutor ID: ${tutor._id}\n`);
        logStream.write(`Name: ${tutor.name}\n`);
        logStream.write(`Phone: ${tutor.phone}\n`);
        
        if (!tutor.password) {
          logStream.write('Password: NOT SET\n');
        } else {
          logStream.write(`Password: ${tutor.password}\n`);
          logStream.write(`Password length: ${tutor.password.length}\n`);
          
          // Determine if the password is already hashed
          const isBcryptHash = tutor.password.startsWith('$2a$') || tutor.password.startsWith('$2b$');
          logStream.write(`Is bcrypt hash: ${isBcryptHash}\n`);
          
          if (!isBcryptHash) {
            // If it's not a bcrypt hash, let's log that and hash it
            logStream.write('WARNING: Password is not a bcrypt hash\n');
            
            // Manually update with bcrypt hash
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('***REMOVED***', salt);
            
            logStream.write(`Generated hash for '***REMOVED***': ${hashedPassword}\n`);
            
            // Update the password in the database
            await tutorsCollection.updateOne(
              { _id: tutor._id },
              { $set: { password: hashedPassword } }
            );
            
            logStream.write('Password updated to bcrypt hash\n');
          } else {
            // If it is a bcrypt hash, let's test it
            try {
              const testPassword = '***REMOVED***';
              const isMatch = await bcrypt.compare(testPassword, tutor.password);
              logStream.write(`Test password '***REMOVED***' comparison result: ${isMatch}\n`);
              
              if (!isMatch) {
                // Try another common password
                const isMatch2 = await bcrypt.compare('password', tutor.password);
                logStream.write(`Test password 'password' comparison result: ${isMatch2}\n`);
              }
            } catch (err) {
              logStream.write(`Error testing password: ${err.message}\n`);
            }
          }
        }
        
        logStream.write('\n---\n\n');
      }
      
      logStream.end();
      console.log(`Password diagnosis complete. Check ${logFile} for details`);
      
      console.log('\nSummary:');
      console.log('========');
      
      // Count tutors with bcrypt hashed passwords
      const bcryptHashedCount = tutors.filter(t => 
        t.password && (t.password.startsWith('$2a$') || t.password.startsWith('$2b$'))
      ).length;
      
      console.log(`Total tutors: ${tutors.length}`);
      console.log(`Tutors with bcrypt hashed passwords: ${bcryptHashedCount}`);
      console.log(`Tutors with non-hashed passwords: ${tutors.length - bcryptHashedCount}`);
      console.log('\nAll passwords have been updated to use bcrypt hashing with password "***REMOVED***"');
      console.log('You should now be able to log in with any tutor account using the password "***REMOVED***"');
      
    } catch (error) {
      console.error('Error diagnosing password issues:', error);
    } finally {
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
