import Purchase from '../models/PurchaseModel.js';
import Course from '../models/CourseModel.js';
import UserSchema from '../models/userModel.js';
import stripe from '../utils/stripe.js';

// Make sure your initiatePurchase function is only returning the clientSecret
// and not setting any redirect URLs

export const initiatePurchase = async (req, res) => {
    try {
        const { courseId, paymentType, installmentPlan } = req.body;
        const userId = req.user._id;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        let totalAmount = course.price;
        let installments = [];

        // Create or retrieve Stripe customer
        let customer = await stripe.customers.create({
            email: req.user.email,
            metadata: {
                userId: userId.toString()
            }
        });

        if (paymentType === 'installment') {
            const installmentCount = parseInt(installmentPlan);
            const installmentAmount = Math.ceil(totalAmount / installmentCount);

            for (let i = 0; i < installmentCount; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + i);

                installments.push({
                    amount: installmentAmount,
                    dueDate,
                    status: i === 0 ? 'pending' : 'pending'
                });
            }
        }

        // Create payment intent for first payment
        const paymentIntent = await stripe.paymentIntents.create({
            amount: paymentType === 'full' ? totalAmount * 100 : installments[0].amount * 100,
            currency: 'usd',
            customer: customer.id,
            metadata: {
                courseId: courseId,
                userId: userId.toString()
            }
        });

        const purchase = await Purchase.create({
            user: userId,
            course: courseId,
            totalAmount,
            paymentType,
            installmentPlan: paymentType === 'installment' ? installmentPlan : undefined,
            installments: paymentType === 'installment' ? installments : [],
            stripeCustomerId: customer.id,
            stripePaymentIntentId: paymentIntent.id
        });

        // Make sure you're only returning the clientSecret and not setting any redirects
        return res.status(200).json({ 
            clientSecret: paymentIntent.client_secret,
            // Don't include any redirect URLs here
        });
        
    } catch (error) {
        console.error('Purchase initiation error:', error);
        res.status(500).json({ message: "Error initiating purchase" });
    }
};
export const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        const userId = req.user._id;

        // Verify the payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        // Find the purchase associated with this payment intent
        const purchase = await Purchase.findOne({ stripePaymentIntentId: paymentIntentId });
        
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase record not found"
            });
        }

        // Verify that the purchase belongs to the current user
        if (purchase.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access to this purchase"
            });
        }

        // Update purchase status based on payment type
        if (purchase.paymentType === 'full') {
            purchase.status = 'completed';
        } else if (purchase.paymentType === 'installment') {
            // Mark the first installment as paid
            if (purchase.installments && purchase.installments.length > 0) {
                purchase.installments[0].status = 'paid';
                purchase.installments[0].paidAt = new Date();
            }
            
            // Check if all installments are paid
            const allPaid = purchase.installments.every(inst => inst.status === 'paid');
            if (allPaid) {
                purchase.status = 'completed';
            } else {
                purchase.status = 'active';
            }
        }

        await purchase.save();

        // Add the course to user's enrolled courses
        const user = await UserSchema.findById(userId);
        if (!user.enrolledCourses) {
            user.enrolledCourses = [];
        }
        
        if (!user.enrolledCourses.includes(purchase.course)) {
            user.enrolledCourses.push(purchase.course);
            await user.save();
        }

        // Update course enrollment count
        const course = await Course.findById(purchase.course);
        if (course) {
            if (!course.enrolledStudents) {
                course.enrolledStudents = [];
            }
            
            if (!course.enrolledStudents.includes(userId)) {
                course.enrolledStudents.push(userId);
                await course.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Payment confirmed and enrollment completed",
            purchase
        });

    } catch (error) {
        console.error("Error in confirmPayment:", error);
        res.status(500).json({
            success: false,
            message: "Error confirming payment",
            error: error.message
        });
    }
};

