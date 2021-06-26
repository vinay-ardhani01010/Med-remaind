const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User_db = require('../models/users.js');
const bcrypt = require('bcryptjs');
/********* verify call-back **********/
var verifyCallback = (username, password, done) =>{
    User_db.findOne({ username: username }, async function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const bool_ = await bcrypt.compare(password,user.password);
      if(!bool_){
        return done(null,false, {message : 'incorrect password'})
      }
      else{
        return done(null, user);
      }
    }
    )}
var  strategy = new LocalStrategy(verifyCallback);
passport.use(strategy);
/*************** put the user into the sessions ,passport object => sessions->passport->user **********/

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

/*************** put the user into the sessions passport object => sessions->passport->user **********/

/****************  grabs the user out of the sessions if exists ******************/

passport.deserializeUser((id, done) => {
    User_db.findById(id)
    .then((user)=>{
      done(null,user);
    })
    .catch(err => done(null,err));
    
  })

/****************  grabs the user out of the sessions ******************/