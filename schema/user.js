const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const scheduleSchema = new Schema({
  day: {
    type: String,
    required: true
  },
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  campus: {
    type: String,
    enum: ['campus1', 'campus2'],
    required: true
  }
});

let userschema = new Schema({
  schedule: [{
    type: scheduleSchema
  }],
  username: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  erp:{
    type: Number
  },
  otp: {
    type: String
  },
  verified: {
    type: Boolean,
    default: false
  }
  })

module.exports = mongoose.model('user',userschema)