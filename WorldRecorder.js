//

var Assert = require("assert");

var PrismarineChunkRaw = require("prismarine-chunk");
var Vec3 = require("Vec3");

module.exports = WorldRecorder;

function WorldRecorder(Client){
    this.chunks = {};
    this.playerPosition = new Vec3(0, 256, 0);
    
    // We need to tell prismarine chunk what version to accept.
    var PrismarineChunk = PrismarineChunkRaw(Client.version.substring(0, 3));
    
    function HandleChunk(Packet, Metadata){
        var Chunk = new PrismarineChunk();
        Chunk.load(Packet.chunkData);
        this.setChunk(Packet.x, Packet.z, Chunk);
    }
    
    function HandlePosition(Packet, Metadata){
        this.playerPosition = new Vec3(Packet.x, Packet.y, Packet.z);
    }
    
    Client.on('map_chunk', HandleChunk.bind(this));
    Client.on('position', HandlePosition.bind(this));
}

WorldRecorder.prototype.setChunk = function(X, Z, Chunk){
    Assert(typeof X == 'number');
    Assert(typeof Z == 'number');
    Assert(typeof Chunk == 'object');
    
    Chunk.x = X;
    Chunk.z = Z;
    
    this.chunks[makeChunkCoords(X, Z)] = Chunk;
}

WorldRecorder.prototype.getChunk = function(X, Z){
    return this.chunks[makeChunkCoords(X, Z)];
}

WorldRecorder.prototype.getPlayerPosition = function(){
    return this.playerPosition;
}

function makeChunkCoords(X, Z){
    return X + "|" + Z;
}