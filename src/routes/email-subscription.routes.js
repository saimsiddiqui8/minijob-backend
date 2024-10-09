import { Router } from "express";
import { subscribeEmail } from "../controllers/email-subscription.controllers.js";

const emailSubscriptionRouter = Router();

emailSubscriptionRouter.route("/create").post(subscribeEmail);


export default emailSubscriptionRouter;
