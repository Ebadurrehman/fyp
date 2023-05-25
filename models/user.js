const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const JWT_KEY = process.env.JWT_KEY;
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const axios = require('axios');
const polyline = require('polyline');
// const { Client } = require('pg');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

  const validDomains = ['iba.edu.pk', 'khi.iba.edu.pk'];

// Create a new transporter object for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "projectecommercetest7@gmail.com",
    pass: "lyeihxdkhgsvkxap",
  },
});



// Add a new API endpoint to handle OTP verification
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user in the database by email address
    const user = await User.findOne({ email });

    // Check if the OTP matches the one stored in the database
    if (user && user.otp === otp) {
      // Mark the user account as verified
      user.verified = true;
      user.otp = undefined;
      await user.save();

      res.status(200).json({ message: 'OTP verification successful.' });
    } else {
      res.status(400).json({ message: 'Invalid OTP.' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});

  //Signup API
  router.post('/signup', async (req, res) => {
    const { username, email, password, erp, contact } = req.body;
  
    // Create a new user object
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    const user = new User({
      username,
      email,
      password: passwordHash,
      erp,
      contact,
      otp, // Store the OTP in the database
    });
  
    try {
      const existingUser = await User.findOne({ email });
      const existingUsererp = await User.findOne({ erp });
      const domain = email.split('@')[1];
      if (!email || !password || !username) {
        return res.status(400).json({ message: 'Not all fields have been entered.' });
      }
      if (!validDomains.includes(domain)) {
        return res.status(400).json({ message: 'Invalid email domain.' });
      }
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists.' });
      }
      if (existingUsererp) {
        return res.status(400).json({ message: 'ERP already exists.' });
      }
      
  
      // Send the OTP to the user's email address
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}.`,
      });
  
      
      res.status(201).json({ message: 'User created successfully. Please check your email for the OTP.' });
      
      // Save the user object to the database
      await user.save();
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'An error occurred.' });
    }
  });
    

// Signin API
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    const userH = await User.findOne({ email });
    const verify = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, userH.password);
    if (!verify.verified) return res.status(400).json({ msg: "Not Verified." });
    if(!isMatch) return res.status(400).json({ msg: "Invalid credentials." });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      const token = jwt.sign({
        email: user.email,
        userId: user._id
      }, 
      process.env.JWT_KEY, 
      {
        expiresIn: "365d"
      },
      );
      res.status(200).json({ message: 'Sign in successful', token: token });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


//Sign Out API
const auth = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ error: 'Not authorized to access this resource' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized to access this resource' });
  }
};

router.post('/signout', auth, async (req, res) => {
  try {
    // find the user by email and delete the session token
    const user = await User.findOneAndUpdate({ email: req.user.email }, { sessionToken: '' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//edit user
router.put('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  //console.log(userId)
  const { name,password, contact} = req.body;
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
   
try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = name || user.username;
    user.password = passwordHash;
    user.contact = contact;

    await user.save();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/forget_password', async (req, res) => {
  const { email } = req.body;
  const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });

  try {
    // Find the user in the database by email address
    const user = await User.findOne({ email });
    if (!user) {
      res.status(200).json({ message: 'no user exist' });
    }
    else{
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'password reset',
        text: `Your OTP is ${otp}.`,
      });
      user.otp=otp
      await user.save();
      res.json({ message: 'otp sent successfully' });

    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});
router.get('/allusers', async (req, res) => {
  const users = await User.find();
  try{
    res.send(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }

})

//post schedule
router.post('/users/:id/schedule', async (req, res) => {
  const id = req.params.id;
  const { day, start_time, end_time, start_campus,end_campus,role } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!Array.isArray(user.schedule) || !user.schedule) {
      user.schedule = [];
    }
    let courseTime = {
      day,
      start: start_time,
      end: end_time,
      start_campus:start_campus,
      end_campus:end_campus,
      role:role,
      flag:true
    };
   var chck=false
   for(let i=0; i<user.schedule.length; i++){
     if(user.schedule[i].day==day)
     chck=true
   }
   if(chck==false){
    user.schedule.push(courseTime);
    await user.save();
    res.json(user);
   }
   else
   res.send('day already')
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
//edit schedule
router.put('/users/shedule/:user_id/:day', async (req, res) => {
  const userId=req.params.user_id
  const day = req.params.day;

  const {start_time, end_time, start_campus,end_campus,role } = req.body;
  
    const user = await User.findById(userId);
    const id = user.schedule[1]["_id"];
    const daySch = user.schedule.filter(schedule => schedule.day === day);
    //console.log(mondaySch[0].start)
    try{
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    daySch[0].start=start_time
    daySch[0].end=end_time
    daySch[0].start_campus=start_campus
    daySch[0].end_campus=end_campus
    daySch[0].role=role
    await user.save()
    res.json(user.schedule);
  }

  catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
})
  
router.get('/allshedule/:userId/:sheduleId', async (req, res) => {
  const userId=req.params.userId
  const sch_Id = req.params.sheduleId;
  const user = await User.findById(userId);
  const id = user.schedule[0]["_id"];

  try{
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (sch_Id!=id) {
      return res.status(404).json({ message: 'schedule not found' });
    }
    res.json(user.schedule)
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred.' });
  }

})
///DAY
router.get('/day/:userId/:day', async (req, res) => {
  const day=req.params.day
  const userId=req.params.userId
  const users = await User.findById(userId);
  const shedule=users.schedule
  var rday=[];
  for (let i=0; i< shedule.length; i++){
    if(
      shedule[i].day==day
    )
    rday=shedule[i]
  }
   try{

      res.send(rday)
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: 'An error occurred.' });
   }
})

//Post Coordinates
router.post('/:userId/location', async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingLocation = user.location.find(loc => loc.latitude === latitude && loc.longitude === longitude);

    if (existingLocation) {
      return res.status(400).json({ error: 'Location already exists for the user' });
    }

    user.location.push({
      latitude: latitude,
      longitude: longitude
    });

    await user.save();

    res.send('Saved user location');

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to save user location' });
  }
});

// router.post('/:userId/location', async (req, res) => {
//   const { latitude, longitude } = req.body;
//   const userId=req.params.userId

//   try {
//     const user = await User.findById(userId);
//    user.location.push({
//      latitude:latitude,
//      longitude:longitude
//    })
//    await user.save();
//    res.send(" saved user location" );

//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ error: 'Failed to save user location' });
//   }
// });

//Google Maps API
router.get('/directions', (req, res) => {
  const origin = req.query.origin;
  const destination = req.query.destination;
  const apiKey = process.env.API_KEY;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;

  axios.get(url)
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Error retrieving directions');
    });
});

const currentUserLocation = {
  lat: 24.9125185,
  lng: 67.1153584
};

const universityLocation = {
  lat: 24.8676078,
  lng: 67.0255749
};

// Set up Google Maps API client
const googleMapsClient = axios.create({
  baseURL: 'https://maps.googleapis.com/maps/api',
  timeout: 10000,
  params: {
    key: process.env.API_KEY
  }
});

// Make API call to get directions between current user and university
async function getDirections() {
  const response = await googleMapsClient.get('/directions/json', {
    params: {
      origin: `${currentUserLocation.lat},${currentUserLocation.lng}`,
      destination: `${universityLocation.lat},${universityLocation.lng}`,
      alternatives: true
    }
  });

  const { routes } = response.data;
  console.log(response.data)
  return routes;
}

router.get('/mapdirections', async (req, res) => {
  try {
    const directions = await getDirections();
    res.json(directions);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving directions');
  }
});

//Matches API for going to uni
router.get('/matches_uni/:userid/:day', async (req, res) => {
   const userid=req.params.userid
   const user = await User.findById(userid)
   const day=req.params.day
   const schedule=user.schedule
   var uday;
   var start_time;
   var start_campus;
   var role;
   var users;
   const user_lat = user.location[0].latitude;
   const user_lng = user.location[0].longitude;
   const destLat = "24.9396119";
   const destLng = "67.1142199";
   let matches;
   let filtered_users;
  
   for(let i=0; i<schedule.length; i++){
     if(schedule[i].day==day){
       uday=schedule[i]
     }
   }
   
   start_time = uday.start
   //console.log(start_time)
   //console.log(uday)
   start_campus = uday.start_campus
   role = uday.role

  try {
    if(role == 'driver'){
      users = await User.find({
        schedule: {
          $elemMatch: {
            day: day,
            start: start_time,
            start_campus: start_campus,
            role: 'passenger'
          }
        }
      }, { location: 1, _id: 0 });
    }
    else{
      users = await User.find({
        schedule: {
          $elemMatch: {
            day: day,
            start: start_time,
            start_campus: start_campus,
            $or: [
              { role: 'driver' },
              { role: 'passenger' } // Replace 'anotherRole' with the desired role
            ]
          }
        }
      }, { location: 1, _id: 0 });
    }
    //console.log(users)
   // console.log(user.location[0].latitude)
   
  //  const locations = users.map(user => user.location[0]); // getting only the first location of each user
  //  console.log(locations);
  //  const coordinates = locations.map(location => ({
  //     lat: parseFloat(location.latitude),
  //     lng: parseFloat(location.longitude)
  //   }));
  const locations = users.map(user => {
    if (user.location && user.location[0] && user.location[0].latitude) {
      return user.location[0];
    } else {
      return null;
    }
  });
  
  //console.log(locations);
  
  const coordinates = locations
    .filter(location => location !== null)
    .map(location => ({
      lat: parseFloat(location.latitude),
      lng: parseFloat(location.longitude)
    }));
  
  //console.log(coordinates);
  
    //console.log(coordinates)
    if(coordinates.length < 1){
      res.send("no one is available")
    }else{
      
    getCoordinatesWithin3km(user_lat, user_lng, destLat, destLng, coordinates, process.env.API_KEY)
  .then(async (filteredCoordinates) => {
    matches = filteredCoordinates;
    //console.log(matches)
    //console.log(matches.length)
    
    // assuming response is the JSON object you received
    const latitudes = [];
    const longitudes = [];
    

    for (let i = 0; i < matches.length; i++) {
      latitudes.push(matches[i].lat);
      longitudes.push(matches[i].lng);
    }
    //console.log(latitudes)
    //res.json({ matches });

    filtered_users = await User.find({
      'location.latitude': { $in: latitudes },
      'location.longitude': { $in: longitudes }
    }, {email: 1, username: 1, erp: 1, location: 1, _id:1 ,'schedule.role':1 });
    //console.log(filtered_users[0])
    res.json({ filtered_users });
  })
  .catch((error) => {
    console.error(error);
  });
    }
    

  } catch (error) {
    console.error(error);
    res.status(500).send('Error');
  }
});

//Matches API for going to home
router.get('/matches_home/:userid/:day', async (req, res) => {
  const userid=req.params.userid
  const user = await User.findById(userid)
  const day=req.params.day
  const schedule=user.schedule
  var uday;
  var end_time;
  var end_campus;
  var role;
  var users;
  const user_lat = user.location[0].latitude;
  const user_lng = user.location[0].longitude;
  const destLat = "24.9396119";
  const destLng = "67.1142199";
  let matches;
  let filtered_users;
 
  for(let i=0; i<schedule.length; i++){
    if(schedule[i].day==day){
      uday=schedule[i]
    }
  }
  
  end_time = uday.end
  //console.log(start_time)
  //console.log(uday)
  end_campus = uday.end_campus
  role = uday.role

 try {
   if(role == 'driver'){
     users = await User.find({
       schedule: {
         $elemMatch: {
           day: day,
           end: end_time,
           end_campus: end_campus,
           role: 'passenger'
         }
       }
     }, { location: 1, _id: 0 });
   }
   else{
     users = await User.find({
       schedule: {
         $elemMatch: {
           day: day,
           end: end_time,
           end_campus: end_campus,
           //role: 'passenger'
         }
       }
     }, { location: 1, _id: 0 });
   }
   //console.log(users)
  // console.log(user.location[0].latitude)
  
  // const locations = users.map(user => user.location[0]); // getting only the first location of each user
  
  // const coordinates = locations.map(location => ({
  //    lat: parseFloat(location.latitude),
  //    lng: parseFloat(location.longitude)
  //  }));
  const locations = users.map(user => {
    if (user.location && user.location[0] && user.location[0].latitude) {
      return user.location[0];
    } else {
      return null;
    }
  });
  
  console.log(locations);
  
  const coordinates = locations
    .filter(location => location !== null)
    .map(location => ({
      lat: parseFloat(location.latitude),
      lng: parseFloat(location.longitude)
    }));
  
  console.log(coordinates);
  
   //console.log(coordinates)
   if(coordinates.length < 1){
     res.send("no one is available")
   }else{
     
   getCoordinatesWithin3km(user_lat, user_lng, destLat, destLng, coordinates, process.env.API_KEY)
 .then(async (filteredCoordinates) => {
   matches = filteredCoordinates;
   //console.log(matches)
   //console.log(matches.length)
   
   // assuming response is the JSON object you received
   const latitudes = [];
   const longitudes = [];
   

   for (let i = 0; i < matches.length; i++) {
     latitudes.push(matches[i].lat);
     longitudes.push(matches[i].lng);
   }
   console.log(latitudes)
   //res.json({ matches });

   filtered_users = await User.find({
     'location.latitude': { $in: latitudes },
     'location.longitude': { $in: longitudes }
   }, {email: 1, username: 1, erp: 1, location: 1, _id: 1});
   console.log(filtered_users)
   res.json({ filtered_users });
 })
 .catch((error) => {
   console.error(error);
 });
   }
   

 } catch (error) {
   console.error(error);
   res.status(500).send('Error');
 }
});

//Request Coming API
router.post('/requestcoming/:userid/:day', async (req, res) => {
  const userid=req.params.userid;
  const day=req.params.day;
  const { s_userid } = req.body;
  const s_user = await User.findById(s_userid);
  const user = await User.findById(userid);
  const daySch = user.schedule.filter(schedule => schedule.day === day);
  const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);
  try {
    daySch[0].request_sent.push({
      id: s_userid,
      username: s_user.username,
      email: s_user.email,
      erp: s_user.erp
    });
    //S_daySch[0].request_coming = userid;
    S_daySch[0].request_coming.push({
      id: userid,
      username: user.username,
      email: user.email,
      erp: user.erp
    });
    console.log(S_daySch[0]);
    await user.save();
    await s_user.save();
    res.send('request sent')
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving directions');
  }
});
//Request Going API
router.post('/requestgoing/:userid/:day', async (req, res) => {
  const userid=req.params.userid;
  const day=req.params.day;
  const { s_userid } = req.body;
  const s_user = await User.findById(s_userid);
  const user = await User.findById(userid);
  const daySch = user.schedule.filter(schedule => schedule.day === day);
  const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);
  try {
    // daySch[0].request_going = s_userid;
    daySch[0].request_sent.push({
      id: s_userid,
      username: s_user.username,
      email: s_user.email,
      erp: s_user.erp
    });
    // S_daySch[0].request_going = userid;
    S_daySch[0].request_going.push({
      id: userid,
      username: user.username,
      email: user.email,
      erp: user.erp
    });
    await user.save();
    await s_user.save();
    res.send('request sent')
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving directions');
  }
});

//Accept Going API
router.post('/acceptgoing/:userid/:day', async (req, res) => {
  const userid=req.params.userid;
  const day=req.params.day;
  const { s_userid } = req.body;
  const s_user = await User.findById(s_userid);
  const user = await User.findById(userid);
  const daySch = user.schedule.filter(schedule => schedule.day === day);
  const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);
  //console.log(S_daySch[0].request_going)
  //daySch[0].request_going[0]=[]
for (let i = 0; i < S_daySch[0].request_sent.length; i++) {
  if (S_daySch[0].request_sent[i].erp ==user.erp) {
    S_daySch[0].request_sent.splice(i, 1);
    break;
  }
}

for (let i = 0; i < daySch[0].request_going.length; i++) {
  if (daySch[0].request_going[i].erp == s_user.erp) {
    daySch[0].request_going.splice(i, 1);
    break;
  }
} 


daySch[0].accept_going.push({
  id: s_userid,
  username: s_user.username,
  email: s_user.email,
  erp: s_user.erp
});
S_daySch[0].accept_going.push({
  id: userid,
  username: user.username,
  email: user.email,
  erp: user.erp
});
await user.save();
await s_user.save();
res.send(daySch[0].accept_going)

});
//Accept coming API
router.post('/acceptcoming/:userid/:day', async (req, res) => {
  const userid=req.params.userid;
  const day=req.params.day;
  const { s_userid } = req.body;
  const s_user = await User.findById(s_userid);
  const user = await User.findById(userid);
  const daySch = user.schedule.filter(schedule => schedule.day === day);
  const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);

  var available_id;

  try{

    if(daySch[0].request_coming.length>0){
    for ( i = 0; i < daySch[0].request_coming.length; i++) {
      if(daySch[0].request_coming[i].id==s_userid){
      available_id = daySch[0].request_coming[i];
      }
      else {
       return res.json({ message: 'no req' });

        
      }
    }
    
    S_daySch[0].accept_coming = userid;
    daySch[0].accept_coming = s_userid;

    console.log(available_id)
    let index = daySch[0].request_coming.indexOf(available_id);
    console.log(index)
// Remove the element if found
if (index !== -1) {
  daySch[0].request_coming.splice(index, 1);
}

    await user.save();
    await s_user.save()
    res.send('request ok')

  }

else {
  res.send('No req exist');
}
  }
   catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving req');
  }
});

/// reject request
router.post('/rejectreq/:userid/:day', async (req, res) => {
  const userid=req.params.userid;
  const day=req.params.day;
  const { s_userid } = req.body;
  const s_user = await User.findById(s_userid);
  const user = await User.findById(userid);
  const daySch = user.schedule.filter(schedule => schedule.day === day);
  const S_daySch = s_user.schedule.filter(schedule => schedule.day === day);

  var available_id;

  try{
    if(daySch[0].accept_coming.length>0){
      for ( i = 0; i < daySch[0].accept_coming.length; i++) {
        if(daySch[0].accept_coming[i].id==s_userid){
          let index = daySch[0].accept_coming.indexOf(daySch[0].accept_coming[i]);
          //console.log(index)
      // Remove the element if found
      if (index !== -1) {
        daySch[0].accept_coming.splice(index, 1);
        await user.save();
      await s_user.save()
      }

        }

        else {
         return res.json({ message: 'no req 1' });
  
          
        }
      }
      await user.save();
      await s_user.save()
      return res.json({ message: 'done' });
    
    }
    
    if(daySch[0].accept_going.length>0){
      for ( i = 0; i < daySch[0].accept_going.length; i++) {
        console.log(daySch[0].accept_going[i])
        if(daySch[0].accept_going[i].id==s_userid){
          let index = daySch[0].accept_going.indexOf(daySch[0].accept_going[i]);
          //console.log(index)
      // Remove the element if found
      if (index !== -1) {
        daySch[0].accept_going.splice(index, 1);
      }
        }
        else {
         return res.json({ message: 'no req 2' });
  
          
        }
      }
      await user.save();
      await s_user.save()
      return res.json({ message: 'done' });
     
    }
    else return res.json({ message: 'no req F' });
  
  }
   catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving req');
  }
});

///
//Function to get Matches
async function getCoordinatesWithin3km(startLat, startLng, endLat, endLng, coordinates, api_key) {
  const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
  const url = `${baseUrl}?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${api_key}`;
  const response = await axios.get(url);
  const routes = response.data.routes;

  if (routes.length === 0) {
    throw new Error('No routes found');
  }

  const points = routes[0].overview_polyline.points;
  const routeCoordinates = decodePolyline(points);

  const filteredCoordinates = coordinates.filter((coordinate) => {
    const distance = getDistanceFromRoute(routeCoordinates, coordinate);
    return distance <= 10;
  });

  return filteredCoordinates;
}

function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    const point = {
      lat: lat / 1e5,
      lng: lng / 1e5,
    };
    poly.push(point);
  }

  return poly;
}

function getDistanceFromRoute(routeCoordinates, coordinate) {
  let closestDistance = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const distance = getDistanceToSegment(
      routeCoordinates[i].lat,
      routeCoordinates[i].lng,
      routeCoordinates[i + 1].lat,
      routeCoordinates[i + 1].lng,
      coordinate.lat,
      coordinate.lng
    );
    if (distance < closestDistance) {
      closestDistance = distance;
    }
  }
  return closestDistance;
}

function getDistanceToSegment(x1, y1, x2, y2, x3, y3) {
  const px = x2 - x1;
  const py = y2 - y1;
  const something = px * px + py * py;
  let u = ((x3 - x1) * px + (y3 - y1) * py) / something;

  if (u > 1) {
    u = 1;
  } else if (u < 0) {
    u = 0;
  }

  const x = x1 + u * px;
  const y = y1 + u * py;

  const dx = x - x3;
  const dy = y - y3;

  return Math.sqrt(dx * dx + dy * dy) * 111.319;
  }


module.exports = router;
