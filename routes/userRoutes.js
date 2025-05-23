import express from "express";
import { deleteProfile, deleteUserByAdmin,  GetallUser, getCourseCompletionStats, getProfessorProfile, getUserCourseCompletionStatus, LoginUser, ProfessorProfile, resetPassword, ShowUserProfile, ThisIsTO, toggleUserRole, updateProfessorProfile, updateProfile, userRegister, verifyEmail,  } from "../controller/userController.js";
import authUser from "../middlewares/authMiddlewares.js";
import { upload } from '../middlewares/multerMiddleware.js'

const router = express.Router()

router.post('/register', upload.single('profileImage'), userRegister);
router.post('/verify-email', verifyEmail)
router.post('/login', LoginUser)
router.post('/forgetPass', ThisIsTO)
router.post('/reset-password', resetPassword) // Removed authUser middleware
router.get('/profile', authUser, ShowUserProfile)
router.put('/update', authUser, upload.single('profileImage'), updateProfile)
router.delete('/delete', authUser, deleteProfile)
router.get('/all-users', authUser, GetallUser)
router.put('/toggle-role', authUser, toggleUserRole)
router.delete('/delete-user/:userId', authUser, deleteUserByAdmin)

router.get('/ProfessorProfile',authUser,ProfessorProfile)
// Add these routes to your existing userRoutes.js file

// Get completion status for a specific user in a course
router.get('/course-completion/:courseId/:userId', authUser, getUserCourseCompletionStatus);

// Get completion statistics for all users in a course
router.get('/course-completion-stats/:courseId', authUser, getCourseCompletionStats);
router.get('/professors/profile', authUser, getProfessorProfile);
router.put('/professors/update', authUser, upload.single('profileImage'), updateProfessorProfile);

export default router