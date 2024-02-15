import mongoose from "mongoose"

const connectDB = async ()=>{

    try{

        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI)

        console.log(`\n MongoDB connected!! DB Host: ${connectionInstance.connection.host} \n`)

    }catch(error){
        console.log("Error occured while connecting to database: ", error?.message)
        process.exit(1);
    }

}

export default connectDB;