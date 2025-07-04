import dotenv from "dotenv";
import connectDB from "./db/index.js";
import path from "path";
import { app } from "./app.js";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});
console.log("ENV TEST:", process.env.PORT);

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`⚙️ Server is running http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
