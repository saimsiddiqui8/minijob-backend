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

export const getJobsByType = tryCatch(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const jobtypeQuery = req.query.jobtype;
    const city = req.query.city;

    if (!jobtypeQuery) {
        return res.status(400).json(new ApiResponse(400, "Job type is required"));
    }
    const jobtypes = jobtypeQuery.split(",").map(type => type.trim());

    const allowedTypes = [
        "Part-time",
        "Full-time",
        "Internship",
        "Temporary",
        "Contract",
        "Remote"
    ];

    // Validate
    const invalidTypes = jobtypes.filter(type => !allowedTypes.includes(type));
    if (invalidTypes.length > 0) {
        return res.status(404).json(new ApiResponse(404, "Invalid Job type(s): " + invalidTypes.join(", ")));
    }

    const skip = (page - 1) * limit;

    const query = {
        jobtype: { $in: jobtypes }
    };

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
})

export const getJobsCountByType = tryCatch(async (req, res) => {
    try {
        const city = req.query.city || "";

        const matchStage = city ? { city: { $regex: new RegExp(city, 'i') } } : {};

        const counts = await Job.aggregate([
            {
                $match: matchStage
            },
            {
                $project: {
                    jobtype: { $split: ["$jobtype", ", "] } // Split string by ", "
                }
            },
            {
                $unwind: "$jobtype"
            },
            {
                $group: {
                    _id: "$jobtype",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert array to object
        const result = {};
        counts.forEach(item => {
            if (item._id) {
                result[item._id] = item.count;
            }
        });

        res.json({ counts: result });
    } catch (error) {
        console.error("Error fetching job type counts:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

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
    const { city, q } = req.query; // query string: /jobs/suggest?q=finanz

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: "Query must be at least 2 characters long",
        });
    }
    const regex = new RegExp(q, "i");

    const query = {
        title: { $regex: regex },
    };

    if (city && city.trim().length > 0) {
        query.city = city;
    }

    const suggestions = await Job.find(query)
        .limit(10)
        .select("title")
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
// export const fetchJobs = async () => {
//     try {
//         console.log("Fetching jobs...");

//         const response = await axios.get(feedUrl, { responseType: "stream" });
//         const parser = new SAXParser(true);

//         let currentJob = null;
//         let currentTag = "";


//         // Pause the stream reference for control
//         const stream = response.data;

//         parser.onopentag = (node) => {
//             if (node.name === "job") {
//                 currentJob = {};
//             }
//             currentTag = node.name;
//         };

//         parser.oncdata = (cdata) => {
//             if (currentJob && currentTag) {
//                 currentJob[currentTag] = (currentJob[currentTag] || "") + cdata.trim();
//             }
//         };

//         parser.onclosetag = async (tagName) => {
//             if (tagName === "job" && currentJob && currentJob.guid) {
//                 try {
//                     if (!currentJob.guid) return;
//                     await Job.updateOne(
//                         { guid: currentJob.guid },
//                         { $set: currentJob },
//                         { upsert: true },
//                     );
//                     console.log(`✅ Upserted job: ${currentJob.guid}`);
//                 } catch (err) {
//                     console.error("❌ Upsert failed for job:", err, currentJob);
//                 }

//                 currentJob = null;
//             }
//             currentTag = "";
//         };

//         // Pipe chunks to parser
//         stream.on("data", (chunk) => {
//             parser.write(chunk.toString());
//         });

//         stream.on("end", () => {
//             parser.close();
//             console.log("✅ Stream ended");
//         });
//     } catch (error) {
//         console.error("❌ Error fetching jobs:", error.message);
//     }
// };

// Express endpoint to serve the jobs
export const getJoobleJobs = tryCatch(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = page * limit;

    // await fetchJobs();
    const paginatedJobs = cachedJobs.slice(start, end);
    const builder = new XMLBuilder();
    const xmlChunk = builder.build({ jobs: { job: paginatedJobs } });

    res.setHeader("Content-Type", "application/xml");

    // res.status(200).send(xmlChunk);
    res.status(200).json({ jobs: paginatedJobs });
});


export const suggestions = tryCatch(async (req, res) => {
    const { city } = req.query;
    const q = req.query.q?.toString().trim() || "";

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: "Query must be at least 2 characters long",
        });
    }
    const regex = new RegExp(q, "i");

    const query = {
        category: { $regex: regex },
    };

    if (city && city.trim().length > 0) {
        query.city = city;
    }

    const suggestions = await Job.find(query)
        .select("title city")
        .lean();

    return res.status(200).json(
        new ApiResponse(200, "Suggestion Retrieved successfully", {
            statusCode: 200,
            success: true,
            data: suggestions,
        }),
    );
});

export const citySuggestions = tryCatch(async (req, res) => {
    const q = req.query.q?.toString().trim() || "";

    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: "Query must be at least 2 characters long",
        });
    }

    const cities = await Job.distinct("city", {
        city: { $regex: q, $options: "i" }
    });

    const limitedCities = cities.slice(0, 10);

    res.json({
        statusCode: 200,
        success: true,
        data: limitedCities.map(city => ({ city }))
    });
});


