import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { options } from "../constants.js";

const generateTokens = async (userId) => {
    try {
        const user = await User.findOne({ _id: userId });
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(
            500,
            "error occured while generating access and refresh tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;

    if (
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "Please fill all the details");
    }

    console.log(email);

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
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Server error while creating the account");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
    //  generate a token and send it back to client side

    const { username, password } = req.body;

    if (!username || !password) {
        throw new ApiError(400, "Please fill all the details");
    }

    const user = await User.findOne({ username })
    if (!user) {
        throw new ApiError(404, "user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    // updated user
    const loggedUser = await User.findById({_id: user._id}).select(
        "-password -__v -refreshToken"
    );


    res.status(200)
    .cookie("accessToken", options)
    .cookie("refreshToken", options)
    .json(new ApiResponse(200, {user: loggedUser, accessToken, refreshToken}, "user logged in successfully"))
});

export { registerUser, loginUser };
