const express = require('express');
const userRoutes = require('./models/user');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongo = process.env.url;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/api', userRoutes);
// Connect to MongoDB
mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to database.');
  })
  .catch((error) => {
    console.log('Connection failed.');
  });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
