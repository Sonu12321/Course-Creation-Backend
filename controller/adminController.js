import UserSchema from "../models/userModel.js";
import Course from "../models/CourseModel.js";
import Purchase from "../models/PurchaseModel.js";
import Certificate from "../models/CertificateModel.js";
import UserProgress from "../models/UserProgressModel.js";
import Notification from "../models/NotificationModel.js";

// Get admin dashboard statistics
export const getAdminDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get total users count
    const totalUsers = await UserSchema.countDocuments({ role: 'user' });
    
    // Get total professors count
    const totalProfessors = await UserSchema.countDocuments({ role: 'professor' });
    
    // Get total courses count
    const totalCourses = await Course.countDocuments();
    
    // Get total published courses count
    const publishedCourses = await Course.countDocuments({ status: 'published' });
    
    // Get total revenue
    const purchases = await Purchase.find();
    const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    
    // Get total certificates issued
    const totalCertificates = await Certificate.countDocuments();
    
    // Get recent user registrations (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentUsers = await UserSchema.countDocuments({ 
      createdAt: { $gte: lastWeek } 
    });

    // Return dashboard statistics
    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProfessors,
        totalCourses,
        publishedCourses,
        totalRevenue,
        totalCertificates,
        recentUsers
      }
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching admin dashboard statistics",
      error: error.message
    });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get user counts by role
    const usersByRole = await UserSchema.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get verified vs unverified users
    const verifiedUsers = await UserSchema.countDocuments({ isVerified: true });
    const unverifiedUsers = await UserSchema.countDocuments({ isVerified: false });

    // Get user registration trends (monthly for the current year)
    const currentYear = new Date().getFullYear();
    const registrationTrends = await UserSchema.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        usersByRole,
        verifiedUsers,
        unverifiedUsers,
        registrationTrends
      }
    });
  } catch (error) {
    console.error("User stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
      error: error.message
    });
  }
};

// Get course statistics
export const getCourseStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get courses by category
    const coursesByCategory = await Course.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get courses by status
    const coursesByStatus = await Course.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top-rated courses
    const topRatedCourses = await Course.find()
      .sort({ rating: -1 })
      .limit(5)
      .select('title rating category price instructor')
      .populate('instructor', 'firstname lastname');

    // Get most enrolled courses
    const mostEnrolledCourses = await Course.aggregate([
      {
        $project: {
          title: 1,
          category: 1,
          price: 1,
          enrolledCount: { $size: "$enrolledStudents" }
        }
      },
      { $sort: { enrolledCount: -1 } },
      { $limit: 5 }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        coursesByCategory,
        coursesByStatus,
        topRatedCourses,
        mostEnrolledCourses
      }
    });
  } catch (error) {
    console.error("Course stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching course statistics",
      error: error.message
    });
  }
};

// Get revenue statistics
export const getRevenueStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get total revenue
    const purchases = await Purchase.find();
    const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

    // Get revenue by payment type
    const revenueByPaymentType = await Purchase.aggregate([
      {
        $group: {
          _id: "$paymentType",
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    // Get revenue by course category
    const revenueByCourseCategory = await Purchase.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDetails"
        }
      },
      { $unwind: "$courseDetails" },
      {
        $group: {
          _id: "$courseDetails.category",
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get monthly revenue for the current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Purchase.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        revenueByPaymentType,
        revenueByCourseCategory,
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error("Revenue stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching revenue statistics",
      error: error.message
    });
  }
};

// Get course performance metrics
export const getCoursePerformance = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { courseId } = req.params;

    // Get course details
    const course = await Course.findById(courseId)
      .populate('instructor', 'firstname lastname email')
      .populate('reviews.user', 'firstname lastname');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Get enrollment count
    const enrollmentCount = course.enrolledStudents.length;

    // Get revenue generated by this course
    const purchases = await Purchase.find({ course: courseId });
    const courseRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

    // Get completion statistics
    const userProgress = await UserProgress.find({ course: courseId });
    const completionStats = {
      notStarted: 0,
      inProgress: 0,
      completed: 0
    };

    userProgress.forEach(progress => {
      if (progress.completionPercentage === 0) {
        completionStats.notStarted++;
      } else if (progress.completionPercentage === 100) {
        completionStats.completed++;
      } else {
        completionStats.inProgress++;
      }
    });

    // Get certificate count for this course
    const certificateCount = await Certificate.countDocuments({ course: courseId });

    // Get average rating
    const averageRating = course.rating;

    return res.status(200).json({
      success: true,
      data: {
        courseDetails: {
          title: course.title,
          instructor: course.instructor,
          category: course.category,
          status: course.status,
          price: course.price
        },
        enrollmentCount,
        courseRevenue,
        completionStats,
        certificateCount,
        averageRating,
        reviewCount: course.reviews.length
      }
    });
  } catch (error) {
    console.error("Course performance error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching course performance metrics",
      error: error.message
    });
  }
};

// Get professor performance metrics
export const getProfessorPerformance = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { professorId } = req.params;

    // Get professor details
    const professor = await UserSchema.findById(professorId);
    if (!professor || professor.role !== 'professor') {
      return res.status(404).json({
        success: false,
        message: "Professor not found"
      });
    }

    // Get courses by this professor
    const professorCourses = await Course.find({ instructor: professorId });
    const courseIds = professorCourses.map(course => course._id);

    // Get total students enrolled in professor's courses
    const totalStudents = professorCourses.reduce((sum, course) => 
      sum + course.enrolledStudents.length, 0);

    // Get total revenue generated by professor's courses
    const purchases = await Purchase.find({ course: { $in: courseIds } });
    const totalRevenue = purchases.reduce((sum, purchase) => 
      sum + purchase.totalAmount, 0);

    // Get average course rating
    const totalRating = professorCourses.reduce((sum, course) => 
      sum + course.rating, 0);
    const averageRating = professorCourses.length > 0 ? 
      totalRating / professorCourses.length : 0;

    // Get certificates issued for professor's courses
    const certificatesIssued = await Certificate.countDocuments({ 
      course: { $in: courseIds } 
    });

    return res.status(200).json({
      success: true,
      data: {
        professorDetails: {
          name: `${professor.firstname} ${professor.lastname}`,
          email: professor.email
        },
        courseCount: professorCourses.length,
        coursesByStatus: {
          draft: professorCourses.filter(c => c.status === 'draft').length,
          published: professorCourses.filter(c => c.status === 'published').length,
          archived: professorCourses.filter(c => c.status === 'archived').length
        },
        totalStudents,
        totalRevenue,
        averageRating,
        certificatesIssued
      }
    });
  } catch (error) {
    console.error("Professor performance error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching professor performance metrics",
      error: error.message
    });
  }
};

// Get system notifications for admin
export const getAdminNotifications = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get system notifications
    const notifications = await Notification.find({ 
      type: 'system',
      userId: req.user._id
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching admin notifications",
      error: error.message
    });
  }
};

// Create system notification for all users or specific roles
export const createSystemNotification = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { title, message, targetRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    // Find target users based on role (or all users if no role specified)
    const query = targetRole ? { role: targetRole } : {};
    const users = await UserSchema.find(query).select('_id');

    // Create notifications for each user
    const notificationPromises = users.map(user => {
      return Notification.create({
        userId: user._id,
        title,
        message,
        type: 'system'
      });
    });

    await Promise.all(notificationPromises);

    return res.status(201).json({
      success: true,
      message: `System notification sent to ${users.length} users`
    });
  } catch (error) {
    console.error("Create system notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating system notification",
      error: error.message
    });
  }
};