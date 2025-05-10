import mongoose from 'mongoose';

const centerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a center name']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  coordinates: {
    type: [Number],
    required: [true, 'Please add coordinates'],
    index: '2dsphere'
  },
  area: {
    type: String,
    required: [true, 'Please specify area']
  },
  sadarName: {
    type: String,
    required: [true, 'Please add sadar name']
  },
  sadarContact: {
    type: String,
    required: [true, 'Please add sadar contact'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number']
  },
  tutors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Center = mongoose.model('Center', centerSchema);

export default Center;