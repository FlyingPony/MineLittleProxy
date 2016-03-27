//

var NMP = require("minecraft-protocol");

var Naming = require("./Naming.js");

var IdleNaming = new Naming("Idle");

module.exports = function(ServerInfo){
    var Server = NMP.createServer(ServerInfo);
    var Name = IdleNaming.makeName();
    
    console.log("[" + Name + "] Listening for clients");
    
    Server.on('login', function(Client){
        doSpawn(Client);
        
        console.log("[" + Name + "] Player " + Client.username + " connected to an idle server");
        
        say(Client, "[" + Name + "] Hello " + Client.username + ", welcome to the idle server.");
        say(Client, "[" + Name + "] By default the proxy does not disconnect from servers when you disconnect, so remember to /proxy quit !");
        say(Client, "[" + Name + "] Connect to a server using /proxy connect <server name> <username>, and switch to it using /proxy switch <server name> <username>");
        
        Client.on('chat', function(){
            say(Client, "[" + Name + "] You cannot chat in the idle server, " + Client.username);
        });
        Client.on('end', function(){
            console.log("[" + Name + "] Player " + Client.username + " left the idle server");
        });
    });
}

function say(Client, Text){
    Client.write('chat', {
        "message": JSON.stringify(Text)
    });
}

function doSpawn(Client){
    Client.write('login', {
        entityId: Client.id,
        levelType: 'default',
        gameMode: 1,
        dimension: 0,
        difficulty: 2,
        maxPlayers: 10,
        reducedDebugInfo:false
    });
    Client.write('position', {
        x: 0,
        y: 256,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    });
}