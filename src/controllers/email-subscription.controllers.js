import { emailSubscription } from "../models/email-subscribe.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { tryCatch } from "../utils/tryCatch.js";

// Express endpoint to serve the jobs
export const subscribeEmail = tryCatch(async (req, res) => {
    const { email } = req.body;
    if (!email) res.status(400).json({ status: 400, success: false, message: "Email is required!" });

    const subscribedEmail = await emailSubscription.create({ email });
    return res.status(201).json(new ApiResponse(201, "Job created successfully", subscribedEmail));
});