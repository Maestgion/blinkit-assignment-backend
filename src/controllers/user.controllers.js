import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { options } from "../constants.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendMail.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "error occured while generating access and refresh tokens"
        );
    }
};

const generatePasswordResetToken = async (userId)=>{
    try{
        const user = await User.findBy(userId)
        const token = user.generatePasswordResetToken()
        user.resetPasswordToken = token
        await user.save({ validateBeforeSave: false });
        return token
    }catch(error){
        throw new ApiError(
            500,
            "error occured while generating password reset token"
        );
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;

    if (
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "Please fill all the details");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "user with same email or username already exists"
        );
    }

    const avatarLocalPath = await req.files?.avatar[0]?.path;

    let coverImageLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(404, "Avatar file not found please try again");
    }

    if (!coverImage) {
        throw new ApiError(404, "coverImage file not found please try again");
    }

    const user = await User.create({
        fullName,
        username,
        email,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        password,
    });

    const createdUser = await User.findById({ _id: user._id }).select(
        "-password -refreshToken -resetPasswordToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Server error while creating the account");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully!")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new ApiError(400, "Please fill all the details");
    }

    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(404, "user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // updated user
    const loggedUser = await User.findById({ _id: user._id }).select(
        "-password -__v -refreshToken -resetPasswordToken"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedUser },
                "user logged in successfully"
            )
        );
});

const forgotPassword = asyncHandler(async(req, res)=>{
    const {email} = req.body

    if(!email)
    {
        throw new ApiError(400,"Email field cannot be empty")
    }

    const user = await User.findOne({email})

    if(!user)
    {
        throw new ApiError(404,'No account with this email found')
    }

    const {token} = await generatePasswordResetToken(user._id)

    const resetLink =  `${process.env.CORS_ORIGIN}/users/api/v1/#/reset-password?token=${token}&id=${user._id}`

    const mailParams = {
        recipientLink: email,
        targetLink: resetLink,
        subject: "Password Reset",
        message: "Click on the given link to reset your password"
    }

    const mailInfo = await sendMail(mailParams)

    if(!mailInfo.messageId)
    {
        throw new ApiError(500, "Something went wrong while sending password reset mail!")
    }

    return res.status(200).json(
        new ApiResponse(200, mailInfo.messageId, "Password reset mail sent successfully")
    )
    
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {


    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "unauthorized request");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        const updatedUser = await User.findById(user._id).select("-password -refreshToken")

        return res.status(200)
               .cookie("accessToken", accessToken, options)
               .cookie("refreshToken", refreshToken, options)
               .json(
                new ApiResponse(200, updatedUser, "token refreshed successfully")
               );


    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "something went wrong while refreshing the tokens"
        );
    }
});


const changePassword = asyncHandler(async(req, res)=>{

   const {oldPassword, newPassword} = req.body

   if(!oldPassword || !newPassword)
   {
    throw new ApiError(400, "Please fill all the details")
   }

   const user = await User.findById(req.user?._id)

   if(!user)
   {
    throw new ApiError(404, "user not found")
   }
   
   const isPasswordValid = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordValid)
   {
    throw new ApiError(401, "give the correct old password")
   }

   user.password = newPassword
   await user.save()

   return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"))

})

const resetPassword = asyncHandler(async (req, res)=>{
    const resetPasswordToken = req.query.token
    const _id = req.query.id
    const {newPassword} = req.body

    if(!resetPasswordToken  || !_id){
        throw new ApiError( 400,"Invalid URL");
    }

    const user = await User.findById(_id)

    if(!user)
    {
        throw new ApiError(404, "User Not Found")
    }

    if(resetPasswordToken!==user.resetPasswordToken)
    {
        throw new ApiError(400, "Invalid Token")
    }


    
    await User.findByIdAndUpdate(_id, 
        {
            $set: {
                password: newPassword
            },
            $unset: {
                resetPasswordToken: 1
            }, 
           
        }, 
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, {}, "password update successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res)=>{

    const { username, fullName, email } = req.body;

    if (!username && !fullName && !email) {
        throw new ApiError(400, "Please provide all fields");
    }

    const user = await User.findById(req.user?._id)

    if (fullName) user.fullName = fullName;
    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

   

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                fullName: user.fullName,
                username: user.username,
                email: user.email
            },
            "account details updated successfully"
        )
    );
}
)

const updateUserAvatar = asyncHandler(async (req, res) => {
    
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "No image provided");
    }

    const avatar = await cloudinaryUpload(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Server Error : Failed to upload Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar?.url,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(200, user, "avatar updated successfully");
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  
    const coverImagaeLocalPath = req.file?.path;

    if (!coverImagaeLocalPath) {
        throw new ApiError(400, "No image provided");
    }

    const coverImagae = await cloudinaryUpload(avatarLocalPath);

    if (!coverImagae.url) {
        throw new ApiError(500, "Server Error : Failed to upload Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImagae: coverImagae?.url,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(200, user, "cover image updated successfully");
});


const getCurrentUser = asyncHandler(async (req, res) => {
    
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, forgotPassword, resetPassword , updateAccountDetails, updateUserAvatar, updateUserCoverImage, getCurrentUser};
