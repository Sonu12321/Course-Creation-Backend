import express from 'express';
import { 
  getCourseDetails, 
  checkEnrollmentStatus, 
  getCourseVideo, 
  addToWishlist, 
  getRelatedCourses 
} from '../controller/CourseDetailsController.js';
import { 
  CreateCourse, 
  // updateCourseStatus, 
  updateCourse, 
  getCourse, 
  getAllCourses 
} from '../controller/CreateCourseController.js';
import authUser from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multerMiddleware.js';

const router = express.Router();

// Existing routes
router.post('/create', authUser, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'previewVideo', maxCount: 1 },
  { name: 'videos', maxCount: 10 }
]), CreateCourse);

// router.put('/update-status', authUser, updateCourseStatus);
router.put('/update/:courseId', authUser, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'previewVideo', maxCount: 1 },
  { name: 'videos', maxCount: 10 }
]), updateCourse);
router.get('/professor/courses', authUser, getCourse);
router.get('/all', getAllCourses);

// New routes for course details
router.get('/details/:courseId', authUser, getCourseDetails);
router.get('/enrollment/:courseId', authUser, checkEnrollmentStatus);
router.get('/video/:courseId/:videoId', authUser, getCourseVideo);
router.post('/wishlist/:courseId', authUser, addToWishlist);
router.get('/related/:courseId', authUser, getRelatedCourses);

export default router;