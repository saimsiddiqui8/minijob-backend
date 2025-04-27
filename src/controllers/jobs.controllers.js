import { Job } from "../models/jobs.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { tryCatch } from "../utils/tryCatch.js";
import { validateRequiredFields } from "../utils/validations.js";
import { XMLBuilder } from "fast-xml-parser";
import axios from "axios";
import sax from "sax";
import mongoose from "mongoose";
const { SAXParser } = sax;

export const getAllJobs = tryCatch(async (req, res) => {
    const jobs = await Job.find().sort({ createdAt: -1 });
    if (!jobs || jobs.length === 0) {
        return res
            .status(404)
            .json({ status: 404, success: false, message: "No Jobs Found" });
    }
    return res.status(200).json(new ApiResponse(200, "", jobs));
});

export const getJobsByType = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const jobtype = req.query.jobtype;
    const city = req.query.city;
    if (
        ![
            "Part-time",
            "Full-time",
            "Part-time, Full-time",
            "Full-time, Part-time",
            "Internship",
            "Temporary, Full-time",
            "Temporary",
            "Temporary, Part-time",
            "Internship, Part-time",
            "Full-time, Internship",
        ].includes(jobtype)
    )
        return res
            .status(404)
            .json(new ApiResponse(404, "Invalid Job type"));

    const skip = (page - 1) * limit;

    const query = { jobtype };
    if (city) {
        query.city = { $regex: new RegExp(city, "i") }; // case-insensitive match
    }

    const [jobs, total] = await Promise.all([
        Job.find(query)
            .sort({ date_updated: -1 })
            .skip(skip)
            .limit(limit)
            .lean(), // ⚡ lean makes it faster
        Job.countDocuments(query),
    ]);

    // const data = await Job.aggregate([
    //     {
    //         $group: {
    //             _id: { $toLower: "$city" }, // Group by city (case-insensitive)
    //             count: { $sum: 1 },
    //         },
    //     },
    //     {
    //         $match: {
    //             count: { $gte: 50 }
    //         }
    //     },
    //     {
    //         $sort: { count: -1 }, // Sort by count descending
    //     },
    // ]);
    // console.log(data)

    return res.status(200).json(
        new ApiResponse(200, "", {
            statusCode: 200,
            data: jobs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            success: true,
        }),
    );
};

export const getJobById = tryCatch(async (req, res) => {
    const id = req.params.id;

    let job;
    if (mongoose.Types.ObjectId.isValid(id)) {
        job = await Job.findById(id);
    } else {
        job = await Job.findOne({ guid: id });
    }

    if (!job) {
        return res.status(404).json({
            status: 404,
            success: false,
            message: "Failed to find this job",
        });
    }
    return res
        .status(200)
        .json(new ApiResponse(200, "Job retrieved successfully", job));
});

export const getJobTitleSuggestions = async (req, res) => {
    const { q } = req.query; // query string: /jobs/suggest?q=finanz

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: "Query must be at least 2 characters long",
        });
    }

    const suggestions = await Job.find({
        title: { $regex: q, $options: "i" }, // case-insensitive match
    })
        .limit(10) // limit for dropdown
        .select("title _id guid")
        .lean();

    return res.status(200).json(
        new ApiResponse(200, "Job deleted successfully", {
            statusCode: 200,
            success: true,
            data: suggestions,
        }),
    );
};

export const deleteJob = tryCatch(async (req, res) => {
    const jobId = req.params.id;
    const deletedJob = await Job.findByIdAndDelete(jobId);
    if (!deletedJob) {
        return res
            .status(404)
            .json({ status: 404, success: false, message: "Job not found" });
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
        query.title = { $regex: keyword, $options: "i" };
    }

    if (location && location !== "Location") {
        query["location.city"] = { $regex: location, $options: "i" };
    }

    if (careerLevel && careerLevel !== "Career Level") {
        query.careerLevel = careerLevel;
    }
    if (category && category !== "Category") {
        query.category = category;
    }

    // Fetch jobs based on the constructed query
    const jobs = await Job.find(query).sort({ date_updated: -1 });

    if (!jobs || jobs.length === 0) {
        return res
            .status(404)
            .json({ status: 404, success: false, message: "No Jobs Found" });
    }

    return res.status(200).json(new ApiResponse(200, "", jobs));
});

// const feedUrl = 'https://feed.stepstone.de/partner/files/FD6E3D39-9567-4371-AF2F-4C2EA060ABE0/638D844C-A648-4FCF-94B2-BEB217B0C197';
const feedUrl =
    "https://de.jooble.org/affiliate_feed/KgYKLwsbCgIXNQIFKBgrMCg+GCsh.xml";
