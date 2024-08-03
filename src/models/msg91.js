const axios = require('axios');
const cron = require('node-cron');
const mongoose = require('mongoose');
const { User, StudentDates } = require('./register');
const connection = require("../db/connection");

require('dotenv').config();

const msg91ApiKey = process.env.MSG91_API_KEY;
const msg91SenderId = process.env.MSG91_SENDER_ID;

// Function to send SMS notifications
const sendSmsToOwner = async (phoneNumber, message) => {
  try {
    const formattedPhoneNumber = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;
    const url = `https://api.msg91.com/api/v2/sendsms`;

    const response = await axios.post(url, {
      sender: msg91SenderId,
      route: 4, // Use transactional route
      country: 91, // Assuming sending SMS to India
      sms: [
        {
          message: message,
          to: [formattedPhoneNumber]
        }
      ]
    }, {
      headers: {
        'authkey': msg91ApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.type === 'success') {
      console.log(`SMS sent to owner (${formattedPhoneNumber}): ${message}`);
    } else {
      console.error(`Failed to send SMS to ${phoneNumber}:`, response.data);
    }
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error.message);
  }
};

// Function to schedule daily SMS notifications
const scheduleDailyNotifications = async () => {
  try {
    console.log("Started the SMS service..");
    // Connect to the main database
    await connection.connectToDatabase(process.env.STR);
    console.log("Connected to the main database.");

    // Fetch all owners from the main application's database
    const owners = await User.find({}).exec();
    console.log(`Fetched ${owners.length} owners from main database.`);

    // Process each owner asynchronously
    await Promise.all(owners.map(async (owner) => {
      try {
        // Connect to the owner's database dynamically
        await mongoose.disconnect(); // Disconnect from previous database
        await mongoose.connect(owner.connstring, {
          serverSelectionTimeoutMS: 30000, // 30 seconds timeout
          socketTimeoutMS: 45000,
        });
        console.log(`Connected to owner's database (${owner.connstring})`);

        // Get today's date in local timezone (GMT+5:30)
        const today = new Date();
        const localMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const timezoneOffset = localMidnight.getTimezoneOffset() * 60000; // Convert offset to milliseconds
        const utcMidnight = new Date(localMidnight.getTime() - timezoneOffset);

        console.log("Today's date (local midnight):", utcMidnight.toISOString());

        // Find students whose end admission date is today
        const students = await StudentDates.find({ EAddmissionDate: utcMidnight }).exec();
        console.log(`Found ${students.length} students with admission ending today.`);

        students.forEach(student => {
          console.log(`Student ID: ${student.ID}, Name: ${student.Name}`);
        });

        // Process each student and send SMS notifications
        await Promise.all(students.map(async (student) => {
          try {
            const message = `Your student ID ${student.ID}, name ${student.Name}, admission dates (${student.SAddmissionDate} - ${student.EAddmissionDate}), ends today.`;
            const formattedPhoneNumber = owner.mobno.toString().startsWith('+') ? owner.mobno.toString() : `+${owner.mobno.toString()}`;
            console.log(`Sending SMS to owner (${formattedPhoneNumber}): ${message}`);
            await sendSmsToOwner(formattedPhoneNumber, message);
          } catch (error) {
            console.error(`Error sending SMS to owner (${formattedPhoneNumber}):`, error);
          }
        }));

        // Disconnect from owner's database
        await mongoose.disconnect();
        console.log(`Disconnected from owner's database (${owner.connstring})`);

      } catch (error) {
        console.error(`Error processing owner (${owner.connstring}):`, error);
        // Handle specific error scenarios (reconnect, retry, etc.) based on your application's requirements
      }
    }));

    // Disconnect from the main database
    await mongoose.disconnect();
    console.log("Disconnected from the main database.");

  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
};

// Initialize scheduleDailyNotifications when server starts
/*
cron.schedule('0 0 * * *', () => {
  scheduleDailyNotifications();
  console.log("Scheduled task executed at midnight");
});
*/
 scheduleDailyNotifications();
module.exports = {
  sendSmsToOwner,
};
