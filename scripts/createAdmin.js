import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hardcoded MongoDB URI for testing
const MONGODB_URI = 'mongodb+srv://***REMOVED***@cluster0.iepde.mongodb.net/bolt_mtc?retryWrites=true&w=majority';

console.log('MongoDB URI:', MONGODB_URI);

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.db.databaseName}`);

    // Create admin data with plain text password
    const admin = {
      name: 'Super Admin',
      email: 'admin@gmail.com',
      phone: '1234567890',
      password: '***REMOVED***',  // Plain text password
      role: 'admin'
    };

    // First, delete any existing admin with the same email
    await conn.connection.db.collection('admins').deleteOne({ email: admin.email });
    console.log('Deleted existing admin if any');

    // Insert into database
    const result = await conn.connection.db.collection('admins').insertOne(admin);
    console.log('Admin created successfully:', result);

    // List all collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin(); 