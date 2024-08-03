const mongoose = require("mongoose");
const moment = require('moment');
const bcrypt = require('bcryptjs');

const ownerSchema = new mongoose.Schema({
    ID: {
        type: Number,
        required: true,
        unique: true
    },
    Name: {
        type: String,
        required: true,
    },
    MobNo: {
        type: Number,
        required: true,
    },
    Address: {
        type: String,
        required: true
    }
});



const vehicalSchema = new mongoose.Schema({

    ID :{
        type : Number
    },
    OwnerID: {
        type: Number
    },

    VhNo: {
        type: String,
        required: true,
        unique: true
    },
    Owner: {
        type: String,
        required: true
    },
    MobNo :{
        type: Number
    },
    PUCvalid: {
        type: Date
    },
    Tax: {
        type: Date
    },
    Insurance: {
        type: Date
    },
    Permit: {
        type: Date
    },
    PTax: {
        type: Date
    },
    ETax: {
        type: Date
    },
    Fitness: {
        type: Date
    },
    ChasisNo: {
        type: String,
        unique: true
    }
});





const vehicalDetails = mongoose.model('Vehical', vehicalSchema);
const OwnerDetails = mongoose.model("Owner", ownerSchema);
module.exports = { OwnerDetails, vehicalDetails };