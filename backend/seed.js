require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Lead = require('./models/Lead');
const LocationLog = require('./models/LocationLog');
const Attendance = require('./models/Attendance');

const marketingAgents = [
  {
    name: 'Rahul Sharma',
    email: 'rahul@fieldtrack.com',
    password: 'password123',
    role: 'Intern',
    isActive: true,
    lastSeen: { lat: 28.6139, lng: 77.2090, timestamp: new Date() } // Delhi
  },
  {
    name: 'Priya Mehta',
    email: 'priya@fieldtrack.com',
    password: 'password123',
    role: 'Intern',
    isActive: true,
    lastSeen: { lat: 19.0760, lng: 72.8777, timestamp: new Date() } // Mumbai
  },
  {
    name: 'Arjun Reddy',
    email: 'arjun@fieldtrack.com',
    password: 'password123',
    role: 'Intern',
    isActive: true,
    lastSeen: { lat: 17.3850, lng: 78.4867, timestamp: new Date() } // Hyderabad
  },
  {
    name: 'Sneha Patel',
    email: 'sneha@fieldtrack.com',
    password: 'password123',
    role: 'Intern',
    isActive: true,
    lastSeen: { lat: 23.0225, lng: 72.5714, timestamp: new Date() } // Ahmedabad
  },
  {
    name: 'Vikram Nair',
    email: 'vikram@fieldtrack.com',
    password: 'password123',
    role: 'Intern',
    isActive: true,
    lastSeen: { lat: 12.9716, lng: 77.5946, timestamp: new Date() } // Bangalore
  }
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  await User.deleteMany({});
  await Lead.deleteMany({});
  await LocationLog.deleteMany({});
  await Attendance.deleteMany({});
  
  await User.create({
    name: 'Admin',
    email: 'admin@fieldtrack.com',
    password: 'password123',
    role: 'Admin'
  });

  // Create marketing agents (password will be hashed by pre-save hook)
  const createdInterns = [];
  for (const agent of marketingAgents) {
    const user = new User(agent);
    await user.save();
    createdInterns.push(user);
  }

  const sampleIntern = createdInterns[0];
  const today = new Date().toISOString().split('T')[0];
  const samplePoints = [
    { lat: 28.6139, lng: 77.2090, minutes: 0, area: 'Connaught Place', city: 'New Delhi' },
    { lat: 28.6151, lng: 77.2128, minutes: 9, area: 'Outer Circle', city: 'New Delhi' },
    { lat: 28.6168, lng: 77.2166, minutes: 18, area: 'Janpath', city: 'New Delhi' },
    { lat: 28.6219, lng: 77.2109, minutes: 37, area: 'Gol Market', city: 'New Delhi' },
    { lat: 28.6255, lng: 77.2081, minutes: 48, area: 'Sansad Marg', city: 'New Delhi' },
    { lat: 28.6289, lng: 77.2065, minutes: 59, area: 'Patel Chowk', city: 'New Delhi' },
    { lat: 28.6324, lng: 77.2148, minutes: 71, area: 'Tilak Marg', city: 'New Delhi' },
    { lat: 28.6353, lng: 77.2244, minutes: 82, area: 'India Gate', city: 'New Delhi' },
    { lat: 28.6384, lng: 77.2311, minutes: 95, area: 'Pragati Maidan Road', city: 'New Delhi' },
  ];

  await Attendance.create({
    userId: sampleIntern._id,
    date: today,
    checkIn: {
      time: new Date(samplePoints[0].minutes * 60000 + new Date(`${today}T09:00:00.000Z`).getTime()),
      location: { lat: samplePoints[0].lat, lng: samplePoints[0].lng }
    }
  });

  await LocationLog.insertMany(
    samplePoints.map(point => ({
      userId: sampleIntern._id,
      location: { lat: point.lat, lng: point.lng },
      address: {
        area: point.area,
        city: point.city,
        state: 'Delhi',
        formatted: `${point.area}, ${point.city}, Delhi`
      },
      accuracy: 12 + point.minutes / 10,
      battery: 90 - Math.floor(point.minutes / 10),
      speed: 2.8,
      gpsQuality: 'high',
      timestamp: new Date(new Date(`${today}T09:00:00.000Z`).getTime() + point.minutes * 60000)
    }))
  );

  await Lead.insertMany([
    {
      userId: sampleIntern._id,
      businessName: 'Metro Traders',
      clientName: 'Amit Verma',
      clientPhone: '9876543210',
      clientEmail: 'amit@metrotraders.in',
      addressText: 'Block B, Connaught Place, New Delhi',
      notes: 'Interested in product demo next week.',
      location: { lat: 28.6168, lng: 77.2166 },
      address: {
        area: 'Janpath',
        city: 'New Delhi',
        state: 'Delhi',
        formatted: 'Janpath, New Delhi, Delhi'
      },
      gps: { accuracy: 14, quality: 'high' },
      status: 'contacted',
      visitOutcome: 'follow-up',
      createdAt: new Date(`${today}T09:25:00.000Z`),
      updatedAt: new Date(`${today}T09:25:00.000Z`)
    },
    {
      userId: sampleIntern._id,
      businessName: 'Capital Foods',
      clientName: 'Neha Kapoor',
      clientPhone: '9123456780',
      clientEmail: 'neha@capitalfoods.in',
      addressText: 'Near India Gate, New Delhi',
      notes: 'Ready for pricing discussion.',
      location: { lat: 28.6353, lng: 77.2244 },
      address: {
        area: 'India Gate',
        city: 'New Delhi',
        state: 'Delhi',
        formatted: 'India Gate, New Delhi, Delhi'
      },
      gps: { accuracy: 11, quality: 'high' },
      status: 'qualified',
      visitOutcome: 'visited',
      createdAt: new Date(`${today}T10:20:00.000Z`),
      updatedAt: new Date(`${today}T10:20:00.000Z`)
    },
    {
      userId: sampleIntern._id,
      businessName: 'City Needs Mart',
      clientName: 'Rohit Malhotra',
      clientPhone: '9988776655',
      clientEmail: 'rohit@cityneeds.in',
      addressText: 'Pragati Maidan Road, New Delhi',
      notes: 'Requested catalog and follow-up call tomorrow.',
      location: { lat: 28.6384, lng: 77.2311 },
      address: {
        area: 'Pragati Maidan Road',
        city: 'New Delhi',
        state: 'Delhi',
        formatted: 'Pragati Maidan Road, New Delhi, Delhi'
      },
      gps: { accuracy: 13, quality: 'high' },
      status: 'new',
      visitOutcome: 'visited',
      createdAt: new Date(`${today}T10:38:00.000Z`),
      updatedAt: new Date(`${today}T10:38:00.000Z`)
    }
  ]);

  console.log('\n✅ Seed Complete!');
  console.log('─────────────────────────────────');
  console.log('👤 Admin:  admin@fieldtrack.com  / password123');
  console.log('─────────────────────────────────');
  console.log('📍 Marketing Agents (all password: password123):');
  marketingAgents.forEach(a => console.log(`   • ${a.name.padEnd(15)} | ${a.email}`));
  console.log('─────────────────────────────────\n');
  process.exit();
};

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
