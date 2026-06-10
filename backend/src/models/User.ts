import mongoose, { Document, Schema } from 'mongoose';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  role: string;
}

const UserSchema = new Schema<User & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const UserModel = mongoose.model<User & Document>('User', UserSchema);
export default UserModel;
