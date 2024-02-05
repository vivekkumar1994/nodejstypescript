"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const mysql_1 = __importDefault(require("mysql"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
const salt = 15;
const connection = mysql_1.default.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'eccomerce'
});
app.get('/', (_req, res) => {
    res.send('Well done!');
});
app.post('/signup', (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const mobile = req.body.mobile;
    const address = req.body.address;
    const country = req.body.country;
    const plainpassword = req.body.password;
    console.log(req.body.firstname);
    bcrypt_1.default.hash(plainpassword, salt, (err, hashpassword) => {
        if (err) {
            return res.status(500).send('internal server error');
        }
        const sql = 'INSERT INTO register(firstname, lastname, mobile, address, country, password) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(sql, [firstname, lastname, mobile, address, country, hashpassword], (error, result) => {
            if (error) {
                console.error('Error inserting data:', error);
                res.status(500).send('Internal Server Error');
            }
            else {
                const insertedData = {
                    firstname,
                    lastname,
                    mobile,
                    address,
                    country,
                    insertId: result.insertId,
                };
                res.status(200).json({ message: 'Data inserted successfully', insertedData });
            }
        });
    });
});
app.listen(3000, () => {
    console.log('The application is listening on port 3000!');
});
