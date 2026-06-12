import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const testCreation = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Let's mock a user creation request
        const uniqueEmail = `testuser_${Date.now()}@example.com`;
        const userData = {
            firstName: 'Test',
            lastName: 'EmployeeAuto',
            email: uniqueEmail,
            phone: '0771234567',
            password: 'Password123',
            role: 'employee',
            nic: '199512345678',
            address: '123 Test Street, Colombo',
        };

        // Create the user
        const user = await User.create(userData);
        console.log('User created successfully:', user._id);

        // Try to create the Employee record
        try {
            const employeeRecord = await Employee.create({
                userId:    user._id,
                firstName: user.firstName,
                lastName:  user.lastName,
                email:     user.email,
                phone:     userData.phone || undefined,
                nationalIdNumber: userData.nic || undefined,
                currentAddress: userData.address ? { line1: userData.address } : undefined,
                dateOfJoining: new Date(),
                createdBy: null,
            });
            console.log('Employee created successfully:', employeeRecord._id, 'Code:', employeeRecord.employeeCode);
        } catch (empErr) {
            console.error('Employee creation failed with error:', empErr);
        }

        // Clean up
        await User.deleteOne({ _id: user._id });
        await Employee.deleteOne({ userId: user._id });
        console.log('Cleaned up test user & employee');

        process.exit(0);
    } catch (error) {
        console.error('Global error:', error);
        process.exit(1);
    }
};

testCreation();
