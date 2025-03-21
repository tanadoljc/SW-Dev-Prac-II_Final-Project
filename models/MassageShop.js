const mongoose = require('mongoose');

const MassageShopSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true
    },
    address:{
        type: String,
        required: [true, 'Please add an address']
    },
    district:{
        type: String,
        required: [true, 'Please add a district']
    },
    province:{
        type: String,
        required: [true, 'Please add a province']
    },
    postalcode:{
        type: String,
        required: [true, 'Please add a postalcode'],
        maxlength: [5,'Postal Code can not be more than 5 digits']
    },
    tel:{
        type: String,
    },
    openTime:{
        type: String,
        required: [true, 'Please add an opening time']
    },
    closeTime:{
        type: String,
        required: [true, 'Please add a closing time']
    }
});

module.exports = mongoose.model('MassageShop',MassageShopSchema);