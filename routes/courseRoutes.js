import express from 'express';
import { adminDeleteCourse, adminGetAllCourses, adminUpdateCourse, CreateCourse, deleteCourse, getAllCourses, getCourse, getCourseById, updateCourse} from '../controller/CreateCourseController.js';
import authUser from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multerMiddleware.js';
import { 
  trackVideoProgress, 
  getCourseCompletionStatus,
  markVideosAsCompleted,
  resetCourseProgress,
  getUserCoursesWithProgress
} from '../controller/CourseCompletionController.js';

const router = express.Router();

// Optional auth route - will work with or without token
router.get('/courses', async (req, res, next) => {
    try {
        // Try to authenticate but continue even if no token
        await authUser(req, res, next);
    } catch (error) {
        // Continue without authentication
        next();
    }
}, getAllCourses);

// Protected routes below
router.post('/create', authUser, upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'previewVideo', maxCount: 1 },
        { name: 'videos', maxCount: 10 }
    ]),
    CreateCourse
);

router.get('/professor-courses', authUser, getCourse);

router.put('/:courseId', 
    authUser,
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'previewVideo', maxCount: 1 },
        { name: 'videos', maxCount: 10 }
    ]),
    updateCourse
);

router.delete('/courses/:courseId', authUser, deleteCourse);    
router.get('/courses/:courseId', authUser, getCourseById);

// Admin routes
router.get('/admin/courses', authUser, adminGetAllCourses);
router.put('/admin/course/:courseId', authUser, adminUpdateCourse);
router.delete('/admin/course/:courseId', authUser, adminDeleteCourse);

// Course completion routes
router.post('/progress/track-video', authUser, trackVideoProgress);
router.get('/progress/status/:courseId', authUser, getCourseCompletionStatus);
router.post('/progress/mark-completed', authUser, markVideosAsCompleted);
router.post('/progress/reset/:courseId', authUser, resetCourseProgress);
router.get('/progress/my-courses', authUser, getUserCoursesWithProgress);

export default router;