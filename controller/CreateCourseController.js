import Course from "../models/CourseModel.js";
import UserSchema from "../models/userModel.js";
import Purchase from "../models/PurchaseModel.js";
import { fileuploader } from '../utils/cloudinary.js';
import { videoUploader } from '../utils/videoUploader.js';

// In CreateCourse function
const CreateCourse = async(req, res) => {
    try {
        // Check if user is a professor
        if (req.user.role !== 'professor') {
            return res.status(403).json({
                success: false,
                message: "Only professors can create courses"
            });
        }

        const { 
            title, 
            description, 
            category, 
            price, 
            duration,
            status
        } = req.body;

        // Validate required fields
        if (!title || !description || !category || !price || !duration) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        // Handle file uploads
        if (!req.files || !req.files.thumbnail || !req.files.previewVideo) {
            return res.status(400).json({
                success: false,
                message: "Thumbnail and preview video are required"
            });
        }

        const thumbnailPath = req.files.thumbnail[0].path;
        const previewVideoPath = req.files.previewVideo[0].path;
        const videoFiles = req.files.videos || [];

        // Upload thumbnail
        const thumbnailUpload = await fileuploader(thumbnailPath, 'image');
        if (!thumbnailUpload) {
            return res.status(400).json({
                success: false,
                message: "Error uploading thumbnail"
            });
        }

        // Upload preview video
        const previewVideoUpload = await videoUploader(previewVideoPath);
        if (!previewVideoUpload) {
            return res.status(400).json({
                success: false,
                message: "Error uploading preview video"
            });
        }

        // Process course videos with custom titles and descriptions from frontend
        const uploadedVideos = [];
        for (let i = 0; i < videoFiles.length; i++) {
            const video = videoFiles[i];
            const videoUpload = await videoUploader(video.path);
            
            if (videoUpload) {
                // Check if custom title/description were provided
                const videoTitle = req.body[`videoTitle_${i}`] || video.originalname;
                const videoDescription = req.body[`videoDescription_${i}`] || `Video: ${video.originalname}`;
                
                uploadedVideos.push({
                    title: videoTitle,
                    url: videoUpload.url,
                    duration: videoUpload.duration,
                    description: videoDescription
                });
            }
        }

        // Create course with uploaded videos
        const course = await Course.create({
            title,
            description,
            instructor: req.user._id,
            category,
            thumbnail: thumbnailUpload.url,
            previewVideo: previewVideoUpload.url,
            videos: uploadedVideos,
            duration,
            price,
            status: status || 'draft'
        });

        // Populate instructor details
        await course.populate('instructor', 'firstname lastname email');

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            course
        });

    } catch (error) {
        console.error("Error in CreateCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error creating course",
            error: error.message
        });
    }
};

const updateCourseStatus = async(req, res) => {
    try {
        const { courseId, status } = req.body;

        // Verify professor owns this course
        const course = await Course.findOne({
            _id: courseId,
            instructor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or unauthorized"
            });
        }

        course.status = status;
        await course.save();

        res.status(200).json({
            success: true,
            message: `Course status updated to ${status}`,
            course
        });

    } catch (error) {
        console.error("Error in updateCourseStatus:", error);
        res.status(500).json({
            success: false,
            message: "Error updating course status",
            error: error.message
        });
    }
};


const updateCourse = async(req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, category, price, duration } = req.body;

        // Find course and verify ownership
        const course = await Course.findOne({
            _id: courseId,
            instructor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or unauthorized"
            });
        }

        // Update basic fields if provided
        if (title) course.title = title;
        if (description) course.description = description;
        if (category) course.category = category;
        if (price) course.price = price;
        if (duration) course.duration = duration;

        // Handle file updates if provided
        if (req.files) {
            // Update thumbnail if provided
            if (req.files.thumbnail) {
                const thumbnailUpload = await fileuploader(req.files.thumbnail[0].path, 'image');
                if (thumbnailUpload) {
                    course.thumbnail = thumbnailUpload.url;
                }
            }

            // Update preview video if provided
            if (req.files.previewVideo) {
                const previewVideoUpload = await videoUploader(req.files.previewVideo[0].path);
                if (previewVideoUpload) {
                    course.previewVideo = previewVideoUpload.url;
                }
            }

            // Update course videos if provided
            if (req.files.videos) {
                const uploadedVideos = [];
                for (const video of req.files.videos) {
                    const videoUpload = await videoUploader(video.path);
                    if (videoUpload) {
                        uploadedVideos.push({
                            title: video.originalname,
                            url: videoUpload.url,
                            duration: videoUpload.duration,
                            description: `Video: ${video.originalname}`
                        });
                    }
                }
                if (uploadedVideos.length > 0) {
                    course.videos = uploadedVideos;
                }
            }
        }

        await course.save();
        await course.populate('instructor', 'firstname lastname email');

        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            course
        });

    } catch (error) {
        console.error("Error in updateCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error updating course",
            error: error.message
        });
    }
};


