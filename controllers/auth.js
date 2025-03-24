const User = require('../models/User');

const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE*24*60*60*1000), 
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    })
}

const expireToken = (statusCode, res) => {
    const options = {
        expires: new Date(0), 
        httpOnly: true
    };

    res.status(statusCode).cookie('token', '', options).json({
        success: true,
        message: 'Logged out successfully'
    })
}

exports.register = async (req, res, next) => {
    try {
        const { name, telephone, email, password, role } = req.body;
        //Create user
        const user = await User.create({
            name, telephone, email, password, role
        });
        
        sendTokenResponse(user, 200, res);

    } catch (err) {
        res.status(400).json({ success: false });
        console.log(err.stack);
    }
};

// @access Public
exports.login = async (req, res, next) => {
    const {email, password} = req.body;

    //Validate email & password
    if(!email || !password) {
        return res.status(400).json({success: false, msg: 'Please provide an email and password'});
    }

    //Check for user
    const user = await User.findOne({email}).select('+password');
    if(!user) {
        return res.status(400).json({success: false,
        msg:'Invalid credentials'});
    }

    //Check if password matches
    const isMatch = await user.matchPassword(password);
    if(!isMatch) {
        return res.status(401).json({success: false, msg: 'Invalid credentials'});
    };

    sendTokenResponse(user, 200, res);
};

exports.logout = async (req, res, next) => {
    expireToken(200, res);
};

// @access Private
exports.getMe = async(req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true, 
        data: user
    });
};