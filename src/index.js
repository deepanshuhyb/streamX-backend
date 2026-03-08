import dotenv from "dotenv";
import { connectDB } from "./configs/database.ts";
import app from "./app.ts";

dotenv.config({
  path: "./.env",
});

const startServer = async () => {
  try {
    // await connectDB();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};
startServer();


