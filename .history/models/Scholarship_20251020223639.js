import mongoose from 'mongoose';

const scholarshiipSchema=new mongoose.Schema({
    student:{
        type: mongoose.Schema.Types.ObjectId,
        