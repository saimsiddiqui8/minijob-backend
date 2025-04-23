import { Router } from "express";
import {
  getAllJobs,
  getJobById,
  getJoobleJobs,
  deleteJob,
  getJobsByFilter,
  getJobsByType,
  suggestions,
} from "../controllers/jobs.controllers.js";
import { tryCatch } from "../utils/tryCatch.js";

const jobsRouter = Router();

jobsRouter.route("/get-all-jobs").get(tryCatch(getAllJobs));
jobsRouter.route("/get-job-by-type").get(tryCatch(getJobsByType));
jobsRouter.route("/get-job/:id").get(tryCatch(getJobById));
jobsRouter.route("/jooble").get(tryCatch(getJoobleJobs));
jobsRouter.route("/filter").get(tryCatch(getJobsByFilter));
jobsRouter.route("/suggestions").get(tryCatch(suggestions));
jobsRouter.route("/delete-job/:id").delete(tryCatch(deleteJob));

export default jobsRouter;
