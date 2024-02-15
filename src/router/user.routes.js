import { Router } from "express";
import { changePassword, forgotPassword, loginUser, logoutUser, refreshAccessToken, registerUser, resetPassword, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getCurrentUser } from "../controllers/user.controllers.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
    )
    
router.route('/login').post(loginUser)

router.route('/forgot-password').post(forgotPassword)

router.route('/#/reset-password').patch(resetPassword)

// secured routes

router.route('/logout').post(verifyToken ,logoutUser)

router.route('/refresh-token').post(verifyToken, refreshAccessToken)

router.route('/change-password').patch(verifyToken, changePassword)

router.route('/update-account').patch(verifyToken, updateAccountDetails)

router.route('/update-avatar').patch(verifyToken, upload.single('avatar'), updateUserAvatar)

router.route('/update-cover-image').patch(verifyToken, upload.single('coverImage'), updateUserCoverImage)

router.route('/current-user').get(verifyToken, getCurrentUser)


export default router;