const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    resvDate: { 
        type: Date,
        default: Date.now,
        required: [true, 'Please add a reservation date']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please add a user']
    },
    massageShop: {
        type: mongoose.Schema.ObjectId,
        ref: 'MassageShop',
        required: [true, 'Please add a massage shop']
    },
    startTime: {
        type: String,
        required: [true, 'Please add a start time']
    },
    endTime: {
        type: String,
        required: [true, 'Please add an end time']
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reservation', ReservationSchema);