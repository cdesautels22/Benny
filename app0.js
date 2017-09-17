var tmi = require('tmi.js');
var fs = require('fs');
const webSock = require('ws');
var express = require('express');
var httpApp = require('http');
const expApp = express();

var connectionState = 0;
var connectedEver = 0;

var broadcastInfo = {
  cmd: "",
  latestViewer: "",
  viewerList: {"eggghead":1}
};

// Set up websockets
const wss = new webSock.Server({port: 9696});
wss.on('connection', function connection(ws) {
  broadcastInfo.cmd = "Initialized";
  ws.send(JSON.stringify(broadcastInfo));
})
// Broadcast to all.
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === webSock.OPEN) {
      client.send(data);
    } else {
      console.log(client.readyState);
    }

  });
};

// Channel Connection
var options = {
  options: {
    debug: true
  },
  connection: {
    cluster: "aws",
    reconnect: true
  },
  identity: {
    username: "Benedictbot",
    password: "CUSTOM OATH THIS IS FAKE"
  },
  channels: ["eggghead"]
};

// Channel broadcast selection (currently hardcoded to eggghead)
var channelBroadcaster = options.channels[0];

// Client Initialization
var client = new tmi.client(options);

/* EXPRESS HANDLER */
expApp.get(/.*idk.*/, function (req, res) {
  console.log(req.query.amount);
  res.send('hello world');
});

expApp.get(/(\/+.*\.html)/, function (req,res) {
  res.writeHead(200,{'Content-Type':'text/html'});
  var readStream;
  readStream = fs.createReadStream(__dirname + req.params[0]);
  readStream.pipe(res);
});

expApp.get(/(\/+.*\.css)/, function (req,res) {
  res.writeHead(200,{'Content-Type':'text/css'});
  var readStream;
  readStream = fs.createReadStream(__dirname + req.params[0]);
  readStream.pipe(res);
});

expApp.get(/(\/+.*\.js)/, function (req,res) {
  res.writeHead(200,{'Content-Type':'text/js'});
  var readStream;
  readStream = fs.createReadStream(__dirname + req.params[0]);
  readStream.pipe(res);
});


expApp.listen(6969, function () {
  console.log('STARTED ON 6969');
});


expApp.get(/.*connectToTwitch.*/,function (req,res) {

  if (connectionState === 0){
    // Client Connection
    client.connect();
    if(connectedEver === 0) {
      client.on('connected', function(){
        client.color("Blue");

      });
    }
    console.log('Connected!');
    res.send('Connected!');



    connectionState = 1;
  }
  if(connectedEver === 0)
    connectedEver = 1;

});

expApp.get(/.*disconnectFromTwitch.*/,function (req,res) {
  if (connectionState === 1){
    client.disconnect();
    console.log(req.query);
    res.send('Disconnected!');

    connectionState = 0;
  }
})


// DB Object
var userDB;
var potentialWinners = [];
var userCount = 0;

// heist data
var heist = true;
const heistCountdown = 5*60;
var heistTimer = heistCountdown;
var heistInterval;
var collecting = false;
var currentPool = 0;

// 8clap data
var clapParticipants = [];
var clapActive = false;
function resetClap() {
  clapParticipants = [];
  clapActive = false;
}

if(fs.existsSync('userDB.txt')) {
  var tmp = fs.readFileSync('userDB.txt');
  userDB = JSON.parse(tmp);
}
else {
  userDB = {
    eggghead: 0
  };
}
var jsonDB = JSON.stringify(userDB);
fs.writeFileSync('userDB.txt',jsonDB);

// Command Object
var commandList;
if(fs.existsSync('cl.txt')) {
  var tmp = fs.readFileSync('cl.txt');
  commandList = JSON.parse(tmp);
}


var intervalObj;

// Auxiliary Functions
function greetUser(channel,username,self){
  var greeting = "Hey " + username + ", welcome to the stream!";
  client.action(channelBroadcaster,greeting);
}


