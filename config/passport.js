import passport from "passport";
import { Strategy as JwtStrategy } from "passport-jwt";
import dotenv from "dotenv";
import User from "../models/userModel.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
}

const cookieExtractor = (req) => {
    if (req?.cookies?.jwt) {
        return req.cookies.jwt;
    }
    const authHeader = req?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
};

const jwtOptions = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: process.env.JWT_SECRET,
};

const jwtStrategy = new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
        const user = await User.findById(payload.id);
        if (!user) {
            return done(null, false, { message: "User not found" });
        }
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
});

passport.use(jwtStrategy);

export default passport;