export const getRecentJobStats = tryCatch(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // today + 6 = 7 days total

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 9);

    const thirtyDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 29);

    const [todayCount, last7DaysCount, last10DaysCount] = await Promise.all([
        Job.countDocuments({ createdAt: { $gte: today } }),
        Job.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        Job.countDocuments({ createdAt: { $gte: tenDaysAgo } }),
        Job.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);


    res.json({
        statusCode: 200,
        success: true,
        data: {
            today: todayCount,
            last7Days: last7DaysCount,
            last10Days: last10DaysCount,
            last30Days: last10DaysCount,
        }
    });
});

export const searchJobs = tryCatch(async (req, res) => {
    const {
        q,
        city,
        page = 1,
        limit = 20,
        datePosted,
        jobType,
        experience,
        salaryRange,
    } = req.query;

    // if (!q && !city) return res.status(400).json({ error: "Query parameter 'q' is required" });

    // if (!q && !city) {
    //     return res.status(400).json({ error: "At least one of 'q', 'city', or 'jobtype' is required" });
    // }
    const filters = [];

    if (q) {
        const regex = new RegExp(q, "i");
        filters.push({ title: { $regex: regex } });
    }

    if (city) {
        // const cityRegex = new RegExp(city, "i");
        // filters.push({
        //     $or: [
        //         { city: { $regex: cityRegex } },
        //         { state: { $regex: cityRegex } }
        //     ]
        // });
        filters.push({
            $or: [
                { city: { $regex: `^${city}$`, $options: "i" } },
                { state: { $regex: `^${city}$`, $options: "i" } }
            ]
        });
    }

    // if (jobType) {
    //     const typesArray = Array.isArray(jobType)
    //         ? jobType
    //         : typeof jobType === "string"
    //             ? jobType.split(",").map(t => t.trim())
    //             : [];

    //     const invalidTypes = typesArray.filter(type => !allowedTypes.includes(type));
    //     if (invalidTypes.length > 0) {
    //         return res.status(404).json(new ApiResponse(404, "Invalid Job type(s): " + invalidTypes.join(", ")));
    //     }

    //     if (typesArray.length > 0) {
    //         filters.push({ jobtype: { $in: typesArray } });
    //     }
    // }

    // 🔹 Filter: jobType (Full-time, Part-time, etc.)
    if (jobType) {
        filters.push({ jobtype: jobType });
    }

    // 🔹 Filter: experience (assuming it's stored inside description or structured field)
    if (experience) {
        const expRegex = new RegExp(experience, "i");
        filters.push({ description: { $regex: expRegex } });
    }

    // 🔹 Filter: salaryRange ("0-2000", "3000-5000", etc.)
    if (salaryRange && typeof salaryRange === "string") {
        const [min, max] = salaryRange.split("-").map(Number);
        if (!isNaN(min) && !isNaN(max)) {
            filters.push({ cpc: { $gte: min, $lte: max } });
        }
    }

    // 🔹 Filter: datePosted ("Last 24 hours", "Last 7 days", etc.)
    if (datePosted) {
        const now = new Date();
        const timeMap = {
            "Last 24 hours": 1,
            "Last 3 days": 3,
            "Last 7 days": 7,
            "Last 30 days": 30,
        };

        const days = timeMap[datePosted];
        if (days) {
            const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            filters.push({ date_updated: { $gte: fromDate } });
        }
    }

    const query = filters.length > 0 ? { $and: filters } : {};

    try {

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