// Client chat commands
client.on('chat',function(channel,user,msg,self){
  // Ignore bot chats
  if (self) return;



  // Title message for updating wins
  if(msg.substr(0,36) === "Benedictbot -> Current Stream Title:")
  {
    var currentTitle = msg.substr(37,msg.length-1);
    var winStrings = currentTitle.match(/(\d+)\sWins/);
    var winCount = parseInt(winStrings[1]) +1;
    var newTitle = currentTitle.replace(/(\d+)\sWins/,winCount + " Wins");
    var commandNewTitle = "!title " + newTitle;
    setTimeout(function(){
      client.action(channelBroadcaster,commandNewTitle);
      return;
    },5000);

  }

  // Counting attempts while 8clap event is active
  if (clapActive) {
    var prevClapUser = null;
    if (clapParticipants.length > 0) {
      prevClapUser = clapParticipants[clapParticipants.length - 1];
    }
    if (parseInt(msg) === clapParticipants.length + 1 && user !== prevClapUser) {
      // successful count
      clapParticipants.push(user);
      if (clapParticipants.length == 8) {
        // successful 8 clap
        uniqueParticipants = clapParticipants.filter(function(value, index, self) {
          return self.indexOf(value) === index;
        });
        for (var userName in uniqueParticipants) {
          userDB[userName]+=1000;
        }
        var jsonDB = JSON.stringify(userDB);
        fs.writeFileSync('userDB.txt',jsonDB);

        resetClap();
        successMessage = "U-C-L-A UCLA fight fight fight! Enjoy your eggs! eggghePAN";
        client.action(channelBroadcaster,successMessage);
      }

    } else {
      // failed count
      resetClap();
      failureMessage = "Oh no! You failed the 8 Clap. Better luck next time!";
      client.action(channelBroadcaster,failureMessage);
    }
  }

  // Everything else
  if(msg[0] !== '!')
    return;

  var commandWords = msg.split(" ");
  var currentMessageCommand = commandWords[0];
  var currentCommand = commandList[currentMessageCommand];
  //var currentCommand = commandList[msg];
  if(currentCommand === undefined)
    return;


  /*************************************************************/
  // Broadcaster only commands
  /*************************************************************/
  if (user.username === channelBroadcaster && currentCommand[0].toLowerCase()==="bc"){
        if(currentMessageCommand === "!setEggs"){
          var eggHolder = commandWords[1];
          if (userDB[eggHolder] === undefined)
            return;
          var eggCount = parseInt(commandWords[2]);
          if (eggCount === NaN || eggCount < 0)
            return;

          userDB[eggHolder] = eggCount;
          client.action(channelBroadcaster,eggHolder + " " + eggCount + " " + userDB[eggHolder]);
        }

        if (currentMessageCommand === "!checkEggs") {
            var eggHolder = commandWords[1];
            if (userDB[eggHolder] === undefined)
              return;
            client.action(channelBroadcaster,eggHolder + " has " + userDB[eggHolder] + " eggs!");

        }
        if(currentCommand[2] === "Display")
          client.action(channelBroadcaster,currentCommand[1]);
  }
  /*************************************************************/
  // Mod only commands
  /*************************************************************/
  else if(user.mod && currentCommand[0].toLowerCase()==="mod") {
    if(currentCommand[0].toLowerCase() === "mod" || currentCommand[0].toLowerCase() === "all") {

      // TEACH BENNY COMMAND
      if(currentMessageCommand==="!teachBenny"){
        var commandToAdd = commandWords[1];

        // Check if second word has ! at the beginning
        if (commandToAdd[0] !== '!')
          return;

        // These are all display commands, so make sure the command has a sentence
        // to say when issued

        if (commandWords[2] === undefined)
          return;

        var iter;
        var newCommandMessage;
        for (iter = 2; iter < commandWords.length; iter++)
        {
          if(iter===2) {
            newCommandMessage=commandWords[iter];
          } else {
            newCommandMessage+=' ';
            newCommandMessage+=commandWords[iter];
          }
        }

        commandList[commandToAdd] = ["All",newCommandMessage,"Display"];
        var jsonCommandList = JSON.stringify(commandList);
        fs.writeFileSync('cl.txt',jsonCommandList);

        client.action(channelBroadcaster,"I just learned " + commandToAdd + " :)");
      }

      // BENNY FORGET COMMAND
      if(currentMessageCommand==="!bennyForget"){
        var commandToDel = commandWords[1];
        if(commandToDel === "!teachBenny" || commandToDel === "!bennyForget")
          return;
        if (commandToDel[0] !== '!')
          return;

        delete commandList[commandToDel];
        var jsonCommandList = JSON.stringify(commandList);
        fs.writeFileSync('cl.txt',jsonCommandList);

        client.action(channelBroadcaster,"I just forgot " + commandToDel + " :(");
      }

      if(currentMessageCommand === "!addWin"){
          client.action(channelBroadcaster,"!title");
      }

      if(currentMessageCommand === "!8clap"){
          clapActive = true;
          var clapInstruction = "Count to 8 for a 1000-egg reward! The numbers must be in sequential comments and nobody can contribute two in a row. Go Bruins!"
          client.action(channelBroadcaster, clapInstruction);
      }

      if(currentCommand[2] === "Display")
        client.action(channelBroadcaster,currentCommand[1]);


    }
  }
  /*************************************************************/
  // Commands for all users
  /*************************************************************/
  else {
    if(currentCommand[0].toLowerCase() === "all") {

      // Check Points!!!
      if(currentMessageCommand === "!points" || currentMessageCommand === "!eggs")
      {
        if(userDB[user.username] === undefined)
          userDB[user.username] = 0;
        client.action(channelBroadcaster,user.username + " has " + userDB[user.username] + " eggs!!");
      }

      if(currentCommand[2] === "Display")
        client.action(channelBroadcaster,currentCommand[1]);
    }

    if(currentMessageCommand === "!eggHunt"){
      if(heist === false) {
        client.action(channelBroadcaster,"Eggs are still being scattered! Next hunt available in " + heistTimer + " seconds!");
      } else {
        collecting = true;
        heist = false;

        client.action(channelBroadcaster,"The hunt has begun! Wager as many eggs as you dare with !risk (ex: !risk 10). You have 30 seconds to enter wagers! If you risk twice in this period, you'll risk an additional amount! Good luck!!")

        // Heist collection timeout
        setTimeout(function(){
          collecting = false;
          heistTimer = heistCountdown;
          // Do odds
          var ranval = getRandomInt(0,2);
          var sizeIt = potentialWinners.length;
          var pickUser = getRandomInt(0,potentialWinners.length);
          // If winner
          if(ranval > 0 && sizeIt > 0) {
            client.action(channelBroadcaster,"The hunt has ended and we have ourselves a winner! Time to party for " + potentialWinners[pickUser] + "! " + potentialWinners[pickUser] + " just won " + currentPool + " eggs!");
            userDB[potentialWinners[pickUser]] += currentPool;
          }
          // If Losers
          else
            client.action(channelBroadcaster,"The hunt has ended and we have nothing but losers! No party!");

          potentialWinners = [];
          heistInterval = setInterval(()=> {
            heistTimer--;
          },1*1*1*1000);

          currentPool = 0;
          userCount = 0;
          var jsonDB = JSON.stringify(userDB);
          fs.writeFileSync('userDB.txt',jsonDB);

          // Heist reset timeout
          setTimeout(function(){
            if(heistInterval)
              clearInterval(heistInterval);
            heist = true;
          },1*5*60*1000);
        },1*1*30*1000); // hr * min * sec * ms)
      }
    }

    if (collecting === true && currentMessageCommand === "!risk") {
      if(commandWords[1] === undefined || isNaN(commandWords[1]) || commandWords[1] === null)
        return;
      var pointsToAdd = parseInt(commandWords[1]);
      if (isNaN(pointsToAdd) || pointsToAdd < 0)
        return;

      if (pointsToAdd > userDB[user.username])
        pointsToAdd = userDB[user.username];

      userDB[user.username] -= pointsToAdd;

      currentPool += 2*pointsToAdd;
      potentialWinners[userCount] = user.username;
      userCount++;
    }
  }



});

