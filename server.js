const express = require('express')
const app = express();
const mongoose = require('mongoose');
const session = require('express-session')
const MongoStore = require('connect-mongo');
const User_db = require('./models/users.js');
var flash = require('connect-flash');
app.set('view engine','ejs');
const bcrypt = require('bcryptjs');
require('dotenv').config()

/************************ twilio-config **********/

const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

var TWILIO_ACCOUNT_SID = "ACf31d5d12f67b20f58a7aa1e1b5639c48"
var TWILIO_AUTH_TOKEN = "d1b491f9b013230d9f188d20d73e0fc"
const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const schedule = require('node-schedule');

/************************ twilio-config **********/

/***************************************** database-connections****************************************/

const dbOptions = {
    useNewUrlParser : true,
    useUnifiedTopology : true
}
const url = "mongodb+srv://new_user:pragati456@cluster0.xxmjo.mongodb.net/node-mongo?retryWrites=true&w=majority"
const connect = mongoose.connect(url,dbOptions);
connect.then(()=> console.log("conneced to the database-server"));

/***************************************** database-connections****************************************/

/***************************************** session-store-node-mongo*************************************/

const sessionStore = new MongoStore({
    mongooseConnection : connect,
    collection  : 'sessions',
    mongoUrl : url
})

/***************************************** session-store-node-mongo*************************************/
/*********** session-middleware **************************/

app.use(session({
    secret : "somsthing-secret",
    resave : true,
    saveUninitialized : true,
    store : sessionStore,
    cookie : {
      maxAge : 1000*60*60*24
    }
}))

/*********** session-middleware **************************/

/**********************  passport-middleware  **********************/

const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport-config.js');

/**********************  passport-middleware  **********************/

/*********************  body-parsers ******************************/

app.use(express.json());
const bodyParser = require('body-parser');
const { UsageRecordInstance } = require('twilio/lib/rest/supersim/v1/usageRecord');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.urlencoded({extended:true}));
app.use(flash());

/*********************  body-parsers ******************************/


/*********************************** main-routes *************************************************/

 app.get('/',checkAuthenticated,async (req,res)=>{
        var user = await User_db.findOne({_id : req.user._id});
        user.remainders.forEach(rem => {
            if(!rem.isSheduled){
                schedule.scheduleJob(rem.unique_id,rem.cron_expression, function(){
                    client.messages
                    .create({
                       from: 'whatsapp:+14155238886',
                       body: `Hi there! it's time to take ${rem.medName} please take it`,
                       to: `whatsapp:+91${user.whatsapp}`,
                       mediaUrl : rem.imgUrl
                     })
                    .then(message => console.log(message.sid));
                  });
                  rem.isSheduled = true;
                  
            }  
        })
        user.save();
        res.render('homepage.ejs',{user : user.remainders});
      
 })
 app.post('/register', async (req,res)=>{
     try{
        var  hashedPwd = await bcrypt.hash(req.body.password,10);
        console.log(req.body.username,req.body.whatsapp,hashedPwd);
        User_db.create({
            username : req.body.username,
            whatsapp : req.body.whatsapp,
            password : hashedPwd
        }).then(()=>{
            res.redirect('/login');
            console.log("added");
        }).catch(err => res.status(500).json('Error: '+ err));
     }
     catch{
         console.log('some error');
     }
 })
 app.post('/login',passport.authenticate('local',{ successRedirect : '/',
                                                failureRedirect : '/login',
                                                failureFlash : true
 }))

 app.get('/failed',(req,res)=>{
     res.send("u are not authenticated please enter valid credentials");
 })

 app.get('/login', checkNotAuthenticated,(req,res)=>{
     res.render('login.ejs');
 })
 app.get('/register',checkNotAuthenticated,(req,res)=>{
     res.render('register.ejs');
 })
 app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/login');
  });
  app.get('/sample',async (req,res)=>{
     var  user = await User_db.findOne({_id : req.user._id});
     user.remainders = [];
     user.save();
  })
  app.get('/setremainder',(req,res)=>{
      res.render('setRemainder.ejs')
  })
  app.post('/setRemainder', async (req,res)=>{
      var day,hour = req.body.hr,minute = req.body.minute;
      if(req.body.day === "Everyday"){
          day = '*';
      }
      else if(req.body.day === "Monday"){
          day = 1;
      }
      else if(req.body.day === "Tuesday"){
        day = 2;
    }
    else if(req.body.day === "Wednesday"){
        day = 3;
    }
    else if(req.body.day === "Thursday"){
        day = 4;
    }
    else if(req.body.day === "Friday"){
        day = 5;
    }
    else if(req.body.day === "Saturday"){
        day = 6;
    }
    else if(req.body.day === "Sunday"){
        day = 0;
    }
    if(req.body.period === "PM" && parseInt(hour)<12){
        hour = parseInt(hour)+parseInt(12);
    }
    else if(parseInt(hour) == 12 && req.body.period === "AM"){
        hour = parseInt(0);
    }
    var cron_expression = `${minute} ${hour} * * ${day}`;
    const medName = req.body.medname;
    const imgUrl = req.body.image;
    const time = `${hour}:${minute} ${req.body.period}`
    var user = await User_db.findOne({_id : req.user._id});
    if(user){
        var object = { cron_expression : cron_expression,
                       medName : medName,
                       imgUrl : imgUrl,
                       isSheduled : false,
                       time : time,
                       weekday : req.body.day
        }
        user.remainders.push(object);
        user.save();
        //console.log(cron_expression);
    }
    res.redirect('/');
  })
  
  app.get('/deleteRem/:id',async (req,res)=>{
      schedule.cancelJob(req.params.id);
      const user = await User_db.findOne({_id : req.user._id});
      user.remainders = user.remainders.filter((item) => item.unique_id !== req.params.id);
      user.save();
      res.redirect('/');
  })
  /*********************************** main-routes *************************************************/

 /************  middle-ware to check past-authentication ************************/

  function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
       return res.redirect('/')
    }
    next()
 }
 function checkAuthenticated(req,res,next){
    if(!req.isAuthenticated()){
       return res.redirect('/register');
    }
    next()
 }

 /************  middle-ware to check authentication ************************/
 

/************ express-server **********/

app.listen(process.env.PORT || 3000,()=> console.log("listening at port 3000"));

/************ express-server ***********/
