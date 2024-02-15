import { Router } from "express";
import { changePassword, forgotPassword, loginUser, logoutUser, refreshAccessToken, registerUser, resetPassword } from "../controllers/user.controllers.js"
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



export default router;