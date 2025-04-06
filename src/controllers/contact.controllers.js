import nodemailer from "nodemailer";
import axios from "axios";
import { contact } from "../models/contact.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { tryCatch } from "../utils/tryCatch.js";

// Express endpoint to serve the jobs
export const contactForm = tryCatch(async (req, res) => {
  const { name, email, whatsapp, city, jobType, message, recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ message: 'reCAPTCHA verification failed.' });
  }

  // Verify reCAPTCHA with Google
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
  const response = await axios.post(verifyUrl);

  if (!response.data.success) {
    return res.status(400).json({ message: 'reCAPTCHA validation failed.' });
  }

  // Save to MongoDB
  await contact.create({ name, email, whatsapp, city, jobType, message });

  // ✅ Create Nodemailer transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Compose email
  const mailOptions = {
    from: `"MinijobGermany" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // send to yourself
    subject: `📨 Contact form from ${name}`,
    html: `
      <h2>New Contact Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>WhatsApp:</strong> ${whatsapp}</p>
      <p><strong>City:</strong> ${city}</p>
      <p><strong>Job Type:</strong> ${jobType}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `
  };

  // ✅ Send email
  await transporter.sendMail(mailOptions);
  
  return res
    .status(200)
    .json(new ApiResponse(200, "Message sent successfully!"));
});
