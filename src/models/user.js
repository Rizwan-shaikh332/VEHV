const mongoose = require("mongoose");
const moment = require('moment');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
   
    name: {
        type:String
    },

    username: { type: String,
                required: true,
                unique: true 
            },
    password: { type: String,
                required: true
             },
    connstring: {
                type : String
    },
    mobno:{
        type:Number
    },
    cname : {
        type:String
    },
    BusinessName : {
        type : String
    },
    BusinessAddress: {
        type : String
    },
    Photo :{
        type:Buffer
    }    
});


const User = mongoose.model('user', userSchema);

module.exports ={User };