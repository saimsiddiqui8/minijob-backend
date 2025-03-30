import mongoose, { Schema } from "mongoose";

const JobSchema = new Schema({
  guid: {
    type: String,
  },
  referencenumber: {
    type: String,
  },
  url: {
    type: String,
  },
  title: {
    type: String,
  },
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  date_updated: {
    type: Date,
  },
  cpc: {
    type: Number,
    default: 0.0,
  },
  currency: {
    type: String,
  },
  company: {
    type: String,
  },
  jobtype: {
    type: String,
  },
  description: {
    type: String,
  },
});

export const Job = mongoose.model("Job", JobSchema);
