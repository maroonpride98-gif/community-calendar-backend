require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n🔧 Community Calendar - Create Admin User\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get user input
    const username = await question('Enter admin username: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const zipcode = await question('Enter zip code (5 digits): ');

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      console.log('\n⚠️  User already exists!');

      if (existingUser.isAdmin) {
        console.log('✅ User is already an admin.');
      } else {
        const makeAdmin = await question('Would you like to make this user an admin? (yes/no): ');

        if (makeAdmin.toLowerCase() === 'yes' || makeAdmin.toLowerCase() === 'y') {
          existingUser.isAdmin = true;
          await existingUser.save();
          console.log('✅ User is now an admin!');
        }
      }

      rl.close();
      process.exit(0);
    }

    // Create new admin user
    const adminUser = new User({
      username,
      email,
      password,
      zipcode,
      isAdmin: true
    });

    await adminUser.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Admin:', adminUser.isAdmin);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now log in with these credentials!');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
