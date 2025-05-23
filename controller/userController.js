import UserSchema from "../models/userModel.js";
import { v4 as uuidv4 } from 'uuid';
import { sendverificationEmail, sendWelcomeEmail,  sendResetSuccessEmail, SentResetP } from "../utils/Emails.js";
import crypto from 'crypto';
import { fileuploader } from '../utils/cloudinary.js';
import Course from "../models/CourseModel.js";
import Purchase from "../models/PurchaseModel.js"; // Add this import

// Register new user
export const userRegister = async (req, res) => {
    try {
        const { firstname, lastname, email, password, role } = req.body;

        // Check if user already exists
        let user = await UserSchema.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
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
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create new user
        user = await UserSchema.create({
            firstname,
            lastname,
            email,
            password,
            role: role || 'user',
            profileImage,
            verificationToken,
            verificationTokenExpiresAt,
            isVerified: false
        });

        // Send verification email
        await sendverificationEmail(email, verificationToken);

        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email to verify your account."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify email
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        
        // Find user with this verification token
        const user = await UserSchema.findOne({
            verificationToken: token,
            verificationTokenExpiresAt: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token"
            });
        }
        
        // Update user as verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();
        
        // Send welcome email
        await sendWelcomeEmail(user.email, user.firstname);
        
        res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now log in."
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Login user
export const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserSchema.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

       

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = user.generateAuthToken();

        res.status(200).json({
            success: true,
            token,
            user: {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Forgot password
export const ThisIsTO = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await UserSchema.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

        await user.save();

        // Send the actual token in the email instead of just a URL
        await SentResetP(user.email, resetToken);

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

// Reset password
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Find user with this reset token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await UserSchema.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiresAt: { $gt: Date.now() }
        }).select('+password');
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }
        
        // Update password and clear reset token
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();
        
        // Send reset success email
        await sendResetSuccessEmail(user.email);

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

// Show user profile
export const ShowUserProfile = async (req, res) => {
    try {
        const user = await UserSchema.findById(req.user._id);
        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update profile
export const updateProfile = async (req, res) => {
    try {
        const { firstname, lastname } = req.body;
        const updateData = { firstname, lastname };
        
        // Handle profile image upload
        if (req.file) {
            const result = await fileuploader(req.file.path);
            if (result) {
                updateData.profileImage = result.url;
            }
        }

        const user = await UserSchema.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete profile
export const deleteProfile = async (req, res) => {
    try {
        await UserSchema.findByIdAndDelete(req.user._id);
        
        res.status(200).json({
            success: true,
            message: "Profile deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all users (admin only)
export const GetallUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const users = await UserSchema.find();
        
        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle user role (admin only)
export const toggleUserRole = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const { userId, newRole } = req.body;
        if (!['admin', 'professor', 'user'].includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified"
            });
        }

        const user = await UserSchema.findByIdAndUpdate(
            userId,
            { role: newRole },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user by admin
export const deleteUserByAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        const { userId } = req.params;
        const user = await UserSchema.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add these functions to your existing userController.js

// Get Professor Profile
export const getProfessorProfile = async (req, res) => {
    try {
        // Get professor ID from authenticated user
        const professorId = req.user._id;
        
        // Find professor by ID
        const professor = await UserSchema.findById(professorId);
        
        if (!professor) {
            return res.status(404).json({
                success: false,
                message: "Professor not found"
            });
        }
        
        // Return professor data
        res.status(200).json({
            success: true,
            professor: {
                _id: professor._id,
                firstname: professor.firstname,
                lastname: professor.lastname,
                email: professor.email,
                bio: professor.bio,
                expertise: professor.expertise,
                profileImage: professor.profileImage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update Professor Profile
export const updateProfessorProfile = async (req, res) => {
    try {
        const professorId = req.user._id;
        const { firstName, lastName, email, bio, expertise, currentPassword, newPassword } = req.body;
        
        // Find professor
        const professor = await UserSchema.findById(professorId).select('+password');
        
        if (!professor) {
            return res.status(404).json({
                success: false,
                message: "Professor not found"
            });
        }
        
        // Update basic info
        professor.firstname = firstName;
        professor.lastname = lastName;
        professor.email = email;
        professor.bio = bio;
        professor.expertise = expertise;
        
        // Handle profile image if uploaded
        if (req.file) {
            const result = await fileuploader(req.file.path);
            if (result) {
                professor.profileImage = result.url;
            }
        }
        
        // Handle password change if requested
        if (currentPassword && newPassword) {
            // Verify current password
            const isPasswordMatch = await professor.comparePassword(currentPassword);
            if (!isPasswordMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect"
                });
            }
            
            // Set new password
            professor.password = newPassword;
        }
        
        // Save updated professor
        await professor.save();
        
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            professor: {
                _id: professor._id,
                firstname: professor.firstname,
                lastname: professor.lastname,
                email: professor.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const ProfessorProfile = async (req, res) => {
    try {
        const professor = await UserSchema.findOne({ _id: req.user._id, role: 'professor' });
        
        if (!professor) {
            return res.status(404).json({
                success: false,
                message: "Professor not found"
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
            professor,
            count: courses.length,
            courses
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user course completion status
export const getUserCourseCompletionStatus = async (req, res) => {
    try {
        // Check if user is a professor
        if (req.user.role !== 'professor') {
            return res.status(403).json({
                success: false,
                message: "Only professors can check course completion status"
            });
        }

        const { courseId, userId } = req.params;

        // Verify the course belongs to the professor
        const course = await Course.findOne({
            _id: courseId,
            instructor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or you don't have permission to access this data"
            });
        }

        // Find the user
        const user = await UserSchema.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if the user has purchased the course
        const purchase = await Purchase.findOne({
            userId: userId,
            courseId: courseId
        });

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "User has not enrolled in this course"
            });
        }

        // Return completion status
        res.status(200).json({
            success: true,
            courseId: courseId,
            userId: userId,
            userName: `${user.firstname} ${user.lastname}`,
            userEmail: user.email,
            completionStatus: purchase.completionStatus,
            progress: purchase.progress,
            enrolledAt: purchase.createdAt,
            lastUpdated: purchase.updatedAt,
            isCompleted: purchase.completionStatus === 'completed'
        });

    } catch (error) {
        console.error("Error checking course completion status:", error);
        res.status(500).json({
            success: false,
            message: "Error checking course completion status",
            error: error.message
        });
    }
};

// Get all users' completion status for a course
export const getCourseCompletionStats = async (req, res) => {
    try {
        // Check if user is a professor
        if (req.user.role !== 'professor') {
            return res.status(403).json({
                success: false,
                message: "Only professors can access course completion statistics"
            });
        }

        const { courseId } = req.params;

        // Verify the course belongs to the professor
        const course = await Course.findOne({
            _id: courseId,
            instructor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found or you don't have permission to access this data"
            });
        }

        // Find all purchases for this course
        const purchases = await Purchase.find({ courseId: courseId })
            .populate('userId', 'firstname lastname email profileImage');

        if (!purchases || purchases.length === 0) {
            return res.status(200).json({
                success: true,
                courseId: courseId,
                courseTitle: course.title,
                enrollmentCount: 0,
                completionCount: 0,
                completionRate: 0,
                students: []
            });
        }

        // Calculate statistics
        const totalEnrollments = purchases.length;
        const completedEnrollments = purchases.filter(p => p.completionStatus === 'completed').length;
        const inProgressEnrollments = purchases.filter(p => p.completionStatus === 'in-progress').length;
        const notStartedEnrollments = purchases.filter(p => p.completionStatus === 'not-started').length;
        const completionRate = (completedEnrollments / totalEnrollments) * 100;

        // Format student data
        const students = purchases.map(purchase => ({
            userId: purchase.userId._id,
            name: `${purchase.userId.firstname} ${purchase.userId.lastname}`,
            email: purchase.userId.email,
            profileImage: purchase.userId.profileImage,
            completionStatus: purchase.completionStatus,
            progress: purchase.progress,
            enrolledAt: purchase.createdAt,
            lastUpdated: purchase.updatedAt
        }));

        res.status(200).json({
            success: true,
            courseId: courseId,
            courseTitle: course.title,
            stats: {
                enrollmentCount: totalEnrollments,
                completedCount: completedEnrollments,
                inProgressCount: inProgressEnrollments,
                notStartedCount: notStartedEnrollments,
                completionRate: completionRate.toFixed(2)
            },
            students: students
        });

    } catch (error) {
        console.error("Error fetching course completion statistics:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching course completion statistics",
            error: error.message
        });
    }
};