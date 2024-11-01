const express = require("express");
const Router = express.Router();
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const User = require("../models/User");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const checkAuth = require("../middleware/checkAuth");

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Signup Route
Router.post("/signup", async (req, res) => {
  try {
    const users = await User.find({ email: req.body.email });

    if (users.length > 0) {
      return res.status(500).json({ error: "Email already registered" });
    }

    const hashCode = await bcrypt.hash(req.body.password, 10);
    const uploadImage = await cloudinary.uploader.upload(
      req.files.logo.tempFilePath
    );

    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashCode,
      logoUrl: uploadImage.secure_url,
      logoId: uploadImage.public_id,
    });

    const user = await newUser.save();
    res.status(200).json({ newUser: user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error creating new user", details: err });
  }
});

// Login Route
Router.post("/login", async (req, res) => {
  try {
    const users = await User.find({ email: req.body.email });

    if (users.length === 0) {
      return res.status(500).json({ error: "This email is not registered." });
    }

    const isValid = await bcrypt.compare(req.body.password, users[0].password);

    if (!isValid) {
      return res.status(500).json({ error: "Invalid password." });
    }

    const token = jwt.sign(
      {
        _id: users[0]._id,
        channelName: users[0].channelName,
        email: users[0].email,
        phone: users[0].phone,
        logoId: users[0].logoId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.status(200).json({
      _id: users[0]._id,
      channelName: users[0].channelName,
      email: users[0].email,
      phone: users[0].phone,
      logoId: users[0].logoId,
      logoUrl: users[0].logoUrl,
      token: token,
      subscribers: users[0].subscribers,
      subscribedChannels: users[0].subscribedChannels,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong", details: err });
  }
});

//subscribe api
Router.put("/subscribe/:userBId", checkAuth, async (req, res) => {
  try {
    // Extract token from headers
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    // Verify the token
    const userA = await jwt.verify(token, process.env.JWT_SECRET);

    // Find the user to be subscribed to (userB)
    const userB = await User.findById(req.params.userBId);
    if (!userB) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already subscribed
    if (userB.subscriberBy.includes(userA._id)) {
      return res.status(400).json({ error: "Already subscribed" });
    }

    // Update userB's subscriber count and list
    userB.subscribers += 1;
    userB.subscriberBy.push(userA._id);
    await userB.save();

    // Update userA's subscribed channels list
    const userAFullInformation = await User.findById(userA._id);
    userAFullInformation.subscribedChannels.push(userB._id);
    await userAFullInformation.save();

    // Respond with success and updated user info
    res.status(200).json({
      message: "Subscribed successfully",
      userA: userAFullInformation,
      userB,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).json({ error: err.message });
  }
});

//unsubcribe api
Router.put("/unsubscribe/:userBId", checkAuth, async (req, res) => {
  try {
    // Extract token from headers
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    // Verify the token
    const userA = await jwt.verify(token, process.env.JWT_SECRET);

    // Find the user to be unsubscribed from (userB)
    const userB = await User.findById(req.params.userBId);
    if (!userB) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if not subscribed
    if (!userB.subscriberBy.includes(userA._id)) {
      return res.status(400).json({ error: "Not subscribed" });
    }

    // Update userB's subscriber count and list
    userB.subscribers = Math.max(0, userB.subscribers - 1);
    userB.subscriberBy = userB.subscriberBy.filter(
      (userId) => userId.toString() !== userA._id.toString()
    );
    await userB.save();

    // Update userA's subscribed channels list
    const userAFullInformation = await User.findById(userA._id);
    userAFullInformation.subscribedChannels =
      userAFullInformation.subscribedChannels.filter(
        (userId) => userId.toString() !== userB._id.toString()
      );
    await userAFullInformation.save();

    // Respond with success and updated user info
    res.status(200).json({
      message: "Unsubscribed successfully",
      userA: userAFullInformation,
      userB,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = Router;
