/**
 * seedDemoUsers.js
 * Creates one demo user for each of the 5 roles.
 * Run: node src/utils/seedDemoUsers.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not found in .env'); process.exit(1); }

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName:  String,
    email:     String,
    password:  String,
    role:      String,
    isActive:  { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const demoUsers = [
    { firstName: 'Admin',     lastName: 'Owner',     email: 'admin@dilumbakehouse.com',     password: 'Admin@123',     role: 'admin'     },
    { firstName: 'Manager',   lastName: 'User',      email: 'manager@dilumbakehouse.com',   password: 'Manager@123',   role: 'manager'   },
    { firstName: 'Cashier',   lastName: 'User',      email: 'cashier@dilumbakehouse.com',   password: 'Cashier@123',   role: 'cashier'   },
    { firstName: 'Accountant',lastName: 'User',      email: 'accountant@dilumbakehouse.com',password: 'Account@123',   role: 'accountant'},
    { firstName: 'Employee',  lastName: 'User',      email: 'employee@dilumbakehouse.com',  password: 'Employee@123',  role: 'employee'  },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB Connected');

    let created = 0, skipped = 0;

    for (const u of demoUsers) {
        const exists = await User.findOne({ email: u.email });
        if (exists) {
            console.log(`  ⏭ Skipped  ${u.role.padEnd(11)} – ${u.email} (already exists)`);
            skipped++;
            continue;
        }
        const hashed = await bcrypt.hash(u.password, 12);
        await User.create({ ...u, password: hashed });
        console.log(`  ✅ Created  ${u.role.padEnd(11)} – ${u.email}  password: ${u.password}`);
        created++;
    }

    console.log(`\n✓ Done — ${created} created, ${skipped} skipped.`);
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
