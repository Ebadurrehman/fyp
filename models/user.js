const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schema/user');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const JWT_KEY = process.env.JWT_KEY;
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
//const bcrypt = require("bcryptjs");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Connect to MongoDB
mongoose.connect('mongodb+srv://ebadurrehman:Iba22395@fyp.sphtxvo.mongodb.net/routify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to database.');
  })
  .catch((error) => {
    console.log('Connection failed.');
  });
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

//Signout API
// router.post('/signout', async (req, res) => {
//   try {
//     // Clear the token from the client-side by removing the token cookie
//     res.clearCookie('token');
    
//     res.status(200).json({ message: 'Sign out successful' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

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
try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = name || user.username;
    user.password = password || user.password;

    await user.save();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
