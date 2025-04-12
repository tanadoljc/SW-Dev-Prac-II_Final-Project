const Reservation = require('../models/Reservation.js');
const MassageShop = require('../models/MassageShop.js');

// @desc    Get all massage shops
// @route   GET /api/v1/massageshops
// @access  Public
exports.getMassageShops = async (req, res, next) => {
    try {
        const massageShops = await MassageShop.find();
        res.status(200).json({ success: true, count: massageShops.length, data: massageShops });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}

// @desc    Get single massage shop
// @route   GET /api/v1/massageshops/:id
// @access  Public
exports.getMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findById(req.params.id);

        if (!massageShop) {
            return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: massageShop });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}

// @desc    Create new massage shop
// @route   POST /api/v1/massageshops
// @access  Public
exports.createMassageShop = async (req, res, next) => {
    const massageShop = await MassageShop.create(req.body);
    res.status(201).json({ success: true, data: massageShop });
}

// @desc    Update massage shop
// @route   PATCH /api/v1/massageshops/:id
// @access  Public
exports.updateMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!massageShop) {
            return res.status(400).json({ success: false, message: 'Massage shop not found' });
        }

        res.status(200).json({ success: true, data: massageShop });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete massage shop
// @route   DELETE /api/v1/massageshops/:id
// @access  Public
exports.deleteMassageShop = async (req, res, next) => {
    try {
        const massageShop = await MassageShop.findById(req.params.id);

        if (!massageShop) {
            return res.status(404).json({ success: false, message: `Massage shop not found with id of ${req.params.id}` });
        }
        await Reservation.deleteMany({ massageShop: req.params.id });
        await MassageShop.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false });
    }
}
