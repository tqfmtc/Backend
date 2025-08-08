import mongoose from 'mongoose';

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Admin actions
      'CREATE_ADMIN',
      'UPDATE_ADMIN', 
      'DELETE_ADMIN',
      // Center actions
      'CREATE_CENTER',
      'UPDATE_CENTER',
      'DELETE_CENTER',
      // Tutor actions
      'CREATE_TUTOR',
      'UPDATE_TUTOR',
      'DELETE_TUTOR',
      // Supervisor actions
      'CREATE_SUPERVISOR',
      'UPDATE_SUPERVISOR',
      'DELETE_SUPERVISOR'
    ]
  },
  targetType: {
    type: String,
    required: true,
    enum: ['Admin', 'Center', 'Tutor', 'Supervisor']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetName: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
adminActivitySchema.index({ timestamp: -1 });
adminActivitySchema.index({ adminId: 1, timestamp: -1 });
adminActivitySchema.index({ action: 1, timestamp: -1 });

const AdminActivity = mongoose.model('AdminActivity', adminActivitySchema);

export default AdminActivity;