import UserSchema from "../models/userModel.js";
import { v4 as uuidv4 } from 'uuid';
import { sendverificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../utils/Emails.js";
import crypto from 'crypto';
import { fileuploader } from '../utils/cloudinary.js';
import Purchase from "../models/PurchaseModel.js";
import Course from "../models/CourseModel.js";

// Student Registration
export const studentRegister = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        // Check if student already exists
        let student = await UserSchema.findOne({ email });
        if (student) {
            return res.status(400).json({
                success: false,
                message: "Student already exists"
            });
        }

        // Handle profile image upload
        let profileImage = undefined;
        if (req.file) {
            const result = await fileuploader(req.file.path);
            if (result) {
                profileImage = result.url;
            }
        }

        // Generate verification token
  const verificationToken = uuidv4();
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Create new student with default role as 'user'
        student = await UserSchema.create({
            firstname,
            lastname,
            email,
            password,
            role: 'user', // Setting default role as user
            profileImage,
            verificationToken,
            verificationTokenExpiresAt,
            isVerified: false
        });

        // Send verification email
 
        res.status(201).json({
            success: true,
            student: {
                _id: student._id,
                firstname: student.firstname,
                lastname: student.lastname,
                email: student.email,
                profileImage: student.profileImage
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify student email

// Student Login
export const LoginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await UserSchema.findOne({ email, role: 'user' }).select('+password');
        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

     

        const isPasswordMatch = await student.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = student.generateAuthToken();

        res.status(200).json({
            success: true,
            token,
            student: {
                _id: student._id,
                firstname: student.firstname,
                lastname: student.lastname,
                email: student.email,
                profileImage: student.profileImage
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Student Forgot Password
export const forgotPasswordStudent = async (req, res) => {
    try {
        const { email } = req.body;

        const student = await UserSchema.findOne({ email, role: 'user' });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        student.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        student.resetPasswordExpiresAt = Date.now() + 30 * 60 * 1000;

        await student.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/student/reset-password/${resetToken}`;
        await sendPasswordResetEmail(student.email, resetUrl);

        res.status(200).json({
            success: true,
            message: "Password reset email sent"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Student Reset Password
export const StudentresetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const student = await UserSchema.findById(req.user._id).select('+password');

        if (student.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        student.password = newPassword;
        await student.save();
        
        // Send reset success email
        await sendResetSuccessEmail(student.email);

        res.status(200).json({
            success: true,
            message: "Password reset successful"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Show Student Profile
export const ShowStudentProfile = async (req, res) => {
    try {
        const student = await UserSchema.findOne({ _id: req.user._id, role: 'user' });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.status(200).json({
            success: true,
            student
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Student Profile
export const updateStudentProfile = async (req, res) => {
    try {
        const { firstName, lastname, firstname, lastName, email } = req.body;

        // Build update data only if values are provided
        const updateData = {};
        if (firstname || firstName) updateData.firstname = (firstname || firstName).trim();
        if (lastname || lastName) updateData.lastname = (lastname || lastName).trim();
        if (email) updateData.email = email.trim().toLowerCase();


        // Check for duplicate email if it's being updated
        if (updateData.email) {
            const emailExists = await UserSchema.findOne({ email: updateData.email });
            if (emailExists && emailExists._id.toString() !== req.user._id.toString()) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already in use by another user.",
                });
            }
        }

        // Handle profile image upload
        if (req.file) {
            const result = await fileuploader(req.file.path);
            if (result) {
                updateData.profileImage = result.url;
            }
        }

        // Handle password update if provided
        if (req.body.currentPassword && req.body.newPassword) {
            const user = await UserSchema.findById(req.user._id).select('+password');

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const isPasswordMatch = await user.comparePassword(req.body.currentPassword);
            if (!isPasswordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Current password is incorrect",
                });
            }

            user.password = req.body.newPassword;
            await user.save();
        }

        console.log("Update data:", updateData);

        // Update user profile
        const updatedUser = await UserSchema.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log("Updated user:", updatedUser);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while updating profile",
        });
    }
};


// Delete Student Profile
export const deleteStudentProfile = async (req, res) => {
    try {
        const student = await UserSchema.findOneAndDelete({ 
            _id: req.user._id, 
            role: 'user' 
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Student profile deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// After the existing controllers, add these new ones:

// Get Student Enrolled Courses
export const getEnrolledCourses = async (req, res) => {
    try {
        // Find all purchases for this student
        const purchases = await Purchase.find({ 
            user: req.user._id,
            status: { $in: ['active', 'completed'] } // Only active or completed purchases
        }).populate({
            path: 'course',
            select: 'title subtitle description thumbnail price duration instructor content' // Select fields you want
        });

        if (!purchases || purchases.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No enrolled courses found",
                courses: []
            });
        }

        // Extract course information from purchases
        const enrolledCourses = purchases.map(purchase => {
            return {
                courseId: purchase.course._id,
                courseDetails: purchase.course,
                enrollmentDate: purchase.createdAt,
                paymentType: purchase.paymentType,
                status: purchase.status,
                purchaseId: purchase._id
            };
        });

        res.status(200).json({
            success: true,
            count: enrolledCourses.length,
            courses: enrolledCourses
        });

    } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching enrolled courses"
        });
    }
};

// Get Student Pending Installments
export const getPendingInstallments = async (req, res) => {
    try {
        // Find all purchases with installment payment type for this student
        const installmentPurchases = await Purchase.find({ 
            user: req.user._id,
            paymentType: 'installment',
            status: 'active' // Only active purchases
        }).populate({
            path: 'course',
            select: 'title thumbnail price' // Basic course info
        });

        if (!installmentPurchases || installmentPurchases.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No installment plans found",
                installments: []
            });
        }

        // Extract pending installments from all purchases
        const pendingInstallments = [];
        
        installmentPurchases.forEach(purchase => {
            const pendingForCourse = purchase.installments
                .filter(installment => installment.status === 'pending' || installment.status === 'overdue')
                .map(installment => {
                    return {
                        installmentId: installment._id,
                        amount: installment.amount,
                        dueDate: installment.dueDate,
                        status: installment.status,
                        courseTitle: purchase.course.title,
                        courseThumbnail: purchase.course.thumbnail,
                        purchaseId: purchase._id
                    };
                });
                
            pendingInstallments.push(...pendingForCourse);
        });

        // Sort by due date (closest first)
        pendingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        res.status(200).json({
            success: true,
            count: pendingInstallments.length,
            installments: pendingInstallments
        });

    } catch (error) {
        console.error("Error fetching pending installments:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching pending installments"
        });
    }
};



export const Reviews = async (req, res) => {
    try {
        const { courseId, rating, comment } = req.body;
        const userId = req.user._id;

        if (!courseId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: "Course ID, rating, and comment are required"
            });
        }

        // Validate rating
        const ratingValue = parseInt(rating);
        if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be a number between 1 and 5"
            });
        }

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Verify that the user has purchased this course
        const purchase = await Purchase.findOne({
            user: userId,
            course: courseId,
            status: { $in: ['active', 'completed'] }
        });

        if (!purchase) {
            return res.status(403).json({
                success: false,
                message: "You must purchase this course to add a review"
            });
        }

        // Check if user has already reviewed this course
        const existingReviewIndex = course.reviews.findIndex(
            review => review.user.toString() === userId.toString() && review.rating > 0
        );

        if (existingReviewIndex !== -1) {
            // Update existing review
            course.reviews[existingReviewIndex].rating = ratingValue;
            course.reviews[existingReviewIndex].comment = comment;
            course.reviews[existingReviewIndex].createdAt = new Date();
        } else {
            // Add new review
            course.reviews.push({
                user: userId,
                rating: ratingValue,
                comment: comment,
                createdAt: new Date()
            });
        }

        // Save the course which will trigger the pre-save hook to recalculate the average rating
        await course.save();

        // Get the updated course with the new average rating
        const updatedCourse = await Course.findById(courseId);

        res.status(201).json({
            success: true,
            message: existingReviewIndex !== -1 ? "Review updated successfully" : "Review added successfully",
            review: {
                user: userId,
                rating: ratingValue,
                comment: comment,
                createdAt: new Date()
            },
            newAverageRating: updatedCourse.rating
        });

    } catch (error) {
        console.error("Error adding/updating review:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error adding/updating review"
        });
    }
}

// Get Course Reviews
export const getCourseReviews = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Populate user information for each review
        const populatedCourse = await Course.findById(courseId).populate({
            path: 'reviews.user',
            select: 'firstname lastname profileImage' // Only select necessary fields
        });

        // Format the reviews for response
        const reviews = populatedCourse.reviews.map(review => {
            return {
                reviewId: review._id,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
                user: {
                    userId: review.user._id,
                    name: `${review.user.firstname} ${review.user.lastname}`,
                    profileImage: review.user.profileImage
                }
            };
        });

        // Sort reviews by date (newest first)
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            count: reviews.length,
            averageRating: course.rating,
            reviews: reviews
        });

    } catch (error) {
        console.error("Error fetching course reviews:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching course reviews"
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { courseId, reviewId } = req.params;
        
        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Check if the user is the instructor of this course or an admin
        if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete reviews for this course"
            });
        }

        // Find the review in the course's reviews array
        const reviewIndex = course.reviews.findIndex(
            review => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        // Remove the review from the array
        course.reviews.splice(reviewIndex, 1);

        // Save the course which will trigger the pre-save hook to recalculate the average rating
        await course.save();

        // Get the updated course with the new average rating
        const updatedCourse = await Course.findById(courseId);

        res.status(200).json({
            success: true,
            message: "Review deleted successfully",
            newAverageRating: updatedCourse.rating
        });

    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error deleting review"
        });
    }
};