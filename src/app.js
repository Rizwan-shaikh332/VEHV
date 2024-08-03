require('dotenv').config();
const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const moment = require("moment");
const multer = require('multer');
const cookieParser = require("cookie-parser");
const session = require("express-session");
app.use(express.static("public"));

const { sendSmsToOwner, scheduleDailyNotifications} = require('./models/twilio');

/////////////////////////////////////
const connection = require("./db/connection");
/////////////////////////////////////

require("./db/connection");

const {  OwnerDetails , vehicalDetails  } = require("./models/register");
const { User} = require("./models/user");

const port = process.env.PORT || 3000;

const static_path = path.join(__dirname, "../public");
const templates_path = path.join(__dirname, "../templates/views");

app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views", templates_path);

hbs.registerHelper('formatDate', function(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "thisisrandomstuff",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 100 * 60 * 1000, // 100 minutes
    },
  })
);

//middleware
var sessionChecker = (req, res, next) => {
  console.log("inside the middleware1");
  if (req.session.name || req.cookies.user_sid) {
    next();
  } else {
    res.redirect("/index");
  }
};

app.get("/", (req, res) => {
  res.redirect("/index");
});


app.get("/index", (req, res) => {
  res.render("index");
});

const authenticateAndLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Authenticate the user
    console.log(req.body);
    console.log(`Looking for user: ${username}`);
    const user = await User.findOne({ username });
    console.log("User found:", user);
    req.session.connstring = user.connstring;
    req.session.name = user.name;
    req.session.cname = user.cname;
    req.session.Photo = user.Photo;
    req.session.BusinessDetails = {
      BusinessName: user.BusinessName,
      BusinessAddress: user.BusinessAddress,
      MobileNo: user.mobno
  };
   
    if (!user) {
      console.log("User not found");
      throw new Error('User not found');
    }
    if (user.password !== password) {
      console.log("Invalid credentials");
      throw new Error('Invalid credentials');
    }
    res.redirect('/render');
  } catch (err) {
    // Authentication failed, render error message
    console.error("Error during authentication:", err);
    res.render('index', { error: err.message });
  }
};

// Route for handling login requests
app.post('/login', async (req, res) => {
  try {
      console.log("Accessing the login endpoint!!");
      await connection.connectToDatabase(process.env.STR);
      
      await authenticateAndLogin(req, res);
      console.log("Authentication successful!");
  } catch (error) {
      console.error("Error during login:", error);
      res.render('index', { error: "please contact Developers !!" });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).send('Could not log out. Please try again.');
    } else {
      res.clearCookie('connect.sid');
      console.log('User logged out successfully');
      res.redirect('/');
    }
  });
});

app.get("/render", sessionChecker, async (req, res) => {
  console.log("Accessed /render route");
  const cname = req.session.cname;
  const name = req.session.name;
  const { Photo } = req.session;
  const base64Photo = Photo ? Buffer.from(Photo.data).toString('base64') : null;
     console.log(cname);
     console.log(name);
     console.log(Photo);
    

  try {
     const connstring = req.session.connstring;
     
    console.log("User connstring:", connstring);
    // Specify the new connection string dynamically
    await connection.connectToDatabase(connstring);

    // Access the current connection string
    console.log("Current connection string:", connection.getConnectionString());
    
    // Render your view or perform other actions
    res.render("admin", { name, cname, base64Photo });
  } catch (error) {
    console.error("Connection failed:", error);
    // Handle the error or render an error page
    res.status(500).send("Internal Server Error");
  }
});

////////////////////////////////////////////
app.get("/admin", (req, res) => {
  res.render("admin");
});

hbs.registerHelper("formatDate", function (date) {
  return moment(date).format("DD-MM-YYYY");
});
app.get("/register", async (req, res) => {
  try {
    const totalno = await OwnerDetails.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const totalStudentCount = totalno.length > 0 ? totalno[0].totalCount : 0;
    const plus1 = totalStudentCount + 1;

    // Check if the request is an AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ plus1 });
    } else {
      res.render("register", { plus1 });
    }
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Server Error");
  }
});



