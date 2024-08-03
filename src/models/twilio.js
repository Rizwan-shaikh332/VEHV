const twilio = require('twilio');
const mongoose = require('mongoose');
const { User, StudentDates } = require('./register');
const connection = require("../db/connection");

require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = new twilio(accountSid, authToken);

// Function to send SMS notifications
const sendSmsToOwner = async (phoneNumber, message) => {
  try {
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    await client.messages.create({
      body: message,
      to: formattedPhoneNumber,
      from: twilioPhoneNumber,
    });
    console.log(`SMS sent to owner (${formattedPhoneNumber}): ${message}`);
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error.message);
    if (error.code === 21408) {
      console.error(`Permission to send an SMS has not been enabled for the region indicated by the 'To' number: ${phoneNumber}. Please enable the region in your Twilio account.`);
    } else if (error.code === 21211) {
      console.error(`Invalid 'To' Phone Number: ${phoneNumber}. Ensure the number is in E.164 format.`);
    }
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

        // Build the message with all students' information
        if (students.length > 0) {
          let message = `Dear ${owner.name},

This is to inform you that the admission period for the following students is ending today:\n\n`;

          students.forEach(student => {
            message += `- Student ID: ${student.ID}, Name: ${student.Name}, Admission Dates: ${student.SAddmissionDate.toISOString().slice(0, 10)} - ${student.EAddmissionDate.toISOString().slice(0, 10)}\n`;
          });

          message += `\nPlease take any necessary actions regarding their enrollment status.`;

          const formattedPhoneNumber = owner.mobno.toString().startsWith('+') ? owner.mobno.toString() : `+${owner.mobno.toString()}`;
          console.log(`Sending SMS to owner (${formattedPhoneNumber}): ${message}`);
          await sendSmsToOwner(formattedPhoneNumber, message);
        } else {
          console.log(`No students found with admission ending today for owner (${owner.connstring}).`);
        }

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
