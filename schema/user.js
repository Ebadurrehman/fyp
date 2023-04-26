const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const scheduleSchema = new Schema({
  day: {
    type: String,
    //required: true
  },
  start: {
    type: String,
    //required: true
  },
  end: {
    type: String,
    //required: true
  },
  start_campus: {
    type: String,
    enum: ['main', 'city'],
    //required: true
  },
  end_campus: {
    type: String,
    enum: ['main', 'city'],
    //required: true
  },
  role: {
    type: String,
    enum: ['driver', 'passenger'],
    //required: true
  },
  flag:{
    type:Boolean,
    default:false
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