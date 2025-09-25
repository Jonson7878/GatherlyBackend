import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import passport from "./config/passport.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import managedUserRoutes from "./routes/managedUserRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import promoCodeRouter from "./routes/promoCodeRouter.js";
import paymentRouter from "./routes/paymentRoutes.js";
import { verifyToken } from "./middlewares/authMiddleware.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import { startPromoCodeCronJob } from './utils/cronJobs.js';


const main = async () => {



dotenv.config();
await connectDB();

const app = express();

const allowedOrigins = process.env.FRONTEND_URLS?.split(",") || [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS error: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/company", companyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/managed-users", verifyToken, managedUserRoutes);
app.use("/api/tasks", verifyToken, taskRoutes);
app.use("/api/events", verifyToken, eventRoutes);
app.use("/api/order",verifyToken, orderRouter);
app.use("/api/offer",verifyToken,promoCodeRouter)
app.use("/api/payment",verifyToken,paymentRouter);

startPromoCodeCronJob();

const PORT = process.env.PORT || 4000;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL;

app.listen(PORT, () => {
  console.log(
    SERVER_BASE_URL
      ? `Server running live at ${SERVER_BASE_URL}`
      : `Server running on port ${PORT}`
  );
});

}

main();