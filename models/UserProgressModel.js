import mongoose, { Schema } from "mongoose";

const UserProgressSchema = new Schema({
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
  watchedVideos: [{
    type: String, // Store video URLs to identify watched videos
    required: true,
  }],
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Ensure unique combination of user and course
UserProgressSchema.index({ user: 1, course: 1 }, { unique: true });

// Method to calculate completion percentage
UserProgressSchema.methods.calculateCompletionPercentage = async function() {
  const course = await mongoose.model('Course').findById(this.course);
  if (!course || !course.videos || course.videos.length === 0) return 0;
  
  const totalVideos = course.videos.length;
  const watchedVideos = this.watchedVideos.length;
  return (watchedVideos / totalVideos) * 100;
};

// Update completion percentage before saving
UserProgressSchema.pre('save', async function(next) {
  this.completionPercentage = await this.calculateCompletionPercentage();
  this.lastUpdated = Date.now();
  next();
});

const UserProgress = mongoose.model("UserProgress", UserProgressSchema);
export default UserProgress;