app.use(express.json());
app.post('/fetch-user', async (req, res) => {
  try {
    console.log('Request Body:', req.body);

    const { userid } = req.body;

    console.log(`Querying with ID: ${userid}`);
    let ID = userid ;
    const user = await OwnerDetails.findOne({ ID });
    console.log('Fetched User:', user);

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});







app.get("/filter/askMonth", (req, res) => {
  res.render("askMonth");
});

app.get("/view", (req, res) => {
  res.render("view");
});
app.get("/update", (req, res) => {
  res.render("update");
});
app.get("/vupdate", (req, res) => {
  res.render("vupdate");
});
app.get("/vehicalreg", (req, res) => {
  res.render("vehicalreg");
});
app.get("/More", (req, res) => {
  res.render("More");
});
app.get("/AllData", (req, res) => {
  res.render("AllData");
});
app.get("/searchData", (req, res) => {
  res.render("searchData");
});
app.get("/delete", (rqs, res) => {
  res.render("delete");
});
app.get("/signup", (rqs, res) => {
  res.render("signup");
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////
hbs.registerHelper("json", function (context) {
  return new hbs.SafeString(JSON.stringify(context));
});

app.get("/dashboard", async (req, res) => {

  console.log("Dashborad called");
  const totalno = await OwnerDetails.aggregate([
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
      },
    },
  ]);

  const totalVHno = await vehicalDetails.aggregate([
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
      },
    },
  ]);
  const totalOwnerCount = totalno.length > 0 ? totalno[0].totalCount : 0;
  const totalVehicalCount = totalVHno.length > 0 ? totalVHno[0].totalCount : 0;
  console.log(totalOwnerCount,"|",totalVehicalCount);
  res.render("dashboard", {totalOwnerCount,totalVehicalCount });
});

/*app.get("/dashboard", async (req, res) => {
  try {
    const totalno = await Student.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Months are zero-based in JavaScript
    const currentYear = today.getFullYear();

    const monthlyStudentCount = await Student.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: "$SAddmissionDate" }, currentMonth] },
              { $eq: [{ $year: "$SAddmissionDate" }, currentYear] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
        },
      },
    ]);

    // Aggregation for doughnut chart based on LLRType
    const doughnutChartData = await Student.aggregate([
      {
        $group: {
          _id: "$Type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Aggregation for bar chart based on monthly registrations
    const barChartData = await Student.aggregate([
      {
        $project: {
          month: { $month: "$SAddmissionDate" },
          year: { $year: "$SAddmissionDate" },
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }, // Sorting by year and month
    ]);

    const totalStudentCount = totalno.length > 0 ? totalno[0].totalCount : 0;
    const totalStudentsCurrentMonth = monthlyStudentCount.length > 0 ? monthlyStudentCount[0].totalCount : 0;
    const doughnutLabels = doughnutChartData.map((entry) => entry._id);
    const doughnutValues = doughnutChartData.map((entry) => entry.count);

    // Preparing data for bar chart
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const barLabels = barChartData
      .filter((item) => item._id.month !== null && item._id.year !== null)
      .map((item) => {
        const monthName = monthNames[item._id.month - 1]; // Adjust month index to 0-based
        return `${monthName} ${item._id.year}`;
      });

    const barValues = barChartData
      .filter((item) => item._id.month !== null && item._id.year !== null)
      .map((item) => item.count);

    console.log(`Total Number of Students: ${totalStudentCount}`);
    console.log(`Total Number of Students of current month: ${totalStudentsCurrentMonth}`);
    console.log("doughnutlabels:", doughnutLabels);
    console.log("doughnutValues: ", doughnutValues);
    console.log("barLabels:", barLabels);
    console.log("barValues:", barValues);

    // Passing both datasets to the template
    res.render("dashboard", {
      totalStudentCount,
      totalStudentsCurrentMonth,
      doughnutLabels,
      doughnutValues, // Data for doughnut chart
      barLabels,
      barValues, // Data for bar chart
    });
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Server Error");
  }
});

// Define the length helper
hbs.registerHelper('length', function(array) {
  return array.length;
});

hbs.registerHelper('formatDate', function(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
});

hbs.registerHelper('isExpired', function(endDate) {
  return new Date(endDate) < new Date();
});

hbs.registerHelper('sortByDate', function(array) {
  // Sort by EAddmissionDate (expired first)
  array.sort(function(a, b) {
    return new Date(a.EAddmissionDate) - new Date(b.EAddmissionDate);
  });
  return array;
});
*/

