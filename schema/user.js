const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const roleSchema=new Schema({
  first_slot:String,
  last_slot:String,
  role:Boolean, //enum
  campus:Boolean //enum
})
const scheduleSchema = new Schema({
  monday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
},
  tuesday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  },
  wednesday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  },
  thursday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  },
  friday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  },
  saturday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  },
  sunday: {
    type: {
      available: Boolean,
      role:  {
        type: roleSchema
      }},
    default: {
      available: true,
  }
  }
});

let userschema = new Schema({
  schedule: {
    type: scheduleSchema
  },
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