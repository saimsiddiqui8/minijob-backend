import { Router } from "express";

const contactRouter = Router();

contactRouter.route("/").post(subscribeEmail);

export default contactRouter;
