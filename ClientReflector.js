//

var WorldRecorder = require("./WorldRecorder.js");

module.exports = ClientReflector;

function ClientReflector(Client){
    this.isAlive = true;
    this.isActive = false;
    this.packets = [];
    this.ClientNMP = Client;
    this.Recorder = new WorldRecorder(Client);
    
    function HandlePacket(Packet, Metadata){
        if(this.isAlive == false || isBadPacket(Packet, Metadata)) return;
        
        this.isActive = true;
        this.packets.push({
            "packet": Packet,
            "metadata": Metadata
        });
    }
    
    function HandleEnd(){
        this.isAlive = false;
    }
    
    function HandleError(e){
        this.isAlive = false;
        
        console.log("Something bad happened, and Node is probably in an unstable state.");
        console.log("Don't worry about it, it happens all the time");
        console.log("Error message: " + e.message);
    }
    
    Client.on('packet', HandlePacket.bind(this));
    Client.on('end',    HandleEnd.bind(this));
    Client.on('error', HandleError.bind(this));
}

ClientReflector.prototype.getPackets = function(){
    var temp = this.packets;
    this.packets = [];
    return temp;
}

ClientReflector.prototype.sendPacket = function(Name, Packet){
    if(this.isAlive == false) return;
    
    logPacket(Name, Packet);
    
    this.ClientNMP.write(Name, Packet);
}

ClientReflector.prototype.sendWorld = function(OtherRecorder){
    // TODO: clear out old chunks that where sent to client.
    for(var Key in OtherRecorder.chunks){
        var Chunk = OtherRecorder.chunks[Key];
        
        this.sendPacket('map_chunk', {
            x: Chunk.x,
            z: Chunk.z,
            groundUp: true,
            bitMap: 0xffff,
            chunkData: Chunk.dump()
        });
    }
    
    var PlayerPos = OtherRecorder.getPlayerPosition();
    
    this.sendPacket('position', {
        x: PlayerPos.x,
        y: PlayerPos.y,
        z: PlayerPos.z,
        yaw: 0,
        pitch: 0,
        flags: 0 // TODO: figure out what flags are.
    });
}

ClientReflector.prototype.getUsername = function(){
    return this.ClientNMP.username;
}

ClientReflector.prototype.end = function(Text){
    if(this.isAlive == true){
        this.ClientNMP.end(Text);
        this.isAlive = false;
    }
}

var BadPacketNames = {
    "compress": true,
    "success": true
};
function isBadPacket(Packet, Metadata){
    if(BadPacketNames[Metadata.name] == undefined){
        return false;
    }else{
        return true;
    }
}

var DontLog = {
    "flying": true,
    "position": true,
    "look": true,
    "position_look": true,
    "keep_alive": true
}
function logPacket(Name, Packet){
    if(DontLog[Name] == undefined){
        //console.log(Name);
        //console.log(Packet);
    }
}