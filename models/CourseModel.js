import mongoose, { Schema } from "mongoose";

// Video Subdocument Schema
const VideoSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true
  }
}, { _id: false });

// Course Schema
const CourseSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ["Development", "Business", "Finance", "IT", "Design", "Marketing", "Music", "Other"]
  },
  thumbnail: {
    type: String,
    required: true,
  },
  previewVideo: {
    type: String,
    required: true,
  },
  videos: {
    type: [VideoSchema],
    default: [],
  },
  duration: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for better search performance
CourseSchema.index({ title: 'text', description: 'text' });

// Method to calculate average rating
CourseSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) return 0;
  
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / this.reviews.length;
};

// Update rating when reviews are modified
CourseSchema.pre('save', function(next) {
  if (this.isModified('reviews')) {
    this.rating = this.calculateAverageRating();
  }
  next();
});

const Course = mongoose.model("Course", CourseSchema);
export default Course;
    