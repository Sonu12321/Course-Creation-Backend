import express from "express";
import { markVideoWatched, getCourseProgress, getAllCoursesProgress } from "../controller/CourseProgressController.js";
import authUser from "../middlewares/authMiddlewares.js"; // Assuming you have an auth middleware

const router = express.Router();

// Routes for user progress
router.post("/mark-watched", authUser, markVideoWatched); // Mark a video as watched
router.get("/course/:courseId", authUser, getCourseProgress); // Get progress for a specific course
router.get("/all", authUser, getAllCoursesProgress); // Get progress for all enrolled courses

export default router;