// Point System
var intervalObj;
var countPoints = true;

client.on('join', function(channel,user,self){

  // Ignore bot chats
  console.log("~~~~~~~~~~~" + user + " joined!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  broadcastInfo.cmd = "Join";
  broadcastInfo.latestViewer = user;
  broadcastInfo.viewerList[user] = 1;
  wss.broadcast(JSON.stringify(broadcastInfo));
  if (self || user.toLowerCase() === "eggghead" || user.toLowerCase() === "nightbot")
    return;

  if(userDB[user] === undefined)
    userDB[user] = 0;
});

client.on('part', function(channel,user,self){
  broadcastInfo.cmd = "Part";
  broadcastInfo.viewerList[user] = 0;
  wss.broadcast(JSON.stringify(broadcastInfo));
  console.log("~~~~~~~~~~~" + user + " parted!");
  //countPoints = false;
  var jsonDB = JSON.stringify(userDB);
  fs.writeFileSync('userDB.txt',jsonDB);
  //countPoints = true;
});


if(intervalObj) {
  clearInterval(intervalObj);
}
intervalObj = setInterval(()=>{
  if (countPoints) {
    for (var userName in userDB) {
      userDB[userName]+=1;
    }
  }
},1*1*6*1000); // hr * min * sec * ms

var pointSaver;
if(pointSaver){
  clearInterval(pointSaver);
}
pointSaver = setInterval(()=> {
  //countPoints = false;
  var jsonDB = JSON.stringify(userDB);
  fs.writeFileSync('userDB.txt',jsonDB);
  //countPoints = true;
  console.log("MARK! DB Saved!")
},1*5*60*1000);

/*var intervalMessage1;
if(intervalMessage1){
  clearInterval(intervalMessage1);
}
intervalMessage1 = setInterval(()=>{
  client.action(channelBroadcaster,"Welcome to Eggghead's channel");
},1*10*60*1000); // hr * min * sec * ms
*/
/*
var randomInterval;
if(randomInterval){
  clearInterval(randomInterval);
}
randomInterval = setInterval(()=> {

},1*5*60*1000);
*/
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
