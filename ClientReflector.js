//

module.exports = ClientReflector;

function ClientReflector(Client){
    this.isAlive = true;
    this.isActive = false;
    this.packets = [];
    this.ClientNMP = Client;
    
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
    
    Client.on('packet', HandlePacket.bind(this));
    Client.on('end',    HandleEnd.bind(this));
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