import { Job } from "../models/jobs.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { notFound } from "../utils/notFound.js";
import { tryCatch } from "../utils/tryCatch.js";
import { validateRequiredFields } from "../utils/validations.js";
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import Redis from 'redis';
import cron from 'node-cron';
import axios from "axios";

const client = Redis.createClient({
    password: 'kS8s3hOQQmd3hzGtu6tZB9OWevCWBqbq',
    socket: {
        host: 'redis-12205.c265.us-east-1-2.ec2.redns.redis-cloud.com',
        port: 12205
    }
});

// Connect to Redis
// client.connect()
//     .then(() => console.log('Connected to Redis!'))
//     .catch(console.error);

// // Log if connected
// client.on('connect', () => {
//     console.log('Redis client connected successfully.');
// });

// // Handle any errors
// client.on('error', (err) => {
//     console.error('Redis connection error:', err);
// });

export const getAllJobs = tryCatch(async (req, res) => {
    const jobs = await Job.find().sort({ createdAt: -1 });
    if (!jobs || jobs.length === 0) {
        return res.status(404).json({ status: 404, success: false, message: "No Jobs Found" })
    }
    return res.status(200).json(
        new ApiResponse(200, "", jobs)
    )
})

export const searchJob = tryCatch(async (req, res) => {
    const { search_string, location, limit } = req.query;
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5IjoiREUiLCJwYXJ0bmVyX2lkIjoiNTgzIn0.uMINy5EYPYPlilavTBviTHwRydGP-NdTEwKUQ-Q2nVg';
    const apiUrl = `https://de.jooble.org/real-time-search-api/job/search?search_string=${encodeURIComponent(search_string)}&location=${encodeURIComponent(location)}&limit=${limit}`;

    try {
        const fetch = await import('node-fetch').then(module => module.default);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'X-TOKEN': token
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
})




export const getJobById = tryCatch(async (req, res) => {
    const id = req.params.id;
    console.log(id)
    const job = await Job.findById(id);
    if (!job) {
        return res.status(404).json({ status: 404, success: false, message: "Job not found" });
    }
    return res.status(200).json(new ApiResponse(200, "", job));
});

export const createJob = tryCatch(async (req, res) => {
    const { title, company, wages, careerLevel, category, jobType, skills, languageLevel, applyNow, salaryFrequency, location, description, createdBy, language } = req.body;

    validateRequiredFields([title, company, wages, careerLevel, category, jobType, skills, languageLevel, applyNow, salaryFrequency, location, description, createdBy, language], res);

    const newJob = await Job.create({ title, company, wages, careerLevel, category, jobType, skills, languageLevel, applyNow, salaryFrequency, location, description, createdBy, language });
    return res.status(201).json(new ApiResponse(201, "Job created successfully", newJob));
});

export const toggleActiveStatus = tryCatch(async (req, res) => {
    const { jobID } = req.params;

    const job = await Job.findById(jobID);
    notFound(job, res);

    job.active = !job.active; // Toggle active status
    await job.save();

    return res.status(200).json({
        status: 200,
        success: true,
        message: job.active ? "Job activated successfully" : "Job deactivated successfully",
    });
});

export const updateJob = tryCatch(async (req, res) => {
    const jobId = req.params.id;
    const { title, company, salaryRange, salaryFrequency, jobType, location, description, language } = req.body;
    const updatedJob = await Job.findByIdAndUpdate(jobId, { title, company, salaryRange, salaryFrequency, jobType, location, description, language }, { new: true });
    if (!updatedJob) {
        return res.status(404).json({ status: 404, success: false, message: "Job not found" });
    }
    return res.status(200).json(new ApiResponse(200, "Job updated successfully", updatedJob));
});

export const deleteJob = tryCatch(async (req, res) => {
    const jobId = req.params.id;
    const deletedJob = await Job.findByIdAndDelete(jobId);
    if (!deletedJob) {
        return res.status(404).json({ status: 404, success: false, message: "Job not found" });
    }
    return res.status(200).json(new ApiResponse(200, "Job deleted successfully"));
});

export const getJobsByFilter = tryCatch(async (req, res) => {
    // Extract query parameters
    const { keyword, location, careerLevel, category } = req.query;

    // Construct the query object
    let query = {};

    if (keyword) {
        // Use regular expression for case-insensitive partial matching
        query.title = { $regex: keyword, $options: 'i' };
    }

    if (location && location !== 'Location') {
        query['location.city'] = { $regex: location, $options: 'i' };
    }


    if (careerLevel && careerLevel !== 'Career Level') {
        query.careerLevel = careerLevel;
    }
    if (category && category !== 'Category') {
        query.category = category;
    }

    // Fetch jobs based on the constructed query
    const jobs = await Job.find(query).sort({ createdAt: -1 });

    if (!jobs || jobs.length === 0) {
        return res.status(404).json({ status: 404, success: false, message: "No Jobs Found" });
    }

    return res.status(200).json(
        new ApiResponse(200, "", jobs)
    );
});

const feedUrl = 'https://feed.stepstone.de/partner/files/FD6E3D39-9567-4371-AF2F-4C2EA060ABE0/638D844C-A648-4FCF-94B2-BEB217B0C197';

let cachedJobs = [];

// Function to fetch and cache jobs from Stepstone feed
const fetchJobs = async () => {
    try {
        console.log('Fetching jobs...');
        const { data: xmlData } = await axios.get(feedUrl, { headers: { 'Content-Type': 'application/xml' } });
        const parser = new XMLParser();
        const result = parser.parse(xmlData);
        cachedJobs = result.jobs.job;
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
    }
};

// Schedule the cron job to run every hour
cron.schedule('0 */12 * * *', () => {
    fetchJobs();
});

// Initial fetch on server start
fetchJobs();

// Express endpoint to serve the jobs
export const getStepstoneJobs = tryCatch(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const start = (page - 1) * limit;
    const end = page * limit;

    if (cachedJobs.length === 0) {
        await fetchJobs();
    }
    const paginatedJobs = cachedJobs.slice(start, end);
    const builder = new XMLBuilder();
    const xmlChunk = builder.build({ jobs: { job: paginatedJobs } });

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xmlChunk);
});