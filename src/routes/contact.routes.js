import { Router } from "express";
import { contactForm } from "../controllers/contact.controllers.js";

const contactRouter = Router();

contactRouter.route("/").post(contactForm);

export default contactRouter;
