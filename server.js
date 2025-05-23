const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();
const auth = require('./routes/auth');
const massageShops = require('./routes/massage_shops');
const reservations = require('./routes/reservations');

const mongoSanitize=require('express-mongo-sanitize');
const helmet=require('helmet');
const {xss}=require('express-xss-sanitizer');
const rateLimit=require('express-rate-limit');
const hpp=require('hpp');

//Load env vars
dotenv.config({path:'./config/config.env'});

connectDB();

const corsOptions = {
    origin: 'http://localhost:5173', 
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true // Allow cookies/auth headers
};
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
const limiter=rateLimit({
    windowsMs:10*60*1000,//10 mins
    max: 100
});
app.use(limiter);
app.use(hpp())


app.use('/api/v1/auth', auth);
app.use('/api/v1/massageshops', massageShops);
app.use('/api/v1/reservations', reservations);

const PORT = process.env.PORT || 5003; // Change for mac

const server = app.listen(PORT, console.log('Server running in ',process.env.NODE_ENV, 'mode on port ',PORT));

process.on('unhandleRejection', (err,promise)=>{
    console.log(`Error: ${err.message}`);

    server.close(()=>process.exit(1));
});