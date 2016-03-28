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
        "password": UserInfo.password,
        "version": "1.9"
    }
    
    var ClientNMP = NMP.createClient(OutgoingSettings);
    
    if(this.OutgoingClients[ServerInfo.name] == undefined){
        this.OutgoingClients[ServerInfo.name] = {};
    }
    
    this.OutgoingClients[ServerInfo.name][UserInfo.username] = new ClientReflector(ClientNMP);
    
    this.info("Connected " + UserInfo.username + " to server " + ServerInfo.name);
}

Client.prototype.setOutgoing = function(ServerName, Username){
    Assert(typeof ServerName == 'string', "Server name should be a string");
    Assert(typeof Username == 'string', "Username should be a string");
    
    this.currentRoute.serverName = ServerName;
    this.currentRoute.username = Username;
    
    if(this.getOutgoingClient() == undefined){
        this.warn("You just switched to an invalid outgoing connection!");
        this.currentRoute.serverName = {};
    }else{
        this.info("Switched to player " + Username + " on server " + ServerName);
        
        // Tell the client what the world is.
        if(this.IncomingClient){
            this.IncomingClient.sendWorld(this.getOutgoingClient().Recorder);
        }
    }
}

Client.prototype.endOutgoing = function(ServerName, Username, wasAbrupt){
    this.OutgoingClients[ServerName][Username].end();
    delete this.OutgoingClients[ServerName][Username];
    
    if(wasAbrupt == true){
        this.warn("Player " + Username + "'s connection to server " + ServerName + " was abruptly ended");
    }else{
        this.info("Player " + Username + " was disconnected from server " + ServerName);
    }
    
    // Did we just disconnect from our current server?
    if(ServerName == this.currentRoute.serverName && Username == this.currentRoute.username){
        this.currentRoute.serverName = undefined;
        this.currentRoute.username = undefined;
        
        this.warn("You current connection ended");
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
    
    // Send the login packet to the client can do stuff
    IncomingClient.sendPacket('login', {
        entityId: Client.id,
        levelType: 'default',
        gameMode: 1,
        dimension: 0,
        difficulty: 2,
        maxPlayers: 10,
        reducedDebugInfo:false
    });
    
    if(this.getOutgoingClient() != undefined){
        // There's an outgoing client.
        var Recorder = this.getOutgoingClient().Recorder;
        IncomingClient.sendWorld(Recorder);
    }else{
        // We don't have to send anything if there isn't a session selected.
        IncomingClient.sendPacket('position', {
            x: 0,
            y: 256,
            z: 0,
            yaw: 0,
            pitch: 0,
            flags: 0x00
        });
    }
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
        if(typeof Text == 'string'){
            Text = "[Proxy] " + Text;
        }else{
            Text.text = "[Proxy] " + Text.text;
        }
        
        this.IncomingClient.sendPacket('chat',{
            "message": JSON.stringify(Text)
        });
    }
}

Client.prototype.info = function(Text){
    this.tell({
        "text": Text,
        "color": "green"
    });
}

Client.prototype.warn = function(Text){
    this.tell({
        "text": Text,
        "color": "red"
    });
}

Client.prototype.tick = function(){
    // Tick the incoming client, even if there is not outgoing client so that the player can issue commands.
    if(this.IncomingClient != undefined){
        var Packets = this.IncomingClient.getPackets();
        
        // 
        
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
            
            // Send it out if applicable.
            if(this.getOutgoingClient() != undefined){
                this.getOutgoingClient().sendPacket(Packet.metadata.name, Packet.packet);
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
            
            // Did the outgoing connection die by the target server closing it?
            if(OutgoingClient.isAlive == false){
                this.endOutgoing(ServerName, Username, true);
            }
        }
    }
}