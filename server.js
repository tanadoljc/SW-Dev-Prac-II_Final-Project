const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const app = express();

app.use(express.json());

//Load env vars
dotenv.config({path:'./config/config.env'});

connectDB();

const PORT = process.env.PORT || 5003;

const server = app.listen(PORT, console.log('Server running in ',process.env.NODE_ENV, 'mode on port ',PORT));

process.on('unhandleRejection', (err,promise)=>{
    console.log(`Error: ${err.message}`);

    server.close(()=>process.exit(1));
});