app.get('/notifications', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight

    const SevenDaysLater = new Date(today);
    SevenDaysLater.setDate(today.getDate() + 7);

    console.log("Today's date (midnight):", today);
    console.log("Seven days later date (midnight):", SevenDaysLater);

    // Helper function to format date as DD-MM-YYYY
    const formatDate = (date) => {
      return date.toLocaleDateString('en-GB').split('/').join('-');
    };

    // Fetch vehicle registration details with expiration dates within the next 7 days
    const upcomingExpirations = await vehicalDetails.find({
      $or: [
        { PUCvalid: { $gte: today, $lte: SevenDaysLater } },
        { Tax: { $gte: today, $lte: SevenDaysLater } },
        { Insurance: { $gte: today, $lte: SevenDaysLater } },
        { Permit: { $gte: today, $lte: SevenDaysLater } },
        { PTax: { $gte: today, $lte: SevenDaysLater } },
        { ETax: { $gte: today, $lte: SevenDaysLater } },
        { Fitness: { $gte: today, $lte: SevenDaysLater } }
      ]
    }).exec();

    // Fetch vehicle registration details with expiration dates already expired
    const expired = await vehicalDetails.find({
      $or: [
        { PUCvalid: { $lt: today } },
        { Tax: { $lt: today } },
        { Insurance: { $lt: today } },
        { Permit: { $lt: today } },
        { PTax: { $lt: today } },
        { ETax: { $lt: today } },
        { Fitness: { $lt: today } }
      ]
    }).exec();

    // Process upcoming expiration details
    const upcomingNotifications = upcomingExpirations.map(vehicle => {
      const expiringFields = [];
      if (vehicle.PUCvalid >= today && vehicle.PUCvalid <= SevenDaysLater) expiringFields.push(`PUC: ${formatDate(new Date(vehicle.PUCvalid))}`);
      if (vehicle.Tax >= today && vehicle.Tax <= SevenDaysLater) expiringFields.push(`Tax: ${formatDate(new Date(vehicle.Tax))}`);
      if (vehicle.Insurance >= today && vehicle.Insurance <= SevenDaysLater) expiringFields.push(`Insurance: ${formatDate(new Date(vehicle.Insurance))}`);
      if (vehicle.Permit >= today && vehicle.Permit <= SevenDaysLater) expiringFields.push(`Permit: ${formatDate(new Date(vehicle.Permit))}`);
      if (vehicle.PTax >= today && vehicle.PTax <= SevenDaysLater) expiringFields.push(`PTax: ${formatDate(new Date(vehicle.PTax))}`);
      if (vehicle.ETax >= today && vehicle.ETax <= SevenDaysLater) expiringFields.push(`ETax: ${formatDate(new Date(vehicle.ETax))}`);
      if (vehicle.Fitness >= today && vehicle.Fitness <= SevenDaysLater) expiringFields.push(`Fitness: ${formatDate(new Date(vehicle.Fitness))}`);

      return {
        vehicleNumber: vehicle.VhNo,
        owner: vehicle.Owner,
        MobNo : vehicle.MobNo,
        expiringFields: expiringFields.join(', ')
      };
    });

    // Process expired details
    const expiredNotifications = expired.map(vehicle => {
      const expiringFields = [];
      if (vehicle.PUCvalid < today) expiringFields.push(`PUC: ${formatDate(new Date(vehicle.PUCvalid))}`);
      if (vehicle.Tax < today) expiringFields.push(`Tax: ${formatDate(new Date(vehicle.Tax))}`);
      if (vehicle.Insurance < today) expiringFields.push(`Insurance: ${formatDate(new Date(vehicle.Insurance))}`);
      if (vehicle.Permit < today) expiringFields.push(`Permit: ${formatDate(new Date(vehicle.Permit))}`);
      if (vehicle.PTax < today) expiringFields.push(`PTax: ${formatDate(new Date(vehicle.PTax))}`);
      if (vehicle.ETax < today) expiringFields.push(`ETax: ${formatDate(new Date(vehicle.ETax))}`);
      if (vehicle.Fitness < today) expiringFields.push(`Fitness: ${formatDate(new Date(vehicle.Fitness))}`);

      return {
        vehicleNumber: vehicle.VhNo,
        owner: vehicle.Owner,
        MobNo : vehicle.MobNo,
        expiringFields: expiringFields.join(', ')
      };
    });

    // Log upcoming and expired data
    console.log("Upcoming Expirations:");
    console.log(upcomingNotifications);
    console.log("Expired:");
    console.log(expiredNotifications);

    // Render the notifications view with the processed data
    res.render('notifications', { 
      upcomingNotifications,
      expiredNotifications
    });

  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    res.status(500).send('Internal Server Error');
  }
});






