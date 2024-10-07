import { Router } from "express";
import { getAllJobs, getJobById, createJob, updateJob,getStepstoneJobs, deleteJob, toggleActiveStatus, getJobsByFilter, searchJob } from "../controllers/jobs.controllers.js";

const jobsRouter = Router();

jobsRouter.route("/get-all-jobs").get(getAllJobs);

jobsRouter.route("/get-job/:id").get(getJobById);

jobsRouter.route("/job/search").get(searchJob);

jobsRouter.route("/stepstone").get(getStepstoneJobs);

jobsRouter.route("/filter").get(getJobsByFilter);

// Create a new job (POST /create-job)
jobsRouter.route("/create-job").post(createJob);

jobsRouter.route("/toggle-active/:jobId").post(toggleActiveStatus);

// Update a job by ID (PUT /update-job/:id)
jobsRouter.route("/update-job/:id").put(updateJob);

// Delete a job by ID (DELETE /delete-job/:id)
jobsRouter.route("/delete-job/:id").delete(deleteJob);

export default jobsRouter;