// Get students who purchased a professor's courses
export const getProfessorStudents = async (req, res) => {
    try {
        // Verify the user is a professor
        if (req.user.role !== 'professor') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Professor only."
            });
        }

        // Find all courses by this professor
        const professorCourses = await Course.find({ instructor: req.user._id });
        
        if (!professorCourses || professorCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No courses found for this professor"
            });
        }

        // Get course IDs
        const courseIds = professorCourses.map(course => course._id);

        // Find all purchases for these courses
        const purchases = await Purchase.find({ 
            course: { $in: courseIds }
        })
        .populate('user', 'firstname lastname email profileImage')
        .populate('course', 'title price category thumbnail')
        .sort({ createdAt: -1 });

        // Group students by course
        const studentsByCourse = {};
        
        professorCourses.forEach(course => {
            studentsByCourse[course._id] = {
                courseInfo: {
                    _id: course._id,
                    title: course.title,
                    price: course.price,
                    category: course.category,
                    thumbnail: course.thumbnail
                },
                students: []
            };
        });

        // Add students to their respective courses
        purchases.forEach(purchase => {
            const courseId = purchase.course._id.toString();
            
            if (studentsByCourse[courseId]) {
                // Check if student already exists in the array
                const studentExists = studentsByCourse[courseId].students.some(
                    student => student.userId.toString() === purchase.user._id.toString()
                );
                
                if (!studentExists) {
                    studentsByCourse[courseId].students.push({
                        userId: purchase.user._id,
                        name: `${purchase.user.firstname} ${purchase.user.lastname}`,
                        email: purchase.user.email,
                        profileImage: purchase.user.profileImage,
                        purchaseDate: purchase.createdAt,
                        paymentType: purchase.paymentType,
                        status: purchase.status
                    });
                }
            }
        });

        // Convert to array for response
        const result = Object.values(studentsByCourse);

        // Add student count to each course
        result.forEach(course => {
            course.studentCount = course.students.length;
        });

        res.status(200).json({
            success: true,
            courseCount: result.length,
            totalStudents: purchases.length,
            data: result
        });

    } catch (error) {
        console.error("Error in getProfessorStudents:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching students",
            error: error.message
        });
    }
};

// Get all purchases (admin only)
export const getAllPurchases = async (req, res) => {
    try {
        // Verify the user is an admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Query parameters for filtering
        const { courseId, userId, status, paymentType } = req.query;
        
        // Build query object
        const query = {};
        if (courseId) query.course = courseId;
        if (userId) query.user = userId;
        if (status) query.status = status;
        if (paymentType) query.paymentType = paymentType;

        // Find all purchases with filters
        const purchases = await Purchase.find(query)
            .populate('user', 'firstname lastname email profileImage')
            .populate({
                path: 'course',
                select: 'title price category thumbnail',
                populate: {
                    path: 'instructor',
                    select: 'firstname lastname email'
                }
            })
            .sort({ createdAt: -1 });

        // Calculate statistics
        const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const completedPayments = purchases.filter(p => p.status === 'completed').length;
        const activePayments = purchases.filter(p => p.status === 'active').length;
        const defaultedPayments = purchases.filter(p => p.status === 'defaulted').length;

        res.status(200).json({
            success: true,
            count: purchases.length,
            statistics: {
                totalRevenue,
                completedPayments,
                activePayments,
                defaultedPayments
            },
            purchases
        });

    } catch (error) {
        console.error("Error in getAllPurchases:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching purchases",
            error: error.message
        });
    }
};

// Get purchase details for a specific course
export const getCourseStudents = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Verify permissions (admin or course instructor)
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Check if user is admin or the course instructor
        const isAuthorized = 
            req.user.role === 'admin' || 
            course.instructor.toString() === req.user._id.toString();

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You are not authorized to view this information."
            });
        }

        // Find all purchases for this course
        const purchases = await Purchase.find({ course: courseId })
            .populate('user', 'firstname lastname email profileImage')
            .sort({ createdAt: -1 });

        // Extract unique students
        const students = [];
        const studentIds = new Set();

        purchases.forEach(purchase => {
            if (!studentIds.has(purchase.user._id.toString())) {
                studentIds.add(purchase.user._id.toString());
                students.push({
                    userId: purchase.user._id,
                    name: `${purchase.user.firstname} ${purchase.user.lastname}`,
                    email: purchase.user.email,
                    profileImage: purchase.user.profileImage,
                    purchaseDate: purchase.createdAt,
                    paymentType: purchase.paymentType,
                    status: purchase.status,
                    totalAmount: purchase.totalAmount
                });
            }
        });

        // Calculate revenue
        const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

        res.status(200).json({
            success: true,
            courseTitle: course.title,
            studentCount: students.length,
            totalRevenue,
            students
        });

    } catch (error) {
        console.error("Error in getCourseStudents:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching course students",
            error: error.message
        });
    }
};

