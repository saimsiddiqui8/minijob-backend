import mongoose, { Schema } from "mongoose";

const JobSchema = new Schema({
    id: {
        type: String,
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    careerLevel: {
        type: String,
        // enum: ["Intermediate", "Senior"],
        required: true,
    },
    category: {
        type: String,
        required: true
    },
    tags: {
        type: String,
        required: true
    },
    jobType: {
        type: String,
        // enum: ["Full-time", "Part-time", "Remote"],
        default: "Full-time",
        required: true
    },
    company: {
        type: String,
        required: true
    },
    language: {
        type: String,
        enum: ["English", "German"],
        required: true
    },
    wages: {
        type: String,
        required: true
    },
    skills: {
        type: String,
        required: true
    },
    languageLevel: {
        type: String,
        required: true
    },
    applyNow: {
        type: String,
        required: true
    },
    salaryFrequency: {
        type: String,
        // enum: ["Hour", "Week", "Month", "Year"],
        default: "Month",
        required: true
    },
    location: {
        city: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: true
    },

}, {
    timestamps: true
}
)
JobSchema.pre('save', function(next) {
    if (this.applyNow) {
        const match = this.applyNow.match(/\/job\/(\d+)\?/);
        if (match) {
            this.id = match[1];
        }
    }
    next();
});

export const Job = mongoose.model("Job", JobSchema);