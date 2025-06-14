import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const supervisorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number']
  },
  password: {
    type: String,
    default: '121314',
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  assignedCenters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
supervisorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
supervisorSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Supervisor = mongoose.model('Supervisor', supervisorSchema);

export default Supervisor;