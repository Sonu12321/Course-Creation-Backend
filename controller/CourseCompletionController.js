import Course from "../models/CourseModel.js";
import Purchase from "../models/PurchaseModel.js";

/**
 * Track video progress for a student
 * Marks a specific video as completed and updates overall course progress
 */
export const trackVideoProgress = async (req, res) => {
  try {
    const { courseId, videoId } = req.body;
    const userId = req.user._id;

    // Verify the user has purchased this course
    const purchase = await Purchase.findOne({
      user: userId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You must purchase this course to track progress"
      });
    }

    // Get the course to calculate total videos
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Initialize completedVideos array if it doesn't exist
    if (!purchase.completedVideos) {
      purchase.completedVideos = [];
    }

    // Check if video is already marked as completed
    if (!purchase.completedVideos.includes(videoId)) {
      purchase.completedVideos.push(videoId);
    }

    // Calculate progress percentage
    const totalVideos = course.videos.length;
    const completedCount = purchase.completedVideos.length;
    
    // Calculate percentage (handle division by zero)
    purchase.progress = totalVideos > 0 
      ? Math.round((completedCount / totalVideos) * 100) 
      : 0;

    // Update completion status
    if (purchase.progress === 0) {
      purchase.completionStatus = 'not-started';
    } else if (purchase.progress < 100) {
      purchase.completionStatus = 'in-progress';
    } else {
      purchase.completionStatus = 'completed';
    }

    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      progress: purchase.progress,
      completionStatus: purchase.completionStatus,
      completedVideos: purchase.completedVideos
    });

  } catch (error) {
    console.error("Error in trackVideoProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking video progress",
      error: error.message
    });
  }
};

/**
 * Get course completion status for a student
 */
export const getCourseCompletionStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Verify the user has purchased this course
    const purchase = await Purchase.findOne({
      user: userId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You must purchase this course to view progress"
      });
    }

    // Get the course to include video details
    const course = await Course.findById(courseId)
      .select('title videos duration');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Create a detailed progress report
    const completedVideos = purchase.completedVideos || [];
    const videoProgress = course.videos.map(video => ({
      videoId: video._id.toString(),
      title: video.title,
      duration: video.duration,
      completed: completedVideos.includes(video._id.toString())
    }));

    res.status(200).json({
      success: true,
      courseTitle: course.title,
      progress: purchase.progress || 0,
      completionStatus: purchase.completionStatus || 'not-started',
      completedCount: completedVideos.length,
      totalVideos: course.videos.length,
      videoProgress
    });

  } catch (error) {
    console.error("Error in getCourseCompletionStatus:", error);
    res.status(500).json({
      success: false,
      message: "Error getting course completion status",
      error: error.message
    });
  }
};

/**
 * Mark multiple videos as completed at once
 */
export const markVideosAsCompleted = async (req, res) => {
  try {
    const { courseId, videoIds } = req.body;
    const userId = req.user._id;

    if (!videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of video IDs"
      });
    }

    // Verify the user has purchased this course
    const purchase = await Purchase.findOne({
      user: userId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You must purchase this course to track progress"
      });
    }

    // Get the course to calculate total videos
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Initialize completedVideos array if it doesn't exist
    if (!purchase.completedVideos) {
      purchase.completedVideos = [];
    }

    // Add new video IDs to completed list (avoid duplicates)
    videoIds.forEach(videoId => {
      if (!purchase.completedVideos.includes(videoId)) {
        purchase.completedVideos.push(videoId);
      }
    });

    // Calculate progress percentage
    const totalVideos = course.videos.length;
    const completedCount = purchase.completedVideos.length;
    
    purchase.progress = totalVideos > 0 
      ? Math.round((completedCount / totalVideos) * 100) 
      : 0;

    // Update completion status
    if (purchase.progress === 0) {
      purchase.completionStatus = 'not-started';
    } else if (purchase.progress < 100) {
      purchase.completionStatus = 'in-progress';
    } else {
      purchase.completionStatus = 'completed';
    }

    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Videos marked as completed successfully",
      progress: purchase.progress,
      completionStatus: purchase.completionStatus,
      completedVideos: purchase.completedVideos
    });

  } catch (error) {
    console.error("Error in markVideosAsCompleted:", error);
    res.status(500).json({
      success: false,
      message: "Error marking videos as completed",
      error: error.message
    });
  }
};

/**
 * Reset progress for a course (mark all videos as not completed)
 */
export const resetCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Verify the user has purchased this course
    const purchase = await Purchase.findOne({
      user: userId,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: "You must purchase this course to reset progress"
      });
    }

    // Reset progress
    purchase.completedVideos = [];
    purchase.progress = 0;
    purchase.completionStatus = 'not-started';

    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Course progress has been reset",
      progress: 0,
      completionStatus: 'not-started',
      completedVideos: []
    });

  } catch (error) {
    console.error("Error in resetCourseProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting course progress",
      error: error.message
    });
  }
};

/**
 * Get all courses with progress for the current user
 */
export const getUserCoursesWithProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all purchases for this user
    const purchases = await Purchase.find({
      user: userId,
      status: { $in: ['active', 'completed'] }
    }).populate({
      path: 'course',
      select: 'title description thumbnail duration videos instructor category',
      populate: {
        path: 'instructor',
        select: 'firstname lastname'
      }
    });

    if (!purchases || purchases.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No purchased courses found"
      });
    }

    // Format the response
    const coursesWithProgress = purchases.map(purchase => {
      const course = purchase.course;
      
      return {
        courseId: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        duration: course.duration,
        category: course.category,
        instructor: course.instructor ? 
          `${course.instructor.firstname} ${course.instructor.lastname}` : 
          'Unknown Instructor',
        progress: purchase.progress || 0,
        completionStatus: purchase.completionStatus || 'not-started',
        completedVideos: purchase.completedVideos || [],
        totalVideos: course.videos ? course.videos.length : 0
      };
    });

    res.status(200).json({
      success: true,
      count: coursesWithProgress.length,
      courses: coursesWithProgress
    });

  } catch (error) {
    console.error("Error in getUserCoursesWithProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user courses with progress",
      error: error.message
    });
  }
};

/**
 * Get the total number of videos in a course
 */
export const getVideoCount = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get the course to count videos
    const course = await Course.findById(courseId)
      .select('title videos');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const totalVideos = course.videos.length;

    res.status(200).json({
      success: true,
      courseTitle: course.title,
      totalVideos: totalVideos
    });

  } catch (error) {
    console.error("Error in getVideoCount:", error);
    res.status(500).json({
      success: false,
      message: "Error getting video count",
      error: error.message
    });
  }
};