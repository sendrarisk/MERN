const express = require('express');
const app = express();
var router = express.Router();
var mongoose = require('mongoose');
const City = require('./citySchema');
const Itinerary = require('./ItinerarySchema');
const User = require('./userSchema');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
var ObjectID = require('mongodb').ObjectID;
const keys = require('./keys');

const port = process.env.PORT || 5000;
app.listen(5000, function(){
  console.log("connected to port " + port);
});

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/', router);
app.use(passport.initialize());
app.use(passport.session()); //?

require('./passport');
require('./passportGoogle');

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

mongoose.connect( keys.mongoURL, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'cities' });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
  console.log('connected to the data base');
});

app.get('/getCities', (req, res) => {
  City.find(function(err, cities) {
    if (err) return console.error(err);
    res.send(cities);
  });
});

app.get('/getItineraries', (req, res) => {
  Itinerary.find(function(err, itineraries) {
    if (err) return console.error(err);
    res.send(itineraries);
  });
});

app.get('/itineraries/:id', (req, res) => {
  let id = ObjectID(req.params.id);
  db.collection('itineraries')
    .find(id)
    .toArray((err, results) => {
      if (err) {
        throw err;
      }
      res.send(results);
    });
});

app.get('/itinerariesByCity/:cityId', (req, res) => {
  let id = ObjectID(req.params.cityId);
  db.collection('itineraries')
    .find({ city: id })
    .toArray((err, results) => {
      if (err) {
        throw err;
      }
      res.send(results);
    });
});

app.get('/city/:id', (req, res) => {
  let id = ObjectID(req.params.id);
  db.collection('cities')
    .find(id)
    .toArray((err, results) => {
      if (err) {
        throw err;
      }
      res.send(results);
    });
});

app.get('/activitiesByitinerary/:itineraryId', (req, res) => {
  let id = ObjectID(req.params.itineraryId);
  db.collection('activities')
    .find({ itinerary: id })
    .toArray((err, results) => {
      if (err) {
        throw err;
      }
      res.send(results);
    });
});

app.get('/users/all', (req, res) => {
  User.find(function(err, users) {
    if (err) return console.error(err);
    res.send(users);
  });
});

app.post('/users/register', async (req, response) => {
  let userExist = await User.findOne({ username: req.body.username });
  if (userExist) {
    return response.status(500).send('Username is already being used');
  }
  let emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) {
    return response
      .status(500)
      .send('Email is already being used for another account');
  }
  var newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    country: req.body.country,
    photoURL: req.body.photoURL,
    favourites: [],
    isOnline: false
  });
  newUser.save(function(err, res) {
    if (err) {
      return response.status(500).send('The user cant be saved');
    }
    return response.send(res);
  });
});

app.post('/users/login', async (req, res) => {
  let user = await User.findOne({ username: req.body.username });
  if (!user) {
    return res.status(500).send('User doesnt exist');
  }
  let passwordMatch = bcrypt.compareSync(req.body.password, user.password);
  if (!passwordMatch) {
    return res.status(500).send('Password doesnt match');
  }
  const payload = {
    id: user._id,
    username: user.username,
    photoURL: user.photoURL
  };
  const options = { expiresIn: 2592000 };
  jwt.sign(payload, keys.secretSign, options, async (err, token) => {
    if (err) {
      res.json({
        success: false,
        token: 'Error with the token'
      });
    } else {
      await user.updateOne({ isOnline: true });
      res.json({
        success: true,
        token: token
      });
    }
  });
});

app.put(
  '/users/logout',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    User.findByIdAndUpdate(
      req.user._id,
      { isOnline: 'false' },
      { new: true },
      (err, user) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(user);
      }
    );
  }
);

app.delete('/users/clear', (req, res) => {
  User.deleteMany({}, function(err) {
    if (err) return handleError(err);
    else return res.send('all deleted');
  });
});

app.delete('/users/delete', async (req, res) => {
  let userDeleted = await User.deleteOne({ username: req.body.username });
  if (userDeleted.deletedCount > 0) {
    res.send('user deleted');
  } else {
    res.status(500).send('Cant be deleted');
  }
});

app.get(
  '/users/profile',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    User.findById(req.user._id, (err, user) => {
      if (err)
        return res.status(500).send('Error to get data from the data base');
      return res.send(user);
    });
  }
);

app.get(
  '/users/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get(
  '/users/google/redirect',
  passport.authenticate('google', { failureRedirect: '/mal' }),
  async (req, res) => {
    const payload = {
      id: req.user._id,
      username: req.user.username,
      photoURL: req.user.photoURL
    };
    const options = { expiresIn: 2592000 };
    token = jwt.sign(payload, 'secret', options);
    res.redirect('http://localhost:3000/loging/' + token);
  }
);