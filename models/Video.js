const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    title: { type: String, require: true },
    description: { type: String, require: true },
    user_id: { type: String, require: true },
    vidoUrl: { type: String, require: true },
    vidoeId: { type: String, require: true },
    thumbnailUrl: { type: String, require: true },
    thumnailId: { type: String, require: true },
    category: { type: String, require: true },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
