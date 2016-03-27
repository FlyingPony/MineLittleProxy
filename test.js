//

var Proxy = require("./Proxy.js");

var ServerList = require("./ServerList.json");
var LocalServerSettings = require("./LocalServer.json");

var MyProxy = new Proxy();

MyProxy.addServerList(ServerList);

MyProxy.listen(LocalServerSettings);

setInterval(function(){
    MyProxy.tick();
}, 50);

console.log("[Init] Proxy up");