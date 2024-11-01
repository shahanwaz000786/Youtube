const express = require("express");
const { default: mongoose } = require("mongoose");
const app = express();
require("dotenv").config();
const userRoute = require("./routes/user");
const videoRoute = require("./routes/video");
const commentRoute = require("./routes/comment");

const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

// moongoose
//   .connect(process.env.MONGO_URI)
//   .then((res) => {
//     console.log("connected with database...");
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// Connect to the database
const connectWithDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("Connected to database...");
  } catch (error) {
    console.log("Database connection error:", error);
  }
};

// Middleware
app.use(bodyParser.json()); // Parses incoming JSON requests
app.use(
  fileUpload({
    useTempFiles: true,
    // tempFileDir: "/tmp/", // Uncomment if you need a custom temp file directory
  })
);

// Register Routes
app.use("/user", userRoute);
app.use("/video", videoRoute);
app.use("/comment", commentRoute);

// Start the database connection
connectWithDatabase();

// Export the app instance
module.exports = app;
