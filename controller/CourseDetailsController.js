import Course from "../models/CourseModel.js";
import Purchase from "../models/PurchaseModel.js";
import User from "../models/userModel.js";

/**
 * Get detailed information about a specific course
 * Includes checking if the user is enrolled
 */
const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find the course with populated instructor details
    const course = await Course.findById(courseId)
      .populate('instructor', 'firstname lastname email profileImage')
      .populate('reviews.user', 'firstname lastname profileImage');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if the user is enrolled in this course
    let isEnrolled = false;
    let userPurchase = null;
    
    if (req.user) {
      // Check enrollment through purchases
      userPurchase = await Purchase.findOne({
        user: req.user._id,
        course: courseId,
        status: { $in: ['active', 'completed'] }
      });
      
      isEnrolled = !!userPurchase;
      
      // Also check if the course is in user's enrolledCourses array
      if (!isEnrolled) {
        const user = await User.findById(req.user._id);
        isEnrolled = user.enrolledCourses && user.enrolledCourses.includes(courseId);
      }
    }

    // Format videos to include preview information
    const formattedVideos = course.videos.map((video, index) => {
      return {
        id: video._id || index,
        title: video.title,
        description: video.description,
        duration: video.duration,
        videoUrl: isEnrolled ? video.url : (index === 0 ? course.previewVideo : null),
        isPreview: index === 0 // Mark first video as preview
      };
    });

    // Format the response
    const courseDetails = {
      _id: course._id,
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      category: course.category,
      thumbnail: course.thumbnail,
      previewVideo: course.previewVideo,
      duration: course.duration,
      price: course.price,
      rating: course.rating,
      reviews: course.reviews,
      enrolledStudents: course.enrolledStudents.length,
      status: course.status,
      createdAt: course.createdAt,
      content: formattedVideos,
      isEnrolled: isEnrolled,
      learningOutcomes: course.learningOutcomes || [],
      requirements: course.requirements || []
    };

    res.status(200).json({
      success: true,
      course: courseDetails
    });
  } catch (error) {
    console.error("Error in getCourseDetails:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course details",
      error: error.message
    });
  }
};

/**
 * Check if a user is enrolled in a specific course
 */
const checkEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    // Check enrollment through purchases
    const purchase = await Purchase.findOne({
      user: req.user._id,
      course: courseId,
      status: { $in: ['active', 'completed'] }
    });
    
    let isEnrolled = !!purchase;
    
    // Also check if the course is in user's enrolledCourses array
    if (!isEnrolled) {
      const user = await User.findById(req.user._id);
      isEnrolled = user.enrolledCourses && user.enrolledCourses.includes(courseId);
    }
    
    res.status(200).json({
      success: true,
      isEnrolled,
      purchaseDetails: purchase
    });
  } catch (error) {
    console.error("Error in checkEnrollmentStatus:", error);
    res.status(500).json({
      success: false,
      message: "Error checking enrollment status",
      error: error.message
    });
  }
};

/**
 * Get a specific video from a course
 * Only allows access if user is enrolled or if it's a preview video
 */
const getCourseVideo = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    
    // Find the course
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    // Find the specific video
    const video = course.videos.id(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }
    
    // Check if user is enrolled or if it's the preview video
    let isEnrolled = false;
    const isPreviewVideo = course.videos.indexOf(video) === 0; // First video is preview
    
    if (req.user) {
      // Check enrollment through purchases
      const purchase = await Purchase.findOne({
        user: req.user._id,
        course: courseId,
        status: { $in: ['active', 'completed'] }
      });
      
      isEnrolled = !!purchase;
      
      // Also check if the course is in user's enrolledCourses array
      if (!isEnrolled) {
        const user = await User.findById(req.user._id);
        isEnrolled = user.enrolledCourses && user.enrolledCourses.includes(courseId);
      }
    }
    
    // If not enrolled and not preview video, deny access
    if (!isEnrolled && !isPreviewVideo) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to access this video"
      });
    }
    
    // Return the video details
    res.status(200).json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        url: video.url
      }
    });
  } catch (error) {
    console.error("Error in getCourseVideo:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching video",
      error: error.message
    });
  }
};

/**
 * Add a course to user's wishlist
 */
const addToWishlist = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    // Add to wishlist if not already there
    const user = await User.findById(req.user._id);
    
    if (!user.wishlist) {
      user.wishlist = [];
    }
    
    if (!user.wishlist.includes(courseId)) {
      user.wishlist.push(courseId);
      await user.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Course added to wishlist"
    });
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error adding course to wishlist",
      error: error.message
    });
  }
};

/**
 * Get related courses based on category
 */
const getRelatedCourses = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find the current course to get its category
    const currentCourse = await Course.findById(courseId);
    
    if (!currentCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    
    // Find related courses in the same category, excluding the current course
    const relatedCourses = await Course.find({
      _id: { $ne: courseId },
      category: currentCourse.category,
      status: 'published'
    })
    .populate('instructor', 'firstname lastname')
    .limit(4)
    .select('title thumbnail price rating instructor duration');
    
    res.status(200).json({
      success: true,
      courses: relatedCourses
    });
  } catch (error) {
    console.error("Error in getRelatedCourses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching related courses",
      error: error.message
    });
  }
};

export {
  getCourseDetails,
  checkEnrollmentStatus,
  getCourseVideo,
  addToWishlist,
  getRelatedCourses
};