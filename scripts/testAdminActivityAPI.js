import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminActivity from '../models/AdminActivity.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const testAdminActivityAPI = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test admin if it doesn't exist
    let testAdmin = await Admin.findOne({ email: 'testadmin@test.com' });
    if (!testAdmin) {
      testAdmin = new Admin({
        name: 'Test Admin',
        email: 'testadmin@test.com',
        phone: '1234567891',
        password: 'testpassword123'
      });
      await testAdmin.save();
      console.log('Created test admin');
    }

    // Create a test activity
    const testActivity = new AdminActivity({
      adminId: testAdmin._id,
      adminName: testAdmin.name,
      adminEmail: testAdmin.email,
      action: 'CREATE_TUTOR',
      targetType: 'Tutor',
      targetId: new mongoose.Types.ObjectId(),
      targetName: 'Test Tutor',
      details: {
        test: 'This is a test activity'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });

    await testActivity.save();
    console.log('Created test activity');

    // Generate JWT token
    const token = jwt.sign(
      { id: testAdmin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated token:', token);

    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/admin/activities', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('Number of activities:', Array.isArray(data) ? data.length : 'Not an array');
    } else {
      const errorData = await response.text();
      console.log('Error response:', errorData);
    }

    // Clean up test data
    await AdminActivity.findByIdAndDelete(testActivity._id);
    console.log('Cleaned up test activity');

    console.log('API test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testAdminActivityAPI(); 