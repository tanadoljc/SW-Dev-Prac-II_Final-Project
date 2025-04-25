const Reservation = require('../models/Reservation');
const MassageShop = require('../models/MassageShop');

// @desc Get all reservations
// @route GET /api/v1/reservations
// @access Private
exports.getReservations = async (req, res, next) => {
    let queryObj = {};

    // General users can see only their own reservations
    if (req.user.role !== 'admin') {
        queryObj.user = req.user.id;
    } else {
        if (req.params.massageShopId) {
            console.log(req.params.massageShopId);
            queryObj.massageShop = req.params.massageShopId;
        }
    }

    // Filtering
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit', 'massageShopName', 'massageShopProvince'];
    removeFields.forEach(param => delete reqQuery[param]);

    // handle [lt, lte, gt, gte]
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    Object.assign(queryObj, JSON.parse(queryStr));
    
    // ---------------------------------------------

    // Filter by reservation date
    if (req.query.resvDate) {
        const date = new Date(req.query.resvDate);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
    
        queryObj.resvDate = {
            $gte: date,
            $lt: nextDate
        };
    }

    // Filter by start time
    if (req.query.startTime) {
        queryObj.startTime = {
            $gte: req.query.startTime
        }
    }

    // Filter by end time
    if (req.query.endTime) {
        queryObj.endTime = {
            $lte: req.query.endTime
        }
    }

    let query = Reservation.find(queryObj).populate({
        path: 'massageShop',
        select: 'name province tel'
    });

    // "select" fields
    if(req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // "sort" fields
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    query = query.skip(startIndex).limit(limit);

    try {
        let reservations = await query;

        // Filter by massage shop name
        if (req.query.massageShopName) {
            reservations = reservations.filter(resv => 
                resv.massageShop.name.toLowerCase().includes(req.query.massageShopName.toLowerCase())
            );
        }

        // Filter by massage shop province
        if (req.query.massageShopProvince) {
            reservations = reservations.filter(resv => 
                resv.massageShop.province.toLowerCase().includes(req.query.massageShopProvince.toLowerCase())
            );
        }

        // pagination result
        const total = await Reservation.countDocuments(queryObj);
        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: reservations.length,
            pagination,
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

        // Make sure user is reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User with id of ${req.user.id} is not authorized to update this reservation` });
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

        let massageShop = await MassageShop.findById(req.params.massageShopId);

        function isValidTimeFormat(timeStr) {
            const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
            return regex.test(timeStr);
        }

        if (!isValidTimeFormat(req.body.startTime) || !isValidTimeFormat(req.body.endTime)) {
            return res.status(400).json({ success: false, message: 'Invalid time format. Use hh:mm AM/PM' });
        }

        if (!massageShop) {
            return res.status(404).json({ success: false, message: `No massage shop with the id of ${req.params.massageShopId}` });
        }
        console.log(req.body);

        // Add user ID to req.body
        req.body.user = req.user.id;

        // Check for existing reservations
        const existingReservationsById = await Reservation.find({ user: req.user.id });

        // If the user is not an admin, they can only create 3 reservations
        if (existingReservationsById.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({ success: false, message: `User with id of ${req.user.id} has already created 3 reservations` });
        }

        const dateOnly = new Date(req.body.resvDate).toISOString().split('T')[0];

        function timeStringToMinutes(timeStr) {
            console.log(timeStr);
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
        
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
        
            return hours * 60 + minutes;
        }
        
        const startTimeMinutes = timeStringToMinutes(req.body.startTime);
        const endTimeMinutes = timeStringToMinutes(req.body.endTime);

        if (startTimeMinutes >= endTimeMinutes || startTimeMinutes < timeStringToMinutes(massageShop.openTime) || endTimeMinutes > timeStringToMinutes(massageShop.closeTime)) {
            return res.status(400).json({ success: false, message: `Invalid time range` });
        }

        if (dateOnly in massageShop.busyTime) {
            const isOverlap = massageShop.busyTime[dateOnly].some((resv) => {
                const [resvStartRange, resvEndRange] = resv.split(' - ');
                const resvStartTimeMinutes = timeStringToMinutes(resvStartRange);
                const resvEndTimeMinutes = timeStringToMinutes(resvEndRange);
    
                return (
                    (startTimeMinutes <= resvEndTimeMinutes && endTimeMinutes >= resvStartTimeMinutes)
                );
            });
    
            if (isOverlap) {
                return res.status(400).json({ success: false, message: 'This time slot already reserved' });
            }
    
            for (let i = 0; i < massageShop.busyTime[dateOnly].length; i++) {
                const timeRange = massageShop.busyTime[dateOnly][i];
                const [startRange, endRange] = timeRange.split(' - ');
                const startRangeMinutes = timeStringToMinutes(startRange);
                const endRangeMinutes = timeStringToMinutes(endRange);
                if (endTimeMinutes < startRangeMinutes) {
                    massageShop.busyTime[dateOnly].splice(i, 0, `${req.body.startTime} - ${req.body.endTime}`);
                    break;
                }
                if (startTimeMinutes > endRangeMinutes) {
                    massageShop.busyTime[dateOnly].splice(i + 1, 0, `${req.body.startTime} - ${req.body.endTime}`);
                    break;
                }
            }
        }
        else massageShop.busyTime[dateOnly] = new Array(`${req.body.startTime} - ${req.body.endTime}`);

        const massageShopResult = await MassageShop.findByIdAndUpdate(req.params.massageShopId, massageShop, {
            new: true,
            runValidators: true
        }); 

        if (!massageShopResult) {
            return res.status(400).json({ success: false, message: 'Massage shop not update successfully' });
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
        let massageShop = await MassageShop.findById(reservation.massageShop._id);

        function isValidTimeFormat(timeStr) {
            const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
            return regex.test(timeStr);
        }

        if (!isValidTimeFormat(req.body.startTime) || !isValidTimeFormat(req.body.endTime)) {
            return res.status(400).json({ success: false, message: 'Invalid time format. Use hh:mm AM/PM' });
        }
        
        if (!reservation) {
            return res.status(404).json({ success: false, message: `No reservation with the id of ${req.params.id}` });
        }

        if (!massageShop) {
            return res.status(404).json({ success: false, message: `No massage shop with the id of ${req.params.massageShopId}` });
        }

        // Make sure user is reservation owner
        if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, message: `User with id of ${req.user.id} is not authorized to update this reservation` });
        }

        let dateOnlyOld = new Date(reservation.resvDate).toISOString().split('T')[0];
        const resvTime = `${reservation.startTime} - ${reservation.endTime}`

        let alreadyDelete = false;

        for (let i = 0; i < massageShop.busyTime[dateOnlyOld].length; i++) {
            const timeRange = massageShop.busyTime[dateOnlyOld][i];
            if (timeRange === resvTime) {
                massageShop.busyTime[dateOnlyOld].splice(i, 1);
                alreadyDelete = true;
                break;
            }
        }

        if(!alreadyDelete) {
            return res.status(400).json({ success: false, message: `No reservation date ${dateOnlyOld} and time ${resvTime} to delete in massage shop with the id of ${reservation.massageShopId._id}` });
        }

        const merged = { ...reservation.toObject(), ...req.body };
        const dateOnly = new Date(merged.resvDate).toISOString().split('T')[0];

        function timeStringToMinutes(timeStr) {
            console.log(timeStr);
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
        
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
        
            return hours * 60 + minutes;
        }
        
        const startTimeMinutes = timeStringToMinutes(merged.startTime);
        const endTimeMinutes = timeStringToMinutes(merged.endTime);

        if (startTimeMinutes >= endTimeMinutes || startTimeMinutes < timeStringToMinutes(massageShop.openTime) || endTimeMinutes > timeStringToMinutes(massageShop.closeTime)) {
            return res.status(400).json({ success: false, message: `Invalid time range` });
        }

        if (dateOnly in massageShop.busyTime) {
            const isOverlap = massageShop.busyTime[dateOnly].some((resv) => {
                const [resvStartRange, resvEndRange] = resv.split(' - ');
                const resvStartTimeMinutes = timeStringToMinutes(resvStartRange);
                const resvEndTimeMinutes = timeStringToMinutes(resvEndRange);
    
                return (
                    (startTimeMinutes <= resvEndTimeMinutes && endTimeMinutes >= resvStartTimeMinutes)
                );
            });
    
            if (isOverlap) {
                return res.status(400).json({ success: false, message: 'This time slot already reserved' });
            }
    
            for (let i = 0; i < massageShop.busyTime[dateOnly].length; i++) {
                const timeRange = massageShop.busyTime[dateOnly][i];
                const [startRange, endRange] = timeRange.split(' - ');
                const startRangeMinutes = timeStringToMinutes(startRange);
                const endRangeMinutes = timeStringToMinutes(endRange);
                if (endTimeMinutes < startRangeMinutes) {
                    massageShop.busyTime[dateOnly].splice(i, 0, `${merged.startTime} - ${merged.endTime}`);
                    break;
                }
                if (startTimeMinutes > endRangeMinutes) {
                    massageShop.busyTime[dateOnly].splice(i + 1, 0, `${merged.startTime} - ${merged.endTime}`);
                    break;
                }
            }
        }
        else massageShop.busyTime[dateOnly] = new Array(`${merged.startTime} - ${merged.endTime}`);

        const massageShopResult = await MassageShop.findByIdAndUpdate(reservation.massageShop._id, massageShop, {
            new: true,
            runValidators: true
        }); 

        if (!massageShopResult) {
            return res.status(400).json({ success: false, message: 'Massage shop not update successfully', data: massageShop });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, merged, {
            new: true,
            runValidators: true
        });
        
        res.status(200).json({ success: true, data: merged });
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
