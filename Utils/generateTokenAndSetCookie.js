import jwt from "jsonwebtoken"

export const generateTokenAndSetCookie = (data, res) => {
    const accessToken = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
    });
    res.cookie("accessToken", accessToken, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true, //Prevent XSS attacks cross-site scripting attacks
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development",
    });

    const refreshToken = jwt.sign(data, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "3d",
    });
    res.cookie("refreshToken", refreshToken, {
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development",
    });
    
    return { accessToken, refreshToken };
}