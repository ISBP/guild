const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const bcryptjs = require('bcryptjs');
var cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose"); // Importing mongoose model from ./config
//const collection = require('./config');
app.use(cookieParser('dA7rVAdj&fMXg1ku%g!5JmSHfTegMRstBcjYfb5tGS0ayFk9pQ4CdT%$wfcP^m^%'));
try{
mongoose.connect('mongodb://localhost:27017/playerdata');
}
catch(error){
  console.error('Error connecting to MongoDB:', error);
};
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});
const collection = new mongoose.model("users", userSchema);
app.set('view engine', 'html');
app.use(express.json());
app.engine('html', require('ejs').renderFile);
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'files', 'index.html')
  res.render(filePath)
})

app.use(express.urlencoded({ extended: false }));
// Handling POST request for signup
app.post("/signup", async (req, res) => {
  //needs auth
    const data = {
        name: req.body.username,
        password: req.body.password
    };

// Create a User model based on the schema
const User = mongoose.model('username', userSchema);
    // Check if the username already exists
    const existingUser = await collection.findOne({ username: data.name });
    if (existingUser) {
        return res.render("user_exists"); // Render user_exists page if username already exists
    } else {
        // Hash the password before saving to database

        const saltRounds = 10;
        const hashedPassword = await bcryptjs.hash(data.password, saltRounds);
        data.password = hashedPassword;
                const newUser = new User({
          username: data.name,
          password: hashedPassword
        });
        // Inserting new user data into the database
        try {
            const userData = await collection.insertMany(newUser);
            console.log(userData);
            res.render("signup_success"); // Render signup_success page upon successful signup
        } catch (error) {
            console.error(error);
            res.render("error"); // Render error page if there's an issue with database insertion
        }
    }
});
app.get('/login', (req, res) => {
    const filePath = path.join(__dirname, 'files', 'login.html')
    res.render(filePath);
});
app.get('/signup', (req, res) => {
    const filePath = path.join(__dirname, 'files', 'signup.html')
    res.render(filePath);
});
app.post('/login', async (req, res) => {
    try {
        // Check if the username exists
        const user = await collection.findOne({ username: req.body.username });
        
        if (!user) {
            return res.send("User not found"); // Send message if user does not exist
        }
        
        // Compare passwords
        const passwordMatch = await bcryptjs.compare(req.body.password, user.password);
        
        if (passwordMatch) {
          console.log(`Pass match ${user}`)
          jwt.sign({user}, 'privatekey', { expiresIn: '1h' },(err, token) => {
                console.log(err)
                console.log(token)
                let options = {
                  maxAge: 1000*60*120,
                  httpOnly: true,
                  signed: true,

                }
                if(err) { console.log(err) }    
                res.cookie("token", token, options)
                //res.(200, {"Access-Control-Allow-Credentials": "true"})
                res.send('Authenticated');

             });
            
           
            //Write token here :)
            //res.render("home"); // Render home page upon successful login
        } else {
            res.send("Wrong password"); // Send message if password does not match
        }
    } catch (error) {
        console.error(error);
        //res.render("wrong_input"); // Render wrong_input page if there's an error during login
    }
});


const authorization = (req, res, next) => {
  const token = req.signedCookies.token; 

  if (!token) {
    return res.sendStatus(403);
  }

  try {
    const data = jwt.verify(token, 'privatekey');
    console.log(data)
    next(); 
  } catch (error) {
    return res.sendStatus(403); 
  }
};
app.get('/panel', authorization, (req, res) => {
  const filePath = path.join(__dirname, 'files', 'secret.html')
  res.render(filePath)


})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
