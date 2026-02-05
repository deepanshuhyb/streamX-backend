import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      process.env.MONGO_URI as string,
    );
    console.log(
      "MongoDB connected successfully",
      connectionInstance.connection.host,
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
