import mongoose from 'mongoose';
import ENV from './env';

export async function connectDB(): Promise<void> {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export default connectDB;
