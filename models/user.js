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
    const { username, email, password, erp } = req.body;
  
    // Create a new user object
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    const user = new User({
      username,
      email,
      password: passwordHash,
      erp,
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
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials." });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      const token = jwt.sign({
        email: user.email,
        userId: user._id
      }, 
      process.env.JWT_KEY, 
      {
        expiresIn: "1h"
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
  const { name,password} = req.body;
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
   
try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = name || user.username;
    user.password = passwordHash;

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
    user.schedule.push(courseTime);
    await user.save();
    res.json(user);
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
      shedule[i].day=day
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
router.post('/:userId/location', async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId=req.params.userId

  try {
    const user = await User.findById(userId);
   user.location.push({
     latitude:latitude,
     longitude:longitude
   })
   res.send(" saved user location" );

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to save user location' });
  }
});

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

  // // Extract polylines of main route and alternative routes
  // const mainRoutePolyline = routes[0].overview_polyline.points;
  // const alternativeRoutePolylines = routes.slice(1).map(route => route.overview_polyline.points);

  // return { mainRoutePolyline, alternativeRoutePolylines };
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

module.exports = router;