export const fetchJobs = async () => {
    try {
        console.log("Fetching jobs...");

        const response = await axios.get(feedUrl, { responseType: "stream" });
        const parser = new SAXParser(true);

        let currentJob = null;
        let currentTag = "";

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Pause the stream reference for control
        const stream = response.data;

        parser.onopentag = (node) => {
            if (node.name === "job") {
                currentJob = {};
            }
            currentTag = node.name;
        };

        parser.oncdata = (cdata) => {
            if (currentJob && currentTag) {
                currentJob[currentTag] = (currentJob[currentTag] || "") + cdata.trim();
            }
        };

        parser.onclosetag = async (tagName) => {
            if (tagName === "job" && currentJob && currentJob.guid) {
                try {
                    if (!currentJob.guid) return;
                    await Job.updateOne(
                        { guid: currentJob.guid },
                        { $set: currentJob },
                        { upsert: true },
                    );
                    console.log(`✅ Upserted job: ${currentJob.guid}`);
                } catch (err) {
                    console.error("❌ Upsert failed for job:", err, currentJob);
                }

                currentJob = null;
            }
            currentTag = "";
        };

        // Pipe chunks to parser
        stream.on("data", (chunk) => {
            parser.write(chunk.toString());
        });

        stream.on("end", () => {
            parser.close();
            console.log("✅ Stream ended");
        });
    } catch (error) {
        console.error("❌ Error fetching jobs:", error.message);
    }
};

// Express endpoint to serve the jobs
export const getJoobleJobs = tryCatch(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = page * limit;

    await fetchJobs();
    const paginatedJobs = cachedJobs.slice(start, end);
    const builder = new XMLBuilder();
    const xmlChunk = builder.build({ jobs: { job: paginatedJobs } });

    res.setHeader("Content-Type", "application/xml");
    // res.status(200).send(xmlChunk);
    res.status(200).json({ jobs: paginatedJobs });
});


export const suggestions = tryCatch(async (req, res) => {
    const q = req.query.q?.toString().trim() || "";
    if (!q) return res.json([]);

    const suggestions = await Job.find({
        $or: [
            { city: { $regex: q, $options: "i" } },
            { title: { $regex: q, $options: "i" } },
        ],
    })
        .limit(10)
        .select("city title -_id guid");

    const unique = new Set();
    const response = suggestions.flatMap((s) => {
        const c = s.city?.trim();
        const t = s.title?.trim();
        return [
            c && !unique.has(c) ? unique.add(c) && { type: "city", value: c } : null,
            t && !unique.has(t) ? unique.add(t) && { type: "title", value: t } : null,
        ];
    }).filter(Boolean);

    res.json(response);
});

export const searchJobs = tryCatch(async (req, res) => {
    const { q, page = 1, limit = 20, city } = req.query;

    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const regex = new RegExp(q, "i"); // case-insensitive search
    const cityRegex = city ? new RegExp(city, "i") : null;

    try {
        const query = {
            $and: [
                {
                    $or: [
                        { title: { $regex: regex } },
                        { description: { $regex: regex } }
                    ]
                },
            ]
        };

        // ✅ If city is provided, add city match
        if (cityRegex) {
            query.$and.push({ city: { $regex: cityRegex } });
        }

        const total = await Job.countDocuments(query);

        const jobs = await Job.find(query)
            .sort({ date_updated: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            total,
            totalPages: Math.ceil(total / limit),
            data: jobs,
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// const client = Redis.createClient({
//     password: 'kS8s3hOQQmd3hzGtu6tZB9OWevCWBqbq',
//     socket: {
//         host: 'redis-12205.c265.us-east-1-2.ec2.redns.redis-cloud.com',
//         port: 12205
//     }
// });

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

// export const searchJob = tryCatch(async (req, res) => {
//     const { search_string, location, limit } = req.query;
//     const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5IjoiREUiLCJwYXJ0bmVyX2lkIjoiODc2In0.FZa6WJXceEqjanLY9-aFzkgiW9ITy4Dwh-vbsqnO4Fw';
//     // const apiUrl = https://de.jooble.org/real-time-search-api/job/search?search_string=${encodeURIComponent(search_string)}&location=${encodeURIComponent(location)}&limit=${limit};

//     try {
//         const fetch = await import('node-fetch').then(module => module.default);
//         const response = await fetch(apiUrl, {
//             method: 'GET',
//             headers: {
//                 'X-TOKEN': token
//             }
//         });
//         const data = await response.json();
//         res.json(data);
//     } catch (error) {
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// })

// Schedule the cron job to run every hour
// cron.schedule('0 */12 * * *', () => {
//     fetchJobs();
// });

// // Initial fetch on server start
// fetchJobs();
