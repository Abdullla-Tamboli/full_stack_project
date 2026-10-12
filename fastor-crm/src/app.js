import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Employee, Enquiry, employeeJSON, enquiryJSON } from './models.js';

const ISSUER = 'fastor-crm';
const AUDIENCE = 'fastor-crm-employees';
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
function input(body, key, max) {
  if (!body || typeof body[key] !== 'string') fail(400, `${key} is required`);
  const value = body[key].trim();
  if (!value || value.length > max) fail(400, `${key} must contain 1 to ${max} characters`);
  return value;
}
function emailInput(body) {
  const value = input(body, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400, 'email must be valid');
  return value;
}
function passwordInput(body) {
  const password = body?.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    fail(400, 'password must be at least 8 characters and at most 72 UTF-8 bytes');
  }
  return password;
}
const success = (res, data, status = 200) => res.status(status).json({ success: true, data });

export async function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  const limiter = (limit, windowMs) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { message: 'Too many requests; try again later' } }),
  });
  app.use('/api', limiter(300, 15 * 60 * 1000));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/auth', limiter(30, 15 * 60 * 1000));
  app.post('/api/enquiries', limiter(30, 15 * 60 * 1000));

  // Keep unknown-email and wrong-password login work comparable.
  const dummyHash = await bcrypt.hash('dummy-password-for-timing-only', 12);
  const authenticate = async (req, _res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) fail(401, 'Valid bearer authentication is required');
    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    } catch { fail(401, 'Valid bearer authentication is required'); }
    if (!payload || typeof payload !== 'object' || !mongoose.isObjectIdOrHexString(payload.sub) || !Number.isInteger(payload.exp)) {
      fail(401, 'Valid bearer authentication is required');
    }
    const employee = await Employee.findById(payload.sub);
    if (!employee) fail(401, 'Valid bearer authentication is required');
    req.employee = employee;
    next();
  };

  app.post('/api/auth/register', async (req, res) => {
    const name = input(req.body, 'name', 120);
    const email = emailInput(req.body);
    const password = passwordInput(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const employee = await Employee.create({ name, email, passwordHash });
    success(res, { employee: employeeJSON(employee) }, 201);
  });
  app.post('/api/auth/login', async (req, res) => {
    const email = emailInput(req.body);
    const password = passwordInput(req.body);
    const employee = await Employee.findOne({ email }).select('+passwordHash');
    const matches = await bcrypt.compare(password, employee?.passwordHash || dummyHash);
    if (!employee || !matches) fail(401, 'Invalid email or password');
    const token = jwt.sign({}, config.jwtSecret, {
      algorithm: 'HS256', subject: String(employee._id), expiresIn: config.jwtExpiresIn,
      issuer: ISSUER, audience: AUDIENCE,
    });
    success(res, { token, tokenType: 'Bearer', employee: employeeJSON(employee) });
  });
  app.post('/api/enquiries', async (req, res) => {
    const enquiry = await Enquiry.create({
      name: input(req.body, 'name', 120), email: emailInput(req.body),
      courseInterest: input(req.body, 'courseInterest', 200),
    });
    success(res, { enquiry: enquiryJSON(enquiry) }, 201);
  });
  app.get('/api/enquiries/unclaimed', authenticate, async (_req, res) => {
    const enquiries = await Enquiry.find({ claimedBy: null }).sort({ createdAt: -1, _id: -1 });
    success(res, enquiries.map(enquiryJSON));
  });
  app.get('/api/enquiries/mine', authenticate, async (req, res) => {
    const enquiries = await Enquiry.find({ claimedBy: req.employee._id }).sort({ createdAt: -1, _id: -1 });
    success(res, enquiries.map(enquiryJSON));
  });
  app.patch('/api/enquiries/:id/claim', authenticate, async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) fail(400, 'Invalid enquiry id');
    const enquiry = await Enquiry.findOneAndUpdate(
      { _id: req.params.id, claimedBy: null },
      { $set: { claimedBy: req.employee._id, claimedAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!enquiry) {
      if (!(await Enquiry.exists({ _id: req.params.id }))) fail(404, 'Enquiry not found');
      fail(409, 'Enquiry is already claimed');
    }
    success(res, { enquiry: enquiryJSON(enquiry) });
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'Route not found')));
  app.use((err, _req, res, _next) => {
    let status = err.status || 500;
    let message = status < 500 ? err.message : 'Internal server error';
    if (err.code === 11000) { status = 409; message = 'Email is already registered'; }
    if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
    if (err.type === 'entity.too.large') { status = 413; message = 'Request body is too large'; }
    if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
      status = 400; message = 'Invalid input';
    }
    if (status >= 500) console.error('Request failed:', err.name);
    res.status(status).json({ success: false, error: { message } });
  });
  return app;
}
