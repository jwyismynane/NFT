const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'zpzch1988+',
    database: 'nft'
});
console.log('Connected to MySQL database', pool.config.database);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// app.use(bodyParser.json());