////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/register", upload.single('photo'), async (req, res) => {
  try {
    console.log("Received POST request to /register");
    console.log("Request Body:", req.body);

    // Validate request body parameters
    const {
      ID,
      Name,
      MobNo,
      Address
      
    } = req.body;

    console.log("Extracted fields from request body:", {
      ID,
      Name,
      MobNo,
      Address
      
    });

    // Convert ID to integer
    const sid = parseInt(ID);
    if (isNaN(sid)) {
      throw new Error("Invalid ID format");
    }
    console.log("Parsed ID:", sid);

    // Convert the uploaded photo to a buffer
    let photoBuffer = null;
    if (req.file) {
      photoBuffer = req.file.buffer;
      console.log("Photo uploaded, size:", photoBuffer.length);
    } else {
      console.log("No photo uploaded");
    }

    // Create a new Student document
    const OwnerData = new OwnerDetails({
      ID: sid,
      Name: Name.toUpperCase(),
      MobNo: MobNo.toUpperCase(),
      Address: Address.toUpperCase()
  });

   

    console.log("Created Student document:", OwnerData);
    const registeredOwner = await OwnerData.save();
    console.log("registred Data : ",registeredOwner);
    
   
  } catch (error) {
    console.error("Error during registration:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(400).send(`Bad Request: ${error.message}`);
  }
});

