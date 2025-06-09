import mongoose, { Schema } from "mongoose";

const CertificateSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  certificateId: {
    type: String,
    required: true,
    unique: true,
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  completionDate: {
    type: Date,
    required: true,
  },
  certificateUrl: {
    type: String,
    required: true,
  },
  verificationUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['issued', 'revoked'],
    default: 'issued',
  },
}, {
  timestamps: true,
});

// Ensure unique combination of user and course
CertificateSchema.index({ user: 1, course: 1 }, { unique: true });

const Certificate = mongoose.model("Certificate", CertificateSchema);
export default Certificate;