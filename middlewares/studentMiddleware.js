import StudentSchema from '../models/studentsModel.js';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const Studentauth = async(req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
        if(!token){
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await StudentSchema.findById(decoded._id);
        
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        req.user = user;
        next();
    } catch(err) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export default Studentauth