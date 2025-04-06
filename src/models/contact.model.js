// models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    whatsapp: { type: String, required: true },
    city: { type: String, required: true },
    jobType: { type: String, required: true },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const contact = mongoose.model('Contact', ContactSchema);