// professor
const getCourse = async(req,res) => {
    try {
        if (req.user.role !== 'professor' ) {
            return res.status(403).json({
                success: false,
                message: "Only professors can access their courses"
            });
        }

        const courses = await Course.find({ instructor: req.user._id })
            .populate('instructor', 'firstname lastname email')
            .select('-__v')
            .sort({ createdAt: -1 }); // Latest courses first

        if (!courses || courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No courses found"
            });
        }

        res.status(200).json({
            success: true,
            count: courses.length,
            courses
        });

    } catch (error) {
        console.error("Error in getCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching courses",
            error: error.message
        });
    }
};




//for evry users in home
const getAllCourses = async(req, res) => {
    try {
        let query = {};
        const { category, search } = req.query;
        
        // If user is authenticated, show all courses
        if (req.user) {
            // Show all courses for authenticated users
            query = {};
        } else {
            // Show only published courses for public access
            query = { status: 'published' };
        }

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute main query with fields based on auth status
        const courses = await Course.find(query)
            .populate('instructor', 'firstname lastname')
            .select(req.user ? 
                'title description category thumbnail previewVideo price duration instructor status videos' :
                'title description category thumbnail previewVideo price duration instructor')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            courses
        });

    } catch (error) {
        console.error("Error in getAllCourses:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching courses"
        });
    }
};


//seect One Course
const getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        // Find the course
        const course = await Course.findById(courseId)
            .populate('instructor', 'firstname lastname email')  // Updated field names
            .populate('reviews.user', 'firstname lastname email'); // Updated field names

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user has purchased this course
        const purchase = await Purchase.findOne({
            user: userId,
            course: courseId,
            status: { $in: ['active', 'completed'] } // Only active or completed purchases
        });

        // Create a response object with course data
        const courseResponse = {
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
            status: course.status,
            createdAt: course.createdAt,
            updatedAt: course.updatedAt
        };

        // If user has purchased the course, include all videos
        // Otherwise, only include preview video (which is already included above)
        if (purchase) {
            courseResponse.videos = course.videos;
            courseResponse.isPurchased = true;
            
            // Include progress information if available
            courseResponse.progress = purchase.progress;
            courseResponse.completionStatus = purchase.completionStatus;
            courseResponse.completedVideos = purchase.completedVideos;
        } else {
            // For non-purchasers, don't include full videos array
            courseResponse.videos = [];
            courseResponse.isPurchased = false;
        }

        res.status(200).json({
            success: true,
            course: courseResponse
        });
    } catch (error) {
        console.error('Error fetching course by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



    const adminGetAllCourses = async(req, res) => {
        try {
            // Check if user is admin
            if (!['admin', 'user','professor'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Admin and User only."
                });
            }

            // Get all courses with full details
            const courses = await Course.find()
                .populate('instructor', 'firstname lastname email role')
                .select('-__v')
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                count: courses.length,
                courses
            });

        } catch (error) {
            console.error("Error in adminGetAllCourses:", error);
            res.status(500).json({
                success: false,
                message: "Error fetching courses",
                error: error.message
            });
        }
    };

const adminUpdateCourse = async(req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const { courseId } = req.params;
        const { title, description, category, price, duration, status } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Update fields if provided
        if (title) course.title = title;
        if (description) course.description = description;
        if (category) course.category = category;
        if (price) course.price = price;
        if (duration) course.duration = duration;
        if (status) course.status = status;

        await course.save();
        await course.populate('instructor', 'firstname lastname email');

        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            course
        });

    } catch (error) {
        console.error("Error in adminUpdateCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error updating course",
            error: error.message
        });
    }
};

const adminDeleteCourse = async(req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const { courseId } = req.params;
        const course = await Course.findByIdAndDelete(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });

    } catch (error) {
        console.error("Error in adminDeleteCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting course",
            error: error.message
        });
    }
};

const deleteCourse = async(req, res) => {
    try {
        const { courseId } = req.params;
        
        // Verify the course exists and belongs to this professor
        const course = await Course.findOne({
            _id: courseId,
            instructor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or you don't have permission to delete it"
            });
        }

        // Delete the course
        await Course.findByIdAndDelete(courseId);

        res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteCourse:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting course",
            error: error.message
        });
    }
};

// Update the exports
export { 
    CreateCourse, 
    updateCourse, 
    getCourse, 
    getAllCourses,
    adminGetAllCourses,
    adminUpdateCourse,
    adminDeleteCourse,
    deleteCourse,
    updateCourseStatus,
    getCourseById
};

