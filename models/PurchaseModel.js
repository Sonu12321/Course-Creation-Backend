import mongoose from "mongoose";

const InstallmentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    },
    stripePaymentIntentId: String,
    paidAt: Date
});

const PurchaseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentType: {
        type: String,
        enum: ['full', 'installment'],
        required: true
    },
    installmentPlan: {
        type: String,
        enum: ['6', '12', '24'],
        required: function() {
            return this.paymentType === 'installment';
        }
    },
    installments: [InstallmentSchema],
    status: {
        type: String,
        enum: ['active', 'completed', 'defaulted'],
        default: 'active'
    },
    stripeCustomerId: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Add these fields to your existing Purchase model schema
    completedVideos: {
        type: [String], // Array of video IDs that have been completed
        default: []
    },
    progress: {
        type: Number, // Percentage of course completed (0-100)
        default: 0
    },
    completionStatus: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    }
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);
export default Purchase;