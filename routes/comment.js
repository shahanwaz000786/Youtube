const express = require("express");
const Router = express.Router();
const Comment = require("../models/Comment");
const checkAuth = require("../middleware/checkAuth");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();

Router.post("/new-comment/:videoId", checkAuth, async (req, res) => {
  try {
    // Verify the user from the token
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.JWT_SECRET
    );

    // Create a new comment with proper ID generation
    const newComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      videoId: req.params.videoId,
      userId: verifiedUser._id,
      commentText: req.body.commentText,
    });

    // Save the new comment to the database
    const comment = await newComment.save();
    res.status(200).json({
      msg: "Comment added successfully",
      comment,
    });
  } catch (err) {
    console.error("An error occurred:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

//get all comment for any video
Router.get("/:videoId", async (req, res) => {
  try {
    const comments = await Comment.find({
      videoId: req.params.videoId,
    }).populate("userId", "channelName logoUrl"); // Assuming userId is correctly referenced

    if (!comments || comments.length === 0) {
      return res
        .status(404)
        .json({ message: "No comments found for this video." });
    }

    res.status(200).json({
      commentList: comments,
    });
  } catch (err) {
    console.error("An error occurred while fetching comments:", err);
    res.status(500).json({
      error: "Failed to fetch comments. Please try again later.",
    });
  }
});

// update comment
Router.put("/:commentId", checkAuth, async (req, res) => {
  try {
    // Verify the token and get user info
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);

    // Find the comment by ID
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the logged-in user is the one who made the comment
    if (comment.userId.toString() !== verifiedUser._id) {
      return res
        .status(403)
        .json({ error: "You can only edit your own comments" });
    }

    // Update the comment text
    comment.commentText = req.body.commentText || comment.commentText;
    const updatedComment = await comment.save();

    // Send the updated comment in the response
    res.status(200).json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (err) {
    console.error("An error occurred while updating the comment:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

//delete comment
Router.delete("/:commentId", checkAuth, async (req, res) => {
  try {
    // Verify the token and get user info
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);

    // Find the comment by ID
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the logged-in user is the one who made the comment
    if (comment.userId.toString() !== verifiedUser._id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own comments" });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(req.params.commentId);

    // Send response indicating successful deletion
    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.error("An error occurred while deleting the comment:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = Router;
