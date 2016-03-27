//

var Assert = require("assert");
var NMP = require("minecraft-protocol");

var ClientReflector = require("./ClientReflector.js");

module.exports = Client;

function Client(ClientNMP){
    this.IncomingClient = new ClientReflector(ClientNMP);
    this.OutgoingClients = {};
    
    this.currentRoute = {};
    this.currentRoute.serverName = undefined;
    this.currentRoute.username = undefined;
    
    this.username = this.IncomingClient.getUsername();
    this.commands = [];
    
    this.IncomingClient.isActive = true;
}

Client.prototype.addOutgoing = function(ServerInfo, UserInfo){
    Assert(ServerInfo instanceof Object, "Server info should be an object");
    Assert(UserInfo instanceof Object, "User info should be an object");
    
    Assert(ServerInfo.ip != undefined, "Server ip not defined");
    Assert(typeof UserInfo.username == 'string', "Username should be a string");
    
    var OutgoingSettings = {
        "host": ServerInfo.ip,
        "port": ServerInfo.port,
        "username": UserInfo.username,
        "password": UserInfo.password
    }
    
    var ClientNMP = NMP.createClient(OutgoingSettings);
    
    if(this.OutgoingClients[ServerInfo.name] == undefined){
        this.OutgoingClients[ServerInfo.name] = {};
    }
    
    this.OutgoingClients[ServerInfo.name][UserInfo.username] = new ClientReflector(ClientNMP);
}

Client.prototype.setOutgoing = function(ServerName, Username){
    Assert(typeof ServerName == 'string', "Server name should be a string");
    Assert(typeof Username == 'string', "Username should be a string");
    
    this.currentRoute.serverName = ServerName;
    this.currentRoute.username = Username;
}

Client.prototype.endOutgoing = function(ServerName, Username){
    this.OutgoingClients[ServerName][Username].end();
    delete this.OutgoingClients[ServerName][Username];
    
    // Did we just disconnect from our current server?
    if(ServerName == this.currentRoute.serverName && Username == this.currentRoute.username){
        this.currentRoute.serverName = undefined;
        this.currentRoute.username = undefined;
    }
}

Client.prototype.isValidOutgoing = function(ServerName, Username){
    return this.OutgoingClients[ServerName] && this.OutgoingClients[ServerName][Username];
}

Client.prototype.setIncomingClient = function(ClientNMP){
    // Update the client on what the current context is.
    // TODO: remember chunks, entities, player state and resend them.
    
    var IncomingClient = new ClientReflector(ClientNMP);
    this.IncomingClient = IncomingClient;
    this.username = IncomingClient.getUsername();
    
    IncomingClient.sendPacket('login', {
        entityId: Client.id,
        levelType: 'default',
        gameMode: 1,
        dimension: 0,
        difficulty: 2,
        maxPlayers: 10,
        reducedDebugInfo:false
    });
    IncomingClient.sendPacket('position', {
        x: 0,
        y: 256,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    });
}

Client.prototype.getOutgoingClient = function(){
    if(this.currentRoute.serverName && this.currentRoute.username){
        return this.OutgoingClients[this.currentRoute.serverName][this.currentRoute.username];
    }else{
        return undefined;
    }
}

Client.prototype.getCommands = function(){
    var temp = this.commands;
    this.commands = [];
    return temp;
}

Client.prototype.end = function(){
    // Kill the incoming client.
    if(this.IncomingClient != undefined){
        this.IncomingClient.end("Proxy session ended, goodbye !");
    }
    
    // Kill all the outgoing clients.
    for(var ServerName in this.OutgoingClients){
        for(var Username in this.OutgoingClients[ServerName]){
            this.OutgoingClients[ServerName][Username].end();
        }
    }
}

Client.prototype.tell = function(Text){
    if(this.IncomingClient != undefined){
        this.IncomingClient.sendPacket('chat',{
            "message": JSON.stringify("[Proxy] " + Text)
        });
    }
}

Client.prototype.tick = function(){
    // Tick the incoming client, if there is a outgoing client.
    if(this.IncomingClient != undefined){
        var Packets = this.IncomingClient.getPackets();
        
        // Only send the packets if there's outgoing client.
        if(this.currentRoute.serverName && this.currentRoute.username){
            var CurrentOutgoing = this.getOutgoingClient();
            
            for(i in Packets){
                var Packet = Packets[i];
                
                // Intercept the packet if its for the proxy
                if(Packet.metadata.name == 'chat' && Packet.packet.message.split("/proxy")[0] == ''){
                    // Allow the player to be able to actually be able to send a command
                    // that is used by the proxy, so that there aren't any conflicts.
                    var m = Packet.packet.message;
                    if(m.split("/proxy say")[0] == ''){
                        // Remove the "/proxy say ".
                        Packet.packet.message = m.slice("/proxy say".length + 1); // for the extra space.
                    }else{
                        // Don't send this command, but keep note of it for the main proxy.
                        this.commands.push(m.substring(1).split(" "));
                        continue;
                    }
                }
                
                CurrentOutgoing.sendPacket(Packet.metadata.name, Packet.packet);
            }
        }
    }
    
    
    // Send the right packets from the current outgoing client to the incoming client.
    for(var ServerName in this.OutgoingClients){
        for(var Username in this.OutgoingClients[ServerName]){
            var OutgoingClient = this.OutgoingClients[ServerName][Username];
            var Packets = OutgoingClient.getPackets();
            
            // Is this outgoing client the one, and do we have a incoming client?
            if(OutgoingClient == this.getOutgoingClient() && this.IncomingClient != undefined){
                for(i in Packets){
                    var Packet = Packets[i];
                    this.IncomingClient.sendPacket(Packet.metadata.name, Packet.packet);
                }
            }
            
            // Is this connection dead?
            if(OutgoingClient.isAlive == false){
                this.endOutgoing(ServerName, Username);
            }
        }
    }
}