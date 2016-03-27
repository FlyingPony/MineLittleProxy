//

var Assert = require("assert");
var NMP = require("minecraft-protocol");

var Client = require("./Client.js");
var IdleServerInit = require("./IdleServer.js");

module.exports = Proxy;

function Proxy(){
    this.ServerNMP = undefined;
    
    this.numIdleServers = 3;
    
    this.serverInfos = {};
    this.clients = [];
    
    this.usernameToClient = {};
}

Proxy.prototype.tick = function(){
    for(Index in this.clients){
        var Client = this.clients[Index];
        
        Client.tick();
        var Commands = Client.getCommands();
        
        for(var i in Commands){
            var Argv = Commands[i];
            Argv.shift();
            
            if(Argv[0] == 'quit'){
                this.removeClient(Client.username);
            }else if(Argv[0] == 'connect'){
                var ServerInfo = this.serverInfos[Argv[1]];
                var UserInfo = {"username":Argv[2]};
                
                // Make sure we don't try to connect to a non-existant server
                if(ServerInfo == undefined || UserInfo.username == undefined){
                    Client.tell("Invalid connect");
                }else{
                    Client.addOutgoing(ServerInfo, UserInfo);
                }
            }else if(Argv[0] == 'switch'){
                if(Client.isValidOutgoing(Argv[1], Argv[2])){
                    Client.tell("Switching to player " + Argv[2] + " on server " + Argv[1]);
                    Client.setOutgoing(Argv[1], Argv[2]);
                }else{
                    Client.tell("Invalid switch");
                }
            }
        }
    }
}

Proxy.prototype.listen = function(ServerSettings){
    var ServerNMP = NMP.createServer(ServerSettings);
    
    for(var i = 1; i <= this.numIdleServers; i++){
        IdleServerInit({
            "port": ServerSettings.port + i,
            "online-mode": false
        });
        
        this.addServer({
            "name": "idle" + i,
            "ip": "localhost",
            "port": ServerSettings.port + i,
        });
    }
    
    var Self = this;
    
    ServerNMP.on('login', function(Client){ Self.addClient.bind(Self)(Client); });
    
    this.ServerNMP = ServerNMP;
}

Proxy.prototype.addClient = function(IncomingClient){
    if(this.usernameToClient[IncomingClient.username] == undefined){
        // Player is not already active.
        
        var LocalClient = new Client(IncomingClient);
        LocalClient.addOutgoing(this.serverInfos["idle1"], {"username":IncomingClient.username});
        LocalClient.setOutgoing("idle1", IncomingClient.username);
        
        this.clients.push(LocalClient);
        this.usernameToClient[LocalClient.IncomingClient.getUsername()] = LocalClient;
    }else{
        // Player has a client instance active.
        this.usernameToClient[IncomingClient.username].setIncomingClient(IncomingClient);
    }
}

Proxy.prototype.removeClient = function(Username){
    this.usernameToClient[Username].end();
    
    var ClientIndex = this.clients.indexOf(this.usernameToClient[Username]);
    this.clients = this.clients.splice(ClientIndex, 1);
    
    delete this.usernameToClient[Username];
}

Proxy.prototype.addServer = function(ServerInfo){
    Assert(ServerInfo != undefined, "Server info should not be undefined!");
    Assert(ServerInfo.name != undefined, "Server should have a name");
    Assert(ServerInfo.ip != undefined, "Server should have an IP");
    Assert(ServerInfo.port != undefined, "Server should have a port to connect to");
    
    this.serverInfos[ServerInfo.name] = ServerInfo;
}

Proxy.prototype.addServerList = function(ServerList){
    Assert(ServerList instanceof Array, "Server list should be an array of server infos");
    
    for(var i = 0; i < ServerList.length; i++){
        this.addServer(ServerList[i]);
    }
}