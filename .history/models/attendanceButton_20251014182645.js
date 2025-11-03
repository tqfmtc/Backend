import mongoose from "mongoose";

const attendanceButtonSchema = new mongoose.Schema({
  status:{status:Boolean,defualt: True}