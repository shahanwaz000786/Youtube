const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    channelName: { type: String, require: true },
    email: { type: String, require: true },
    phone: { type: String, require: true },
    password: { type: String, require: true },
    logoUrl: { type: String, require: true },
    logoId: { type: String, require: true },
    subscribers: { type: Number, default: 0 },
    subscriberBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subscribedChannels: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
