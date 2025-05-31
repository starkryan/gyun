const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  personality: {
    type: String,
    required: true,
  },
  // Only store URLs for images, not binary data
  imageUrl: {
    type: String,
    required: true,
  },
  backgroundImageUrl: {
    type: String,
  },
  accentColor: {
    type: String,
    default: '#ec4899',
  },
  textColor: {
    type: String,
    default: '#ffffff',
  },
  age: {
    type: String,
  },
  location: {
    type: String,
  },
  responseTime: {
    type: String,
    default: '< 1 min',
  },
  traits: {
    type: [String],
    default: [],
  },
  interests: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Character', CharacterSchema);
