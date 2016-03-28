A simple minecraft proxy, with the ability to connect multiple clients to multiple servers, simultaneously.

What's working:

>Connecting to an arbitrary minecraft server.

>Having multiple connections open at the same time.

>Can use any username when connecting. (As long as you own the account :P)


What's to do:

>Remember the chunks, entities, and spawn/despawn them when the client connects.

>Let the player know when a connection ends.

>Simulate physics/movement on the player the user is not currently controlling, so that they don't get kicked.

Q: When I try to connect to a server, the connection is abruptly ended, why?

> You're probably trying to connect to a server that's running a previous version of minecraft (1.8 usually).
> Or you're trying to join an online server without authentication. Auth is enabled by
> default on most servers, so you'll need to use the correct password for the name you chose ;)

Q: How do I run this?

> `npm install` to install dependencies.

> `node test.js` to start the proxy.

> Start minecraft and connect to `localhost:3622`.

Q: It doesn't work, it says something about "v => transform" being an invalid character.

A: Go bother rom. (You can manually fix it by changing it to a anonymous function or switching to a newer version of node.)