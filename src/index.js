import dotenv from "dotenv"
import connectDB from "./db/index.js"
import app from "./app.js"

dotenv.config()

connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log("Express app error: ", error?.message)
        
    })


    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server running on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("MongoDB connection error: ", error?.message)
})