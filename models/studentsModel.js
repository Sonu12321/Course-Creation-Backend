//for admin and professor

import mongoose, { model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const StudentsUser = new Schema({
  firstname: {
    type: String,
    required: true,
    minlength: [3, "First name should be more than 3 characters"],
    maxlength: [20, "First name should be less than 20 characters"],
  },
  lastname: {
    type: String,
    required: true,
    minlength: [3, "Last name should be more than 3 characters"],
    maxlength: [20, "Last name should be less than 20 characters"],
  },

  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      "Please enter a valid email",
    ],
  },
  password: {
    type: String,
    required: true,
    select: false, // Ensure password is not selected by default
  },
  profileImage: {
    type: String,
    default:
      "https://res.cloudinary.com/your-cloud-name/image/upload/v1/users/default-avatar.png",
  },
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpiresAt: Date,
  role:{
    type:String,
    required:true,
    enum:["user","admin"]
  }
});

StudentsUser.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

StudentsUser.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      email: this.email,
      firstname: this.firstname,
      lastname: this.lastname,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return token;
};

StudentsUser.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

StudentsUser.methods.refreshTokenGenerator = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

const StudentSchema = mongoose.model("Students", StudentsUser);
export default StudentSchema;
