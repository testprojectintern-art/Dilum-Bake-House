import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const createCustomer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let customerUser = await User.findOne({ email: 'customer@wholesale.com' });
        
        if (customerUser) {
            console.log('Customer user exists. Updating details...');
            customerUser.password = 'customer123';
            customerUser.role = 'customer';
            await customerUser.save();
        } else {
            console.log('Creating new customer user...');
            customerUser = new User({
                firstName: 'Price',
                lastName: 'Checker',
                email: 'customer@wholesale.com',
                password: 'customer123',
                role: 'customer',
                isActive: true
            });
            await customerUser.save();
        }

        console.log('Customer user updated/created successfully!');
        console.log('Email: customer@wholesale.com');
        console.log('Password: customer123');

        process.exit(0);
    } catch (error) {
        console.error('Error creating customer user:', error);
        process.exit(1);
    }
};

createCustomer();
