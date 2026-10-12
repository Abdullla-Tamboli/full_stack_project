import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, maxlength: 254 },
  courseInterest: { type: String, required: true, maxlength: 200 },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  claimedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
enquirySchema.index({ claimedBy: 1, createdAt: -1 });

export const Employee = mongoose.model('Employee', employeeSchema);
export const Enquiry = mongoose.model('Enquiry', enquirySchema);

export function employeeJSON(employee) {
  return { id: String(employee._id), name: employee.name, email: employee.email, createdAt: employee.createdAt };
}
export function enquiryJSON(enquiry) {
  return {
    id: String(enquiry._id), name: enquiry.name, email: enquiry.email,
    courseInterest: enquiry.courseInterest,
    claimedBy: enquiry.claimedBy ? String(enquiry.claimedBy) : null,
    claimedAt: enquiry.claimedAt, createdAt: enquiry.createdAt,
  };
}
