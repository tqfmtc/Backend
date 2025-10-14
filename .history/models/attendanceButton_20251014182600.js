import mongoose from "mongoose";

const attendanceButtonSchema = new mongoose.Schema({
  tutor: {
    type: mongoose.Schema.Types.ObjectId,