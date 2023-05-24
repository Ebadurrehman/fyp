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
  },
  request_coming:[
    {
     id:{
       type:String
     }, 
     username:{
      type:String
    },
    email:{
      type:String
    }, 
    erp:{
      type:String
    },
    }
  ],
  request_going:[
    {
     id:{
       type:String
     }, 
     username:{
      type:String
    },
    email:{
      type:String
    }, 
    erp:{
      type:String
    },
    }
  ],
  accept_coming:[
    {
      id:{
        type:String
      }, 
      username:{
       type:String
     },
     email:{
       type:String
     }, 
     erp:{
       type:String
     },
     }
  ],
  accept_going:[
    {
      id:{
        type:String
      }, 
      username:{
       type:String
     },
     email:{
       type:String
     }, 
     erp:{
       type:String
     },
     }
  ], 
  request_sent:[
    {
     uid:{
       type:String
     }, 
     username:{
      type:String
    },
    email:{
      type:String
    }, 
    erp:{
      type:String
    },
    }
  ]
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
  },
  contact: {
    type: String
  },
  location:[
    {
     latitude:{
       type:String
     }, 
     longitude:{
      type:String
    }  
    }
  ]
  })
module.exports = mongoose.model('user',userschema)