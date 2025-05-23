const Reservation = require('../models/Reservation.js');
const MassageShop = require('../models/MassageShop.js');

// @desc    Get all massage shops
// @route   GET /api/v1/massageshops
// @access  Public
exports.getMassageShops = async (req, res, next) => {
    let query;

    // exclude fields
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];

    removeFields.forEach(param => delete reqQuery[param]);

    // handle [lt, lte, gt, gte]
    let queryStr = JSON.stringify(reqQuery);
    // console.log(queryStr)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // query ------------------------------------
    query = MassageShop.find(JSON.parse(queryStr));

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

    try {
        const total = await MassageShop.countDocuments();
        query = query.skip(startIndex).limit(limit);
        const massageShops = await query;

        // pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            }
        }
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            }
        }
        
        res.status(200).json({ success: true, count: massageShops.length, pagination, data: massageShops });
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
    function isValidTimeFormat(timeStr) {
        const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
        return regex.test(timeStr);
    }

    if (!isValidTimeFormat(req.body.openTime) || !isValidTimeFormat(req.body.closeTime)) {
        return res.status(400).json({ success: false, message: 'Invalid time format. Use hh:mm AM/PM' });
    }

    function timeStringToMinutes(timeStr) {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
    
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    
        return hours * 60 + minutes;
    }
    
    const openTimeMinutes = timeStringToMinutes(req.body.openTime);
    const closeTimeMinutes = timeStringToMinutes(req.body.closeTime);

    if (openTimeMinutes > closeTimeMinutes) {
        return res.status(400).json({ success: false, message: `Invalid time range` });
    }

    req.body.busyTime = new Object();
    // console.log(req.body);

    const shopData = {
        ...req.body,
        busyTime: req.body.busyTime ?? {} // fallback to {} if missing
    };

    const massageShop = await MassageShop.create(shopData);
    res.status(201).json({ success: true, data: massageShop });
}

// @desc    Update massage shop
// @route   PATCH /api/v1/massageshops/:id
// @access  Public
exports.updateMassageShop = async (req, res, next) => {
    try {
        if (req.body.busyTime) {
            return res.status(400).json({ success: false, message: 'busyTime can not update, Please remove busyTime field' })
        }
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
