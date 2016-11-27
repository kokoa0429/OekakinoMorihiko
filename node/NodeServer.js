/**
 * Created by syuchan on 2016/11/11.
 */
var http = require('http');
var ws = require("ws").Server;

var server = http.createServer(function (request, response) {
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not Found\n");
    response.end();
}).listen(4567);

var wsServer = new ws({server: server});

var id = 1;
var connections = new Map();
var chat = [];

console.log("Server Running at 4567!");

wsServer.on('connection', function (client) {
    client.closeTimeout = 300000;
    connections.set(client, id);
    var json = {};
    json.sessionCountLoad = connections.size;
    broadcastMessage(JSON.stringify(json));
    json.selfSessionId = id;
    client.send(JSON.stringify(json));
    sendOlderCanvas(client);
    sendLatestChat(client);
    console.info("Connect: ID: " + id);
    id++;

    client.on('close', function () {
        connections.delete(client);
        var json = {};
        json.mode = "close";
        json.sessionCountLoad = connections.size;
        broadcastMessage(JSON.stringify(json));
        console.info("Close: ID: " + id);
    });

    client.on('message', function (message) {
        if (message == "KeepAlive") {
            client.send("KeepAlive");
            return;
        }
        var json = JSON.parse(message);
        if (json.hasOwnProperty("sendId")) {
            getKey(json.sendId).send(message);
        } else {
            json.sessionCount = connections.size;
            json.sessionId = connections.get(client);
            if (json.mode == "chat") {
                chat.push(JSON.stringify(json));
            }
            broadcastMessage(JSON.stringify(json));
        }
    });
});

function sendLatestChat(client) {
    for (var s of chat) {
        client.send(s);
    }
}

function sendOlderCanvas(client) {
    var older = ["Test", Number.MAX_VALUE];
    for (var e of connections.entries()) {
        if (e[0].readyState != 1) continue;
        if (e[0] == client) continue;
        if (older[1] > e[1]) older = e;
    }
    var json = {};
    json.sessionCount = connections.size;
    json.mode = "canvas";
    json.option = "send";
    json.sendId = connections.get(client);
    if (older[1] != Number.MAX_VALUE) older[0].send(JSON.stringify(json));
}

function broadcastMessage(msg) {
    for (var key of connections.keys()) {
        if (key.readyState == 1) key.send(msg);
    }
}

function getKey(id) {
    for (var entry of connections.entries()) {
        if (entry[0].readyState != 1) continue;
        if (entry[1] == id) return entry[0];
    }
    return undefined;
}

