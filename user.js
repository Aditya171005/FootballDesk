const mongoose = require('mongoose');

// ❌ REMOVED: mongoose.connect() — already handled in app.js

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: String,
    email: String,
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('user', userSchema);``