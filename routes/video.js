const express = require("express");
const Router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const jwt = require("jsonwebtoken");
require("dotenv").config;
const cloudinary = require("cloudinary").v2;
const Video = require("../models/Video");
const mongoose = require("mongoose");

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

Router.post("/upload", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = await jwt.verify(token, process.env.JWT_SECRET);
    // console.log(user);
    // console.log(req.body);
    // console.log(req.files.thumbnail);
    // console.log(req.files.video);
    const uploadVideo = await cloudinary.uploader.upload(
      req.files.video.tempFilePath,
      { resource_type: "video" }
    );
    const uploadThumbnail = await cloudinary.uploader.upload(
      req.files.thumbnail.tempFilePath
    );

    const newVideo = new Video({
      _id: new mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description,
      user_id: user._id,
      vidoUrl: uploadVideo.secure_url,
      vidoeId: uploadVideo.public_id,
      thumbnailUrl: uploadThumbnail.secure_url,
      thumnailId: uploadThumbnail.public_id,
      category: req.body.category,
      tags: req.body.tags.split(","),
    });

    const newUploadedVideoData = await newVideo.save();
    res.status(200).json({
      newVideo: newUploadedVideoData,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err,
    });
  }
});

//update video detail
Router.put("/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.JWT_SECRET
    );

    const videoId = req.params.videoId; // Access the 'videoId' parameter from the URL
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        error: "Video not found.",
      });
    }

    if (video.user_id.toString() === verifiedUser._id.toString()) {
      // Check if files are provided in the request
      if (req.files && req.files.thumbnail) {
        // Delete old thumbnail and upload a new one
        await cloudinary.uploader.destroy(video.thumbnailId);

        const updatedThumbnail = await cloudinary.uploader.upload(
          req.files.thumbnail.tempFilePath
        );

        // Update video details including thumbnail
        const updatedData = {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags.split(","),
          thumbnailUrl: updatedThumbnail.secure_url,
          thumbnailId: updatedThumbnail.public_id,
        };

        const updatedVideoDetail = await Video.findByIdAndUpdate(
          videoId,
          updatedData,
          { new: true }
        );

        res.status(200).json({
          updatedVideo: updatedVideoDetail,
        });
      } else {
        // Update video details without changing the thumbnail
        const updatedData = {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags.split(","),
        };

        const updatedVideoDetail = await Video.findByIdAndUpdate(
          videoId,
          updatedData,
          { new: true }
        );

        res.status(200).json({
          updatedVideo: updatedVideoDetail,
        });
      }
    } else {
      return res.status(403).json({
        error: "You do not have permission to update this video.",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

//Delete api
Router.delete("/:videoId", checkAuth, async (req, res) => {
  try {
    // Extract and verify token
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }
    const verifiedUser = await jwt.verify(token, process.env.JWT_SECRET);

    // Find the video by ID
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    // Check if the authenticated user is the owner of the video
    if (video.user_id.toString() === verifiedUser._id.toString()) {
      await cloudinary.uploader.destroy(video.vidoeId, {
        resource_type: "video",
      });
      await cloudinary.uploader.destroy(video.thumnailId);
      const deletedResponse = Video.findByIdAndDelete(req.params.videoId);

      res.status(200).json({ deletedResponse: deletedResponse });
    } else {
      return res.status(403).json({ error: "Unauthorized action" });
    }
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(503).json({ error: err.message });
  }
});

//like api
Router.put("/like/:videoId", checkAuth, async (req, res) => {
  try {
    // Extract token from headers
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    // Verify the token
    const verifiedUser = await jwt.verify(token, process.env.JWT_SECRET);

    // Extract the videoId from the request parameters
    const videoId = req.params.videoId;

    // Find the video using the videoId
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    // Check if the user has already liked the video
    if (video.likedBy.includes(verifiedUser._id)) {
      return res.status(400).json({
        error: "You have already liked this video.",
      });
    }

    // If the user has disliked the video, remove the dislike
    if (video.dislikedBy.includes(verifiedUser._id)) {
      video.dislikes -= 1;
      video.dislikedBy = video.dislikedBy.filter(
        (userId) => userId.toString() !== verifiedUser._id.toString()
      );
    }

    // Update the likes count and add the user to the likedBy array
    video.likes += 1;
    video.likedBy.push(verifiedUser._id);

    // Save the updated video document
    await video.save();

    res.status(200).json({
      msg: "Video liked successfully.",
      video, // Optionally return the updated video details
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message, // Provide a clear error message
    });
  }
});

Router.put("/dislike/:videoId", checkAuth, async (req, res) => {
  try {
    // Extract token from headers
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    // Verify the token
    const verifiedUser = await jwt.verify(token, process.env.JWT_SECRET);

    // Extract the videoId from the request parameters
    const videoId = req.params.videoId;

    // Find the video using the videoId
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: "Video not found." });
    }

    // Check if the user has already disliked the video
    if (video.dislikedBy.includes(verifiedUser._id)) {
      return res.status(400).json({
        error: "You have already disliked this video.",
      });
    }

    // If the user has liked the video, remove the like
    if (video.likedBy.includes(verifiedUser._id)) {
      video.likes -= 1;
      video.likedBy = video.likedBy.filter(
        (userId) => userId.toString() !== verifiedUser._id.toString()
      );
    }

    // Update the dislikes count and add the user to the dislikedBy array
    video.dislikes += 1;
    video.dislikedBy.push(verifiedUser._id);

    // Save the updated video document
    await video.save();

    res.status(200).json({
      msg: "Video disliked successfully.",
      video, // Optionally return the updated video details
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

// views api
Router.put("/views/:videoId", async (req, res) => {
  try {
    // Find the video by ID
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Increment the view count and save
    video.views += 1;
    await video.save();

    // Send success response with updated view count
    res.status(200).json({
      message: "View count incremented successfully",
      views: video.views,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = Router;
