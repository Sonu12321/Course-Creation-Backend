import UserProgress from "../models/UserProgressModel.js";
import Course from "../models/CourseModel.js";

// Mark a video as watched
const markVideoWatched = async (req, res) => {
  try {
    const { courseId, videoUrl } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!courseId || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Course ID and video URL are required",
      });
    }

    // Verify the course exists and the video belongs to it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const isValidVideo = course.videos.some(video => video.url === videoUrl);
    if (!isValidVideo) {
      return res.status(400).json({
        success: false,
        message: "Invalid video URL for this course",
      });
    }

    // Find or create user progress
    let userProgress = await UserProgress.findOne({ user: userId, course: courseId });
    if (!userProgress) {
      userProgress = new UserProgress({
        user: userId,
        course: courseId,
        watchedVideos: [],
      });
    }

    // Add video to watched list if not already present
    if (!userProgress.watchedVideos.includes(videoUrl)) {
      userProgress.watchedVideos.push(videoUrl);
      await userProgress.save();
    }

    // Populate course details for response
    await userProgress.populate({
      path: 'course',
      select: 'title videos',
    });

    res.status(200).json({
      success: true,
      message: "Video marked as watched",
      progress: {
        courseId,
        courseTitle: userProgress.course.title,
        completionPercentage: userProgress.completionPercentage,
        watchedVideos: userProgress.watchedVideos,
        totalVideos: userProgress.course.videos.length,
      },
    });
  } catch (error) {
    console.error("Error in markVideoWatched:", error);
    res.status(500).json({
      success: false,
      message: "Error marking video as watched",
      error: error.message,
    });
  }
};

// Get user progress for a course
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Find user progress
    const userProgress = await UserProgress.findOne({ user: userId, course: courseId })
      .populate({
        path: 'course',
        select: 'title videos',
      });

    if (!userProgress) {
      // If no progress exists, return 0% completion
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      return res.status(200).json({
        success: true,
        progress: {
          courseId,
          courseTitle: course.title,
          completionPercentage: 0,
          watchedVideos: [],
          totalVideos: course.videos.length,
        },
      });
    }

    res.status(200).json({
      success: true,
      progress: {
        courseId,
        courseTitle: userProgress.course.title,
        completionPercentage: userProgress.completionPercentage,
        watchedVideos: userProgress.watchedVideos,
        totalVideos: userProgress.course.videos.length,
      },
    });
  } catch (error) {
    console.error("Error in getCourseProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course progress",
      error: error.message,
    });
  }
};

// Get progress for all enrolled courses
const getAllCoursesProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all progress entries for the user
    const progressEntries = await UserProgress.find({ user: userId })
      .populate({
        path: 'course',
        select: 'title videos',
      });

    const progressData = progressEntries.map(entry => ({
      courseId: entry.course._id,
      courseTitle: entry.course.title,
      completionPercentage: entry.completionPercentage,
      watchedVideos: entry.watchedVideos,
      totalVideos: entry.course.videos.length,
    }));

    res.status(200).json({
      success: true,
      count: progressData.length,
      progress: progressData,
    });
  } catch (error) {
    console.error("Error in getAllCoursesProgress:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching progress for all courses",
      error: error.message,
    });
  }
};

export { markVideoWatched, getCourseProgress, getAllCoursesProgress };