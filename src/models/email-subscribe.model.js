import mongoose, { Schema } from "mongoose";

const EmailSubscriptionSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const emailSubscription = mongoose.model(
  "emailSubsciption",
  EmailSubscriptionSchema,
);
