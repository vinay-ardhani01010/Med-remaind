const mongoose = require('mongoose');
const schema = mongoose.Schema;
const shortId = require('shortid');
const userSchema = new schema({
    username : {
        type : String,
        required : true,
        text : true
    },
    whatsapp : {
        type : Number,
        required : true
    },
    password : {
        type : String,
        required : true
    },
    remainders : [{
        cron_expression : String,
        medName : String,
        imgUrl : String,
        isSheduled : Boolean,
        unique_id : {
            type : String,
            default : shortId.generate
        },
        time : String,
        weekday : String
    }]
       
    
})
var  User_db = mongoose.model('users-new',userSchema);
module.exports = User_db;