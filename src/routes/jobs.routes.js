import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  searchJobs,
  deleteJob,
  getJobsByFilter,
  getJobsByType,
  suggestions,
  getJobsCountByType,
  citySuggestions,
  getRecentJobStats,
} from "../controllers/jobs.controllers.js";
import { tryCatch } from "../utils/tryCatch.js";

const jobsRouter = Router();

jobsRouter.route("/get-all-jobs").get(tryCatch(getAllJobs));
jobsRouter.route("/get-job-by-type").get(tryCatch(getJobsByType));
jobsRouter.route("/get-job/:id").get(tryCatch(getJobById));
jobsRouter.route("/search").get(tryCatch(searchJobs));
jobsRouter.route("/job-type-counts").get(tryCatch(getJobsCountByType));
jobsRouter.route("/filter").get(tryCatch(getJobsByFilter));
jobsRouter.route("/suggestions").get(tryCatch(suggestions));
jobsRouter.route("/city-suggestions").get(tryCatch(citySuggestions));
jobsRouter.route("/delete-job/:id").delete(tryCatch(deleteJob));


jobsRouter.route("/get-time-stats").get(tryCatch(getRecentJobStats));

export default jobsRouter;
