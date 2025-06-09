import express from 'express';
import { 
  getAdminDashboardStats, 
  getUserStats, 
  getCourseStats, 
  getRevenueStats, 
  getCoursePerformance, 
  getProfessorPerformance, 
  getAdminNotifications, 
  createSystemNotification 
} from '../controller/adminController.js';
import authUser from "../middlewares/authMiddlewares.js";

const router = express.Router();

// Admin dashboard statistics
router.get('/stats', authUser, getAdminDashboardStats);

// User statistics
router.get('/users/stats', authUser, getUserStats);

// Course statistics
router.get('/courses/stats', authUser, getCourseStats);

// Revenue statistics
router.get('/revenue/stats', authUser, getRevenueStats);

// Course performance metrics
router.get('/courses/:courseId/performance', authUser, getCoursePerformance);

// Professor performance metrics
router.get('/professors/:professorId/performance', authUser, getProfessorPerformance);

// Admin notifications
router.get('/notifications', authUser, getAdminNotifications);

// Create system notification
router.post('/notifications', authUser, createSystemNotification);

export default router;