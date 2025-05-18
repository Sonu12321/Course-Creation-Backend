import express from 'express';
import { 
    getAllPurchases, 
    getCourseStudents, 
    getProfessorStats, 
    getProfessorStudents, 
    initiatePurchase,
    confirmPayment, 
    handleStripeWebhook
} from '../controller/purchaseController.js';
import { 
    // getCourseReviews,
    deleteReview 
} from '../controller/StudentsController.js';
import authUser from '../middlewares/authMiddlewares.js';

const router = express.Router();

// Payment routes
router.post('/initiate', authUser, initiatePurchase);
router.post('/confirm', authUser, confirmPayment);

// Professor routes
router.get('/professor/students', authUser, getProfessorStudents);
router.get('/professor/stats', authUser, getProfessorStats);

// Course specific routes
router.get('/course/:courseId/students', authUser, getCourseStudents);
// router.get('/course/:courseId/reviews', authUser, getCourseReviews);
router.delete('/course/:courseId/review/:reviewId', authUser, deleteReview);

// Admin routes
router.get('/admin/all', authUser, getAllPurchases);

// Add this route to your existing routes
router.post('/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

export default router;