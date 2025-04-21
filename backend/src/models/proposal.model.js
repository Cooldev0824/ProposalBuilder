const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'table', 'signature', 'pricing']
  },
  content: mongoose.Schema.Types.Mixed,
  position: {
    x: Number,
    y: Number
  },
  style: {
    width: String,
    height: String,
    fontSize: String,
    fontFamily: String,
    color: String,
    backgroundColor: String
  }
});

const sectionSchema = new mongoose.Schema({
  title: String,
  order: Number,
  elements: [elementSchema]
});

const proposalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  sections: [sectionSchema],
  settings: {
    theme: {
      type: String,
      default: 'default'
    },
    fonts: {
      heading: String,
      body: String
    },
    colors: {
      primary: String,
      secondary: String,
      accent: String
    }
  },
  metadata: {
    client: {
      name: String,
      email: String,
      company: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'declined'],
      default: 'draft'
    },
    expiryDate: Date,
    totalValue: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proposal', proposalSchema);