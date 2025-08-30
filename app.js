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
mongoose.connect('mongodb://localhost:27017/guilddata');
}
catch(error){
  console.error('Error connecting to MongoDB:', error);
};
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  discordid: String,
  xuid: String,
  password: String
});
const authorization = (req, res, next) => {
  const token = req.signedCookies.token; 

  if (!token) {
    return res.sendStatus(403);
  }

  try {
    const data = jwt.verify(token, 'GRy&b#Q$0j*0#dp0R7zrr57Fun6GYxf78vkafewD%TZ$FP32CHwuyrueGww@kEEd');
    console.log(data)
    req.data = data;
    next(); 
  } catch (error) {
        console.log(error)
    return res.sendStatus(403); 
  }
};
const collection = new mongoose.model("users", userSchema);
app.set('view engine', 'html');
app.use(express.json());
app.engine('html', require('ejs').renderFile);
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'files', 'index.html')
  res.render(filePath)
})


app.use(express.urlencoded({ extended: false }));
app.post("/createuser", authorization, async (req, res) => {
  //needs auth
    const data = {
        name: req.body.username,
        email: req.body.email,
        discordid: req.body.dcid,
        xuid: req.body.xuid,
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
          password: hashedPassword,
          email: data.email,
          discordid: data.discordid,
          xuid: data.xuid
        });
        // Inserting new user data into the database
        try {
            const userData = await collection.insertMany(newUser);
            console.log(userData);
            res.status(200).send("Inserted data into database!")
            //res.render("signup_success"); // Render signup_success page upon successful signup
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal server error")
            res.render("error"); // Render error page if there's an issue with database insertion
        }
    }
});
app.get('/login', (req, res) => {
    const filePath = path.join(__dirname, 'files', 'login.html')
    res.render(filePath);
});
app.get('/createuser', (req, res) => {
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
          jwt.sign({user}, 'GRy&b#Q$0j*0#dp0R7zrr57Fun6GYxf78vkafewD%TZ$FP32CHwuyrueGww@kEEd', { expiresIn: '1h' },(err, token) => {
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
                res.redirect('/portal');

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



app.get('/portal', authorization, async (req, res) => {
 // const playerData = await fetch
  const userID = req.data.user.xuid;
  const data = await fetch(`https://api.ngmc.co/v1/players/${userID}`)
  const rawGuildData = await fetch(`https://api.ngmc.co/v1/guilds/Sillies`)
  const guildData = await rawGuildData.json();
  const userData = await data.json();
  const userDataExtra = await userData.extra;
  let rank = "Member";
  let color = "Gray";
  if(guildData.officers.includes(userData.name))
  {
    rank = "Officer";
    color = "blue"
  }
  if(guildData.leader == userData.name)
  {
    rank = "Leader";
    color = "red";
  }
  let playtime = userDataExtra.onlineTime;
  playtime = Math.round((playtime/60), 2)
  console.log(userID)
  console.log(userData)
  const filePath = path.join(__dirname, 'files', 'secret.ejs')
  res.render(filePath, {
    username: userData.name,
    skin: userData.avatar,
    rank: rank,
    color: color,
    playtime: playtime,
    level: userData.level,
    kdr: userData.kdr,
    gxp: userDataExtra.gxp,
    tgxp: guildData.xp
  })})
  

app.get('/join', async (req, res) => {
 // const playerData = await fetch

  const filePath = path.join(__dirname, 'files', 'join.ejs')
  res.render(filePath, {
    error: ""
  })
})
app.post("/join", async (req, res) => {
  //needs auth
    const data = {
        name: req.body.username,
        email: req.body.email,
        discordid: req.body.dcid,
        xuid: req.body.xuid,
        password: req.body.password
    };
  console.log(data)
  const User = mongoose.model('username', userSchema);
    // Check if the username already exists
    const filePath = path.join(__dirname, 'files', 'join.ejs')
    const existingUser = await collection.findOne({ username: data.name });
    if (existingUser) {
        console.log("USER EXIST ERR")
        return res.render(filePath, 
          {
            error: "Account already exists!"
          }
        );
      
    }
    console.log("Fetching data")
    const fetchName = data.name
    console.log(fetchName)
    console.log(data.name)
    const ngmcDataRaw = await fetch(`https://api.ngmc.co/v1/players/${fetchName}`);
    console.log("Data fetched")
    if(!ngmcDataRaw.ok)
    {
      res.render(filePath, {
        error: "Failed to load player data!"
      })
      console.log("No data fetched :(")
      console.log(ngmcDataRaw)
    }
    const ngmcData = await ngmcDataRaw.json();
    const ngmcDataExtra = await ngmcData.extra;

    if(ngmcData.kdr < 1 || ngmcData.kills < 25 || ngmcData.kdrTotal < 1 || ngmcDataExtra.onlineTime < 180)
    {
      console.log("Requirements not met!")
      console.log(ngmcData.kdr)
      res.render(filePath,
        {
          error: "Requirements not met!"
        }
      )
    }
    else {
      
        // Hash the password before saving to database
        try{
          fetch(`https://api.ngmc.co/v1/guilds/Sillies/invites/${data.username}`, {
            method: "PUT",
            headers: {
              "Authorization": "Guild NTIzNw.aK5woQ.p9mTKG-USamevkSujXAzdnhf-sE"
            }
          });

        }catch(error)
        {
          console.log(error)

        }
        const saltRounds = 10;
        const hashedPassword = await bcryptjs.hash(data.password, saltRounds);
        data.password = hashedPassword;
          const newUser = new User({
          username: data.username,
          password: hashedPassword,
          email: data.email,
          discordid: data.discordid,
          xuid: ngmcData.xuid
        });
        // Inserting new user data into the database

        try {
            const userData = await collection.insertMany(newUser);
            console.log(userData);
            res.redirect("/login")
            //res.render("signup_success"); // Render signup_success page upon successful signup
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal server error")
            res.render("error"); // Render error page if there's an issue with database insertion
        }
    }
});  



app.listen(port, () => {
  console.log(`Website listening on ${port}`)
})
