// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('matrimonial');

// Create indexes for better performance
print('Creating indexes...');

// Users collection indexes
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ createdAt: -1 });
print('Users indexes created');

// Profiles collection indexes
db.profiles.createIndex({ user: 1 }, { unique: true });
db.profiles.createIndex({ 'basicInfo.gender': 1 });
db.profiles.createIndex({ 'basicInfo.dateOfBirth': 1 });
db.profiles.createIndex({ 'basicInfo.religion': 1 });
db.profiles.createIndex({ 'address.state': 1 });
db.profiles.createIndex({ 'address.currentCity': 1 });
db.profiles.createIndex({ isActive: 1 });
db.profiles.createIndex({ lastActive: -1 });
db.profiles.createIndex({ createdAt: -1 });
db.profiles.createIndex({ 'verification.isProfileComplete': 1 });
db.profiles.createIndex({ 'subscription.plan': 1 });
print('Profiles indexes created');

// Interests collection indexes
db.interests.createIndex({ sender: 1, receiver: 1 }, { unique: true });
db.interests.createIndex({ sender: 1 });
db.interests.createIndex({ receiver: 1 });
db.interests.createIndex({ status: 1 });
db.interests.createIndex({ createdAt: -1 });
print('Interests indexes created');

// Matches collection indexes
db.matches.createIndex({ user1: 1, user2: 1 });
db.matches.createIndex({ user1: 1, status: 1 });
db.matches.createIndex({ matchScore: -1 });
db.matches.createIndex({ createdAt: -1 });
print('Matches indexes created');

// Notifications collection indexes
db.notifications.createIndex({ user: 1, isRead: 1 });
db.notifications.createIndex({ user: 1, createdAt: -1 });
print('Notifications indexes created');

// Reports collection indexes
db.reports.createIndex({ reportedUser: 1 });
db.reports.createIndex({ reportedBy: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ createdAt: -1 });
print('Reports indexes created');

// OTPs collection indexes
db.otps.createIndex({ phone: 1, type: 1 });
db.otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
print('OTPs indexes created');

// Create admin user
print('Creating default admin user...');
db.admins.insertOne({
  name: 'Super Admin',
  email: 'admin@matrimonial.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.o.4Q.X1Z6.6GzS', // password: Admin@123
  role: 'super_admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
print('Default admin created (email: admin@matrimonial.com, password: Admin@123)');

print('MongoDB initialization completed!');