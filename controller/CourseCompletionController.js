import Course from "../models/CourseModel.js";
import UserSchema from "../models/userModel.js";
import Purchase from "../models/PurchaseModel.js";
import Notification from "../models/NotificationModel.js";
// import { sendCourseCompletionEmail } from "../utils/Emails.js"; // Add this import

// Track video progress and check for course completion
export const trackVideoProgress = async (req, res) => {
    try {
        const { courseId, videoId, progress, completed } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!courseId || !videoId) {
            return res.status(400).json({
                success: false,
                message: "Course ID and Video ID are required"
            });
        }

        // Find the course and purchase in parallel for better performance
        const [course, purchase] = await Promise.all([
            Course.findById(courseId),
            Purchase.findOne({ user: userId, course: courseId }) // Fix field names to match your schema
        ]);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "You are not enrolled in this course"
            });
        }

        // Initialize completedVideos array if it doesn't exist
        if (!purchase.completedVideos) {
            purchase.completedVideos = [];
        }

        // Update video progress
        let videoAdded = false;
        if (completed && !purchase.completedVideos.includes(videoId)) {
            purchase.completedVideos.push(videoId);
            videoAdded = true;
        }

        // Calculate overall progress percentage
        const totalVideos = course.videos.length;
        const completedCount = purchase.completedVideos.length;
        const progressPercentage = Math.round((completedCount / totalVideos) * 100);
        
        purchase.progress = progressPercentage;

        // Check if course was just completed
        const wasAlreadyCompleted = purchase.completionStatus === 'completed';
        const isNowCompleted = completedCount >= totalVideos;
        
        if (isNowCompleted && !wasAlreadyCompleted) {
            purchase.completionStatus = 'completed';
            purchase.completionDate = new Date();
            
            // Get user details
            const user = await UserSchema.findById(userId);
            
            // Create notification for course completion
            await Notification.create({
                userId,
                title: "Course Completed!",
                message: `Congratulations! You have completed the course: ${course.title}`,
                type: "course_completion",
                read: false,
                courseId
            });
            
            // Send completion email
            if (user && user.email) {
                await sendCourseCompletionEmail(
                    user.email,
                    user.firstname,
                    course.title
                );
            }
        } else if (!isNowCompleted) {
            purchase.completionStatus = 'in-progress';
        }

        // Save the updated purchase record
        await purchase.save();

        res.status(200).json({
            success: true,
            message: videoAdded ? "Video marked as completed" : "Progress updated",
            progress: progressPercentage,
            completionStatus: purchase.completionStatus,
            isCompleted: purchase.completionStatus === 'completed'
        });

    } catch (error) {
        console.error("Error tracking video progress:", error);
        res.status(500).json({
            success: false,
            message: "Error updating progress",
            error: error.message
        });
    }
};

// Get user's notifications with pagination
export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Get notifications count
        const totalCount = await Notification.countDocuments({ userId });
        
        // Get paginated notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: notifications.length,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: parseInt(page),
            notifications
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching notifications",
            error: error.message
        });
    }
};

// Mark notification as read
// export const markNotificationAsRead = async (req, res) => {
//     try {
//         const { notificationId } = req.params;
//         const userId = req.user._id;

//         // Find and update the notification
//         const notification = await Notification.findOneAndUpdate(
//             { _id: notificationId, userId },
//             { read: true },
//             { new: true }
//         );

//         if (!notification) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Notification not found"
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Notification marked as read",
//             notification
//         });

//     } catch (error) {
//         console.error("Error marking notification as read:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error updating notification",
//             error: error.message
//         });
//     }
// };

// // Mark all notifications as read
// export const markAllNotificationsAsRead = async (req, res) => {
//     try {
//         const userId = req.user._id;

//         // Update all unread notifications
//         const result = await Notification.updateMany(
//             { userId, read: false },
//             { read: true }
//         );

//         res.status(200).json({
//             success: true,
//             message: "All notifications marked as read",
//             count: result.modifiedCount
//         });

//     } catch (error) {
//         console.error("Error marking all notifications as read:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error updating notifications",
//             error: error.message
//         });
//     }
// };

// // Get course completion certificate
// export const getCourseCompletionCertificate = async (req, res) => {
//     try {
//         const { courseId } = req.params;
//         const userId = req.user._id;

//         // Find the purchase record and course in parallel
//         const [purchase, course, user] = await Promise.all([
//             Purchase.findOne({ 
//                 user: userId, 
//                 course: courseId,
//                 completionStatus: 'completed' 
//             }),
//             Course.findById(courseId).populate('instructor', 'firstname lastname'),
//             UserSchema.findById(userId)
//         ]);

//         if (!purchase) {
//             return res.status(404).json({
//                 success: false,
//                 message: "You have not completed this course yet"
//             });
//         }

//         if (!course || !user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Course or user information not found"
//             });
//         }

//         // Generate certificate data
//         const certificateData = {
//             courseTitle: course.title,
//             studentName: `${user.firstname} ${user.lastname}`,
//             instructorName: `${course.instructor.firstname} ${course.instructor.lastname}`,
//             completionDate: purchase.completionDate || purchase.updatedAt,
//             certificateId: `CERT-${courseId.substring(0, 5)}-${userId.substring(0, 5)}-${Date.now().toString().substring(7)}`
//         };

//         res.status(200).json({
//             success: true,
//             message: "Certificate generated successfully",
//             certificate: certificateData
//         });

//     } catch (error) {
//         console.error("Error generating certificate:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error generating certificate",
//             error: error.message
//         });
//     }
// };

// // Get course completion status
// export const getCourseCompletionStatus = async (req, res) => {
//     try {
//         const { courseId } = req.params;
//         const userId = req.user._id;

//         // Find purchase and course in parallel
//         const [purchase, course] = await Promise.all([
//             Purchase.findOne({ user: userId, course: courseId }),
//             Course.findById(courseId)
//         ]);

//         if (!purchase) {
//             return res.status(404).json({
//                 success: false,
//                 message: "You are not enrolled in this course"
//             });
//         }

//         if (!course) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Course not found"
//             });
//         }

//         // Calculate progress if not already set
//         let progress = purchase.progress || 0;
//         if (purchase.completedVideos && !purchase.progress) {
//             const totalVideos = course.videos.length;
//             const completedCount = purchase.completedVideos.length;
//             progress = Math.round((completedCount / totalVideos) * 100);
            
//             // Update the purchase record with calculated progress
//             purchase.progress = progress;
//             await purchase.save();
//         }

//         res.status(200).json({
//             success: true,
//             courseId,
//             progress,
//             completedVideos: purchase.completedVideos || [],
//             completionStatus: purchase.completionStatus || 'not-started',
//             completionDate: purchase.completionDate
//         });

//     } catch (error) {
//         console.error("Error getting completion status:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching completion status",
//             error: error.message
//         });
//     }
// };