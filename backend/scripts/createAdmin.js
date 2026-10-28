require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, SCHOOL_ID } = process.env;
  if (!MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env.');
  if (process.env.USE_MEMORY_DB === 'true') throw new Error('Use a persistent MongoDB database (set USE_MEMORY_DB=false) to create the first administrator.');
  if (!ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters) in backend/.env.');
  }
  await mongoose.connect(MONGODB_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email }).select('_id role');
  if (existing) throw new Error('That email already exists. The bootstrap script will not change an existing account.');
  const admin = await User.create({
    name: ADMIN_NAME.trim(),
    email,
    password: ADMIN_PASSWORD,
    role: 'admin',
    schoolId: SCHOOL_ID.trim()
  });
  console.log(`Created administrator account ${admin.email} (${admin._id}). Remove ADMIN_PASSWORD from your environment after setup.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
});