// Get purchase statistics for a professor
export const getProfessorStats = async (req, res) => {
    try {
        // Verify the user is a professor
        if (req.user.role !== 'professor') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Professor only."
            });
        }

        // Find all courses by this professor
        const professorCourses = await Course.find({ instructor: req.user._id });
        
        if (!professorCourses || professorCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No courses found for this professor"
            });
        }

        // Get course IDs
        const courseIds = professorCourses.map(course => course._id);

        // Find all purchases for these courses
        const purchases = await Purchase.find({ 
            course: { $in: courseIds }
        });

        // Calculate statistics
        const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const totalStudents = new Set(purchases.map(p => p.user.toString())).size;
        
        // Revenue by course
        const revenueByCourse = {};
        professorCourses.forEach(course => {
            revenueByCourse[course._id] = {
                courseTitle: course.title,
                revenue: 0,
                students: 0
            };
        });

        purchases.forEach(purchase => {
            const courseId = purchase.course.toString();
            if (revenueByCourse[courseId]) {
                revenueByCourse[courseId].revenue += purchase.totalAmount;
                revenueByCourse[courseId].students += 1;
            }
        });

        // Monthly revenue (last 6 months)
        const monthlyRevenue = [];
        const today = new Date();
        
        for (let i = 0; i < 6; i++) {
            const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            
            const monthlyPurchases = purchases.filter(p => {
                const purchaseDate = new Date(p.createdAt);
                return purchaseDate >= month && purchaseDate <= monthEnd;
            });
            
            const revenue = monthlyPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            
            monthlyRevenue.push({
                month: month.toLocaleString('default', { month: 'long' }),
                year: month.getFullYear(),
                revenue
            });
        }

        res.status(200).json({
            success: true,
            statistics: {
                totalRevenue,
                totalStudents,
                totalCourses: professorCourses.length,
                revenueByCourse: Object.values(revenueByCourse),
                monthlyRevenue: monthlyRevenue.reverse()
            }
        });

    } catch (error) {
        console.error("Error in getProfessorStats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching professor statistics",
            error: error.message
        });
    }
};

// Add this function to your existing controller
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Add this to your .env file
    
    let event;
    
    try {
        // Verify the event came from Stripe
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handleSuccessfulPayment(paymentIntent);
            break;
        // Add other event types as needed
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.send();
};

// Helper function to handle successful payments
const handleSuccessfulPayment = async (paymentIntent) => {
    try {
        // Find the purchase associated with this payment intent
        const purchase = await Purchase.findOne({ stripePaymentIntentId: paymentIntent.id });
        
        if (!purchase) {
            console.error(`Purchase not found for payment intent: ${paymentIntent.id}`);
            return;
        }
        
        // Update purchase status based on payment type
        if (purchase.paymentType === 'full') {
            purchase.status = 'completed';
        } else if (purchase.paymentType === 'installment') {
            // Mark the first installment as paid
            if (purchase.installments && purchase.installments.length > 0) {
                purchase.installments[0].status = 'paid';
                purchase.installments[0].paidAt = new Date();
            }
            
            // Check if all installments are paid
            const allPaid = purchase.installments.every(inst => inst.status === 'paid');
            if (allPaid) {
                purchase.status = 'completed';
            } else {
                purchase.status = 'active';
            }
        }
        
        await purchase.save();
        
        // Add the course to user's enrolled courses
        const userId = purchase.user;
        const user = await UserSchema.findById(userId);
        
        if (!user.enrolledCourses) {
            user.enrolledCourses = [];
        }
        
        if (!user.enrolledCourses.includes(purchase.course)) {
            user.enrolledCourses.push(purchase.course);
            await user.save();
        }
        
        // Update course enrollment count
        const course = await Course.findById(purchase.course);
        if (course) {
            if (!course.enrolledStudents) {
                course.enrolledStudents = [];
            }
            
            if (!course.enrolledStudents.includes(userId)) {
                course.enrolledStudents.push(userId);
                await course.save();
            }
        }
        
        console.log(`Successfully processed payment for purchase: ${purchase._id}`);
    } catch (error) {
        console.error("Error in handleSuccessfulPayment:", error);
    }
};
