import express from "express";
import authUser from "../middlewares/authMiddlewares.js";
import { upload } from '../middlewares/multerMiddleware.js'
import {  
    forgotPasswordStudent, 
    getEnrolledCourses, 
    getPendingInstallments, 
    LoginStudent, 
    ShowStudentProfile, 
    studentRegister, 
    StudentresetPassword, 
    updateStudentProfile,
  
    Reviews,
    getCourseReviews,
    getProfessorCourseReviews
} from "../controller/StudentsController.js";

import Purchase from '../models/PurchaseModel.js';

const router = express.Router()

router.post('/Studentregister', upload.single('profileImage'), studentRegister);
// router.post('/verify-email', verifyEmailStudent)
router.post('/Studentlogin', LoginStudent)
router.post('/forget-password', forgotPasswordStudent)
router.post('/reset-password', authUser, StudentresetPassword)
router.get('/profile', authUser, ShowStudentProfile)
router.put('/Studentupdate', authUser, upload.single('profileImage'), updateStudentProfile)
// router.delete('/delete', authUser, deleteProfileStudent)
router.get('/enrolled-courses', authUser, getEnrolledCourses);
router.get('/pending-installments', authUser, getPendingInstallments);



// Comment and Review routes

router.post('/review', authUser, Reviews);
router.get('/course/:courseId', getCourseReviews);
router.get('/professor/reviews', authUser, getProfessorCourseReviews);
// router.get('/notifications', authUser, getUserNotifications);
// router.put('/notifications/:notificationId/read', authUser, markNotificationAsRead);
// router.get('/certificate/:courseId', authUser, getCourseCompletionCertificate);

export default router