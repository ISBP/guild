const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const bcryptjs = require('bcryptjs');
var cookieParser = require('cookie-parser');
require('dotenv').config()
const cookiesecret = process.env.COOKIE_SECRET_KEY
const apikey = process.env.GUILD_API_KEY
const jwtkey = process.env.JWT_SECRET_KEY
const discordwebhook = process.env.DISCORD_WEBHOOK
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose"); 
app.use(cookieParser(cookiesecret));
async function logDc(state, message, route, identifier)
{
  if(state == "log")
  {
    color = "255"
  }
  else
  {
    color = "14177041"
  }
  try{
  const post = await fetch(discordwebhook, {
    method: "POST",
    headers:{

     "Content-Type": "application/json"},
    body: JSON.stringify({
      "embeds": [{
        "author": {
          "name": "Logging Util",
          "icon_url": "https://media.tenor.com/hRrV5cps_twAAAAi/cat-silly.gif"
        },
        "title": `${state} ${route}`,
        "color": color,
        "description": `${identifier} ${message}`
  }]
})
  });
  if(!post.ok)
  {
    console.log(post)
    console.log(await post.json)
  }
}
  catch(error)
  {
    console.log(error)
  }

}
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
    return res.redirect("/login");
  }

  try {
    const data = jwt.verify(token, jwtkey);
    req.data = data;
    next(); 
  } 
  catch (error) {
        console.log(error)
    return res.redirect("/login"); 
  }
};
const collection = new mongoose.model("users", userSchema);
app.set('view engine', 'html');
app.use(express.json());
app.engine('html', require('ejs').renderFile);
app.get('/', (req, res) => {
  let user = "";
  try{
    let token = req.signedCookies.token;
    const data = jwt.verify(token, jwtkey);
    user = data.user.username;
   }
   catch(error)
   {
    user = "";
   } 
  const filePath = path.join(__dirname, 'files', 'index.ejs')
  res.render(filePath,{

    user: user
  })
  let ip = req.ip
  try{
    logDc("log", "Rendered home page", "/", `${user}`)
  }
  catch{
    console.log(error)
  }

})


app.use(express.urlencoded({ extended: false }));
app.get('/login', (req, res) => {
    const filePath = path.join(__dirname, 'files', 'login.html')
    res.render(filePath);
});
app.get('/favicon.ico', (req, res) => {
    const filePath = path.join(__dirname, 'files', 'favicon.ico')
    res.sendFile(filePath);
});
app.use('/static', express.static(path.join(__dirname, 'static')))
app.get('/createuser', (req, res) => {
    res.render(filePath);
});
app.post('/login', async (req, res) => {
    try {
          const user = await collection.findOne({ username: req.body.username });
        
        if (!user)
        {
          return res.send("User not found"); 
        }
        
        const passwordMatch = await bcryptjs.compare(req.body.password, user.password);
        if (passwordMatch) 
        {
          jwt.sign({user}, jwtkey, { expiresIn: '1d' },(err, token) => {
            let options = 
            {
              maxAge: 1000*60*60*24,
              httpOnly: true,
              signed: true,
            }
            if(err) { console.log(err) }    
            res.cookie("token", token, options)
            res.redirect('/portal');
            logDc("log", "Successfully logged in", "/login", req.body.username)
             });
        } 
        else 
          {
            return res.send("Wrong password"); 
          }
    } 
    catch (error) 
    {
      console.error(error);
      
    }
});


app.get('/portal', authorization, async (req, res) => {
  const userID = req.data.user.xuid;
  const data = await fetch(`https://api.ngmc.co/v1/players/${userID}`)
  const rawGuildData = await fetch(`https://api.ngmc.co/v1/guilds/Sillies`)
  const guildData = await rawGuildData.json();
  const userData = await data.json();
  if(userData.guild != "Sillies")
  {
    const filePath = path.join(__dirname,"files","join.ejs")
    return res.render(filePath,
      {
        error:"You must join the guild to login!"
      }
    )
  }
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
  logDc("log", "Rendered the portal", "/portal", userData.name)
  let playtime = userDataExtra.onlineTime;
  playtime = Math.round((playtime/60)*10)/10
  const filePath = path.join(__dirname, 'files', 'secret.ejs')
  return res.render(filePath, {
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

  const filePath = path.join(__dirname, 'files', 'join.ejs')
  res.render(filePath, {
    error: ""
  })
})
app.post("/join", async (req, res) => {
  const data = {
    name: req.body.username,
    email: req.body.email,
    discordid: req.body.dcid,
    xuid: req.body.xuid,
    password: req.body.password,
    confirmpassword: req.body.passwordconfirm
  };
  
  const User = mongoose.model('username', userSchema);
  const filePath = path.join(__dirname, 'files', 'join.ejs')
  console.log(data.password)
  console.log(data.confirmpassword)
  if(data.password != data.confirmpassword)
    {
      return res.render(filePath,
        {
          error: "Passwords don't match!"
        }
      )
    }
    else{
      const existingUser = await collection.findOne({ username: data.name });
      if (existingUser) {
        return res.render(filePath, 
          {
            error: "Account already exists!"
          }
        );
      
    }
    const fetchName = data.name
    console.log(fetchName)
    console.log(data.name)
    const ngmcDataRaw = await fetch(`https://api.ngmc.co/v1/players/${fetchName}`);
    if(!ngmcDataRaw.ok)
    {
      return res.render(filePath, {
        error: "Failed to load player data!"
      })
    }
    const ngmcData = await ngmcDataRaw.json();
    const ngmcDataExtra = await ngmcData.extra;

    if(ngmcData.kdr < 1 || ngmcData.kills < 20 || ngmcData.kdrTotal < 1 || ngmcDataExtra.onlineTime < 180)
    {
      res.render(filePath,
        {
          error: "Requirements not met!"
        }
      )
    }
    else {      
        try{
          fetch(`https://api.ngmc.co/v1/guilds/Sillies/invites/${data.name}`, {
            method: "PUT",
            headers: {
              "Authorization": apikey
            }
          });

        }
        catch(error)
        {
          console.log(error)

        }
        const saltRounds = 10;
        const hashedPassword = await bcryptjs.hash(data.password, saltRounds);
        data.password = hashedPassword;
          const newUser = new User({
          username: data.name,
          password: hashedPassword,
          email: data.email,
          discordid: data.discordid,
          xuid: ngmcData.xuid
        });
        try {
            const userData = await collection.insertMany(newUser);
            res.redirect("/login")
          logDc("log", "Created new user", "/join", data.name)

        } 
        catch (error) {
            console.error(error);
          logDc("error", "Failed to create new user", "/join", data.name)
            return res.status(500).send("Internal server error")

        }
    }
}});  



app.listen(port, () => {
  console.log(`Website listening on ${port}`)
})