app.use(express.json());
app.post('/fetch-veh', async (req, res) => {
  const { VhNo } = req.body;
  console.log(req.body);

  try {
    const vehicle = await vehicalDetails.findOne({ VhNo });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Example response with vehicle details
    res.status(200).json({
      Owner: vehicle.Owner,
      MobNo: vehicle.MobNo,
      PUCvalid: vehicle.PUCvalid,
      Insurance: vehicle.Insurance,
      Tax: vehicle.Tax,
      Permit: vehicle.Permit,
      PTax: vehicle.PTax,
      ETax: vehicle.ETax,
      Fitness: vehicle.Fitness,
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/search', async (req, res) => {
  const { q } = req.query;
  console.log('Search Query:', q);
  try {
    const regex = new RegExp(`^${q}`, 'i'); // Match sequentially from the start
    const owners = await OwnerDetails.find({
      Name: { $regex: regex }
    }).limit(10);
    console.log(owners.MobNo);
    console.log(req.session.MobNo);
    res.json(owners);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/registerVehical", upload.single('photo'), async (req, res) => {
  try {
    console.log("Received POST request to /register");
    console.log("Request Body:", req.body);

    const {
      VhNo,
      Owner,
      PUCvalid,
      Tax,
      Insurance,
      Permit,
      PTax,
      ETax,
      Fitness,
      ChasisNo
    } = req.body;

    console.log("Extracted fields from request body:", {
      VhNo,
      Owner,
      PUCvalid,
      Tax,
      Insurance,
      Permit,
      PTax,
      ETax,
      Fitness,
      ChasisNo
    });
    const totalno = await vehicalDetails.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const totalStudentCount = totalno.length > 0 ? totalno[0].totalCount : 0;
    const plus1 = totalStudentCount + 1;

    let photoBuffer = null;
    if (req.file) {
      photoBuffer = req.file.buffer;
      console.log("Photo uploaded, size:", photoBuffer.length);
    } else {
      console.log("No photo uploaded");
    }

    console.log("Owner name:", Owner);
    const ownerDetail = await OwnerDetails.findOne({ Name: Owner });
    if (!ownerDetail) {
      return res.status(404).send('Owner not found');
    }

    console.log(ownerDetail);
    const Ownerid = ownerDetail.ID;
    const mob = ownerDetail.MobNo ;
    console.log(mob);
   // const mobno = req.session.MobNo;
    const VehicalData = new vehicalDetails({
      ID : plus1,
      OwnerID : Ownerid, 
      VhNo : VhNo.toUpperCase(),
      Owner : Owner.toUpperCase(),
      MobNo : mob,
      PUCvalid,
      Tax,
      Insurance,
      Permit,
      PTax,
      ETax,
      Fitness,
      ChasisNo : ChasisNo.toUpperCase()
    });

    console.log("Created Vehicle document:", VehicalData);
    const registeredVehical = await VehicalData.save();
    console.log("Registered Vehicle:", registeredVehical);
    //res.status(201).send(registeredVehical);

  } catch (error) {
    console.error("Error during registration:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(400).send(`Bad Request: ${error.message}`);
  }
});



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/renew",(req, res)=>{
  res.render("renew");
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/viewUser", async (req, res) => {
  try {
    const data = await OwnerDetails.find(); // Fetch all data from MongoDB

    if (data.length > 0) {
      console.log(data);
     
      res.render("AllData", { data }); // Render the allData.hbs template with the retrieved data
    } else {
      console.log("No data found in the database");
      res.status(404).send("No data found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
app.get("/viewVehical", async (req, res) => {
  try {
    const data = await vehicalDetails.find(); // Fetch all data from MongoDB

    if (data.length > 0) {
      console.log(data);
     
      res.render("AllUser", { data }); // Render the allData.hbs template with the retrieved data
    } else {
      console.log("No data found in the database");
      res.status(404).send("No data found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/view", async (req, res) => {
  const { ID, MobNo } = req.body;

  try {
    let data;
    if (ID) {
      data = await Student.findOne({ ID });
    } else if (MobNo) {
      data = await Student.findOne({ MobNo });
    }

    if (data) {
      console.log(data);
      const businessDetails = req.session.BusinessDetails;
      // Convert photo buffer to base64-encoded string
      const photoBase64 = data.Photo ? data.Photo.toString('base64') : null;
      res.render("data", { data, photoBase64 , businessDetails: JSON.stringify(businessDetails) }); // Render the data.hbs template with the retrieved data
    } else {
      console.log(
        ID ? `No data found for ID: ${ID}` : `No data found for MobNo: ${MobNo}`
      );
      res.status(404).send("Data not found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/receipt",(req, res)=>{
  res.render("receipt");
});



app.post("/update", async (req, res) => {
  const { ReceiptID, } = req.body;

  try {
    let data;
    if (ReceiptID) {
      data = await StudentReceipt.findOne({ ReceiptID });
    } 

    if (data) {
      console.log(data); // Log the data retrieved from MongoDB
      res.render("newD", { data }); // Render the data.hbs template with the retrieved data
    } else {
      console.log(`No data found for ID: ${ReceiptID}`);
      res.status(404).send("Data not found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Server Error");
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// helpers/handlebars-helpers.js

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/submitform", async (req, res) => {
  try {
    const {
      
      userid,
      Name,
      MobNo,
      Address
    } = req.body;

    const ID = userid;
    console.log(ID);
    console.log("Requested Data:", req.body);
    const result1 = await OwnerDetails.findOneAndUpdate(
      { ID },
      {
        $set: {
          ID,
          Name: Name.toUpperCase(),
      MobNo: MobNo.toUpperCase(),
      Address: Address.toUpperCase()
        },
      },
      { new: true }
    );
    const OwnerID  = ID ;
    console.log( 'Owner ID :',OwnerID);
    const result2 = await vehicalDetails.findOneAndUpdate(
      { OwnerID },
      {
        $set: {

          Owner: Name.toUpperCase(),
          MobNo: MobNo.toUpperCase(),
        },
      },
      { new: true }
    );

    console.log(result1);
    console.log(result2);


    if (result1 && result2) {
      console.log("Data in Student");
      //res.redirect("back");
    } else {
      res.status(404).send(`Student with ID ${ID} not found`);
    }
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).send("Server Error");
  }
});



app.post("/submitveh", async (req, res) => {
  try {
    const {
      VhNo,
      NewPUCvalid,
      NewTax,
      NewInsurance,
      NewPermit,
      NewPTax,
      NewETax,
      NewFitness,
    } = req.body;

    console.log("Requested Data:", {
      VhNo,
      NewPUCvalid,
      NewTax,
      NewInsurance,
      NewPermit,
      NewPTax,
      NewETax,
      NewFitness
    });

    // Fetch the existing document
    const existingDoc = await vehicalDetails.findOne({ VhNo });
    console.log(existingDoc);

    if (!existingDoc) {
      return res.status(404).send({ message: "Vehicle not found" });
    }

    // Create an update object with conditionals
    const update = {
      PUCvalid: NewPUCvalid || existingDoc.PUCvalid,
      Tax: NewTax || existingDoc.Tax,
      Insurance: NewInsurance || existingDoc.Insurance,
      Permit: NewPermit || existingDoc.Permit,
      PTax: NewPTax || existingDoc.PTax,
      ETax: NewETax || existingDoc.ETax,
      Fitness: NewFitness || existingDoc.Fitness,
    };

    const result1 = await vehicalDetails.findOneAndUpdate(
      { VhNo },
      { $set: update },
      { new: true }
    );

    console.log("Updated Data:", result1);

   // res.status(200).send({ message: "Vehicle details updated successfully", data: result1 });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});







///////////////////////////////////////////////////////////////////////////////////////////

app.get("/searchData", async (req, res) => {
  try {
    console.log("Received GET request to /searchData");
    console.log("Request Query:", req.query);

    const month = req.query.searchMonth;
    console.log("Selected Month:", month);

    // Just send a response with the received month for now
    res.send(`Selected Month: ${month}`);
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).send("Internal Server Error");
  }
});
///////////////////////////////////////////////////////////////////////////////////////////




///////////////////////////////////////////////////////////////////////////////////////////
app.get("/askMonth", (req, res) => {
  res.render("askMonth");
});

app.get("/displayData", async (req, res) => {
  try {
    const { month } = req.query;

    let students;
    let formattedMonth;

    if (month) {
      // If a specific month is provided, filter students by that month
      const startDate = moment(month, "YYYY-MM").startOf("month").toDate();
      const endDate = moment(month, "YYYY-MM").endOf("month").toDate();

      console.log("Start Date:", startDate);
      console.log("End Date:", endDate);

      students = await Student.find({
        SAddmissionDate: { $gte: startDate, $lte: endDate },
      });

      // Format the selectedMonth to display the month name
      formattedMonth = moment(month, "YYYY-MM").format("MMMM");
      console.log("Filtered Students:", students);
    } else {
      // If no specific month is provided, fetch all students
      students = await Student.find({});
    }

    console.log("Final Students Array:", students);

    res.render("displayData", { students, selectedMonth: formattedMonth }); // Pass formattedMonth to the template
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).send("Internal Server Error");
  }
});





//////////////////////////////////////////////////////////////////////////////////////////////
app.post("/signup", upload.single('photo'), async (req, res) => {
  try {
    await connection.connectToDatabase("mongodb+srv://AbrarShaikh:Andy%40998@cpp.csyvxe0.mongodb.net/");
    console.log("Received POST request to /signup");
    console.log("Request Body:", req.body);

    // Validate request body parameters
    const {
      name,
      mobno,
      username,
      password,
      cname,
      connstring,
      BusinessName,
      BusinessAddress
    } = req.body;

    console.log("Extracted fields from request body:", {
      name,
      mobno,
      username,
      password,
      cname,
      connstring,
      BusinessName,
      BusinessAddress,
      Photo: req.file ? req.file.buffer.length : null
    });

    // Convert the uploaded photo to a buffer
    let photoBuffer = null;
    if (req.file) {
      photoBuffer = req.file.buffer;
      console.log("Photo uploaded, size:", photoBuffer.length);
    } else {
      console.log("No photo uploaded");
    }

    // Create a new User document
    const userData = new User({
      name,
      mobno,
      username,
      password,
      cname,
      connstring,
      BusinessName,
      BusinessAddress,
      Photo: photoBuffer,
    });

    console.log("Created User document:", userData);
    const registeredUser = await userData.save();
    console.log("User registered successfully:", registeredUser);
    
    // Respond with success message
    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error during registration:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(400).send(`Bad Request: ${error.message}`);
  }
});


///////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


