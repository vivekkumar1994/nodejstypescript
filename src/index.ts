import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import dotenv from 'dotenv';
import mysql from 'mysql';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const secretkey = "ASJJHHJJH123";
const activeTokens: { [userId: string]: string } = {};

const app = express();
dotenv.config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
const salt = 15;

const server = http.createServer(app);
const io = new SocketIOServer(server);

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'authentication'
});

app.get('/', (req, res) => {
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

  bcrypt.hash(plainpassword, salt, (err, hashpassword) => {
    if (err) {
      return res.status(500).send('internal server error');
    }

    const sql =
      'INSERT INTO register(firstname, lastname, mobile, address, country, password) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(sql, [firstname, lastname, mobile, address, country, hashpassword], (error: any, result: any) => {
      if (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');
      } else {
        const insertedData = {
          firstname,
          lastname,
          mobile,
          address,
          country,
          insertId: result.insertId,
        };
        io.emit('newUser', insertedData);  // Emit an event when a new user signs up
        res.status(200).json({ message: 'Data inserted successfully', insertedData });
      }
    });
  });
});

// app.post("/login",(req,res)=> {
//   const {firstname,password}= req.body;

//   if(!firstname || !password){
//       return res.status(400).send({message:"please enter correct username or password"})
//   }

//   const sql = 'SELECT * FROM register WHERE FIRSTNAME=?';

//   connection.query(sql,[firstname],(error,result)=> {
//     if(error){
//       return res.status(500).json({message:"internal server error"})
//     }
//     if(result.length === 0){
//       return res.status(401).json({message:"invalid credincial"})
//     }
//     const hashedPassword = result[0].password;
//     bcrypt.compare(password,hashedPassword,(compareerror,match)=> {
//       if(compareerror){
//           return res.status(500).json({message:"internal service error"})
//       }

//       if(match){
//           const userData = {
//               id:result[0].id,
//               firstname:result[0].firstname,
//               lastname:result[0].lastname,
//               mobile:result[0].mobile,
//               address:result[0].address,
//               country:result[0].country
//           }

//           const token = jwt.sign(userData,secretkey,{expiresIn:'1h'})
//           return res.status(200).json({message:"login successfully",token,userData})
//       }
//       else{
//           res.status(401).json({mesage:"invalid credential"})
//       }
//     })
//   })
// });

app.post('/login', (req, res) => {
  const { firstname, password } = req.body;

  if (!firstname || !password) {
    return res.status(400).send({ message: "please enter correct username or password" });
  }

  const sql = 'SELECT * FROM register WHERE FIRSTNAME=?';

  connection.query(sql, [firstname], (error, result) => {
    if (error) {
      return res.status(500).json({ message: "internal server error" });
    }
    if (result.length === 0) {
      return res.status(401).json({ message: "invalid credincial" });
    }

    const hashedPassword = result[0].password;
    bcrypt.compare(password, hashedPassword, (compareerror, match) => {
      if (compareerror) {
        return res.status(500).json({ message: "internal service error" });
      }

      if (match) {
        const userId = result[0].id;

        // Check if the user has an active token
        if (activeTokens[userId]) {
          // Invalidate the old session
          io.to(activeTokens[userId]).emit('forceLogout', { message: 'Login from another location' });
        }

        const userData = {
          id: userId,
          firstname: result[0].firstname,
          lastname: result[0].lastname,
          mobile: result[0].mobile,
          address: result[0].address,
          country: result[0].country
        }

        // Generate a new token
        const token = jwt.sign(userData, secretkey, { expiresIn: '1h' });

        // Store the new token as the active token for the user
        activeTokens[userId] = token;

        return res.status(200).json({ message: "login successfully", token, userData });
      } else {
        res.status(401).json({ message: "invalid credential" });
      }
    });
  });
});
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Remove the user's active token when they disconnect
    for (const userId in activeTokens) {
      if (activeTokens[userId] === socket.id) {
        delete activeTokens[userId];
        break;
      }
    }
  });
});


const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
