const Reservation = require('../models/Reservation');
const MassageShop = require('../models/MassageShop');

// @desc Get all reservations
// @route GET /api/v1/reservations
// @access Private
exports.getReservations = async (req, res, next) => {
    let query;
    // General users can see only their reservations
    if (req.user.role !== 'admin') {
        query = Reservation.find({ user: req.user.id }).populate({
            path: 'massageShop',
            select: 'name province tel'
        });
    } else {
        if (req.params.massageShopId) {
            console.log(req.params.massageShopId);
            query = Reservation.find({ massageShop: req.params.massageShopId }).populate({
                path: "massageShop",
                select: 'name province tel'
            });
        } else {
            query = Reservation.find().populate({
                path: 'massageShop',
                select: 'name province tel'
            });
        }
    }

    try {
        const reservations = await query;
        res.status(200).json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (err) {
        console.log(err.stack);
        return res.status(500).json({ success: false, error: 'Cannot find Reservation' });
    }
};

// @desc Get single reservation
// @route GET /api/v1/reservations/:id
// @access Public
exports.getReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate({
            path: 'massageShop',
            select: 'name province tel'
        });

        if (!reservation) {
            return res.status(400).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: reservation });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: 'Cannot find Reservation' });
    }
};

// @desc Add single reservation
// @route POST /api/v1/massageshops/:massageShopId/reservations
// @access Private
exports.addReservation = async (req, res, next) => {
    try {
        req.body.massageShop = req.params.massageShopId;

        const massageShop = await MassageShop.findById(req.params.massageShopId);

        if (!massageShop) {
            return res.status(404).json({ success: false, message: `No massage shop with the id of ${req.params.massageShopId}` });
        }
        console.log(req.body);

        // Add user ID to req.body
        req.body.user = req.user.id;

        // Check for existing reservations
        const existingReservations = await Reservation.find({ user: req.user.id });

        // If the user is not an admin, they can only create 3 reservations
        if (existingReservations.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `User with id of ${req.user.id} has already created 3 reservations` });
        }

        const reservation = await Reservation.create(req.body);
        res.status(200).json({ success: true, data: reservation });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: 'Cannot create Reservation' });
    }
};

// @desc Update reservation
// @route PATCH /api/v1/reservations/:id
// @access Private
exports.updateReservation = async (req, res, next) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        // Make sure user is reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User with id of ${req.user.id} is not authorized to update this reservation` });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: reservation });
    } catch (err) {
        console.log(err.stack);
        return res.status(500).json({ success: false, error: 'Cannot update Reservation' });
    }
};

// @desc Delete reservation
// @route DELETE /api/v1/reservations/:id
// @access Private
exports.deleteReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        if( reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User with id of ${req.user.id} is not authorized to delete this reservation` });
        }

        await reservation.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.log(err.stack);
        return res.status(500).json({ success: false, error: 'Cannot delete Reservation' });
    }
};
