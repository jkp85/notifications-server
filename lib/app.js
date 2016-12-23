"use strict";
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const redis = require("redis");
const redis_client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379/0' });


// Run server to listen on port 3000.
const server = app.listen(process.env.port || 3000, (err) => {
    if (err) {
        return console.log('An error occurred when the server was starting.', err);
    }
    console.log('listening on *:3000');
});

const io = require('socket.io')(server);

// middleware's
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// express routes to invoke from hubserver
app.post('/notifications/:projecthashid/import/status', (req, res) => {
    let room = req.params.projecthashid;
    console.log(req.body.resource);
    if (room) {
        io_integrations.to(room).emit('import status', {
            integration_cache_key: req.body.integration_cache_key,
            status: req.body.status,
            resource: req.body.resource
        });
        return res.send('ok');
    } else {
        return res.send(404, 'User not connected');
    }
});

app.post('/notifications/servers/:serverHashId/update', (req, res) => {
    console.log(req.body);
    io_servers.emit('update image', {id: req.params["serverHashId"], update: req.body});
    return res.send('ok');
});

app.post('/notifications/servers/:serverHashId/updated', (req, res) => {
    console.log(req.body);
    io_servers.emit('server updated', req.body);
    return res.send('ok')
});

app.post('/notifications/:projecthashid/servers/status', (req, res) => {
    let room = req.params.projecthashid;
    console.log(req.body.statuses);
    if (room) {
        io_integrations.to(room).emit('server status', req.body.statuses);
        return res.send('ok');
    } else {
        return res.send(404, 'User not connected');
    }
});

let io_integrations = io.of('/integrations');
let io_servers = io.of('/servers');

io_integrations.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('client disconnected from integrations');
    });

    socket.on('room', (room) => {
        console.log('join to room', room);
        socket.join(room);
    });
});

io_servers.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('client disconnected from servers');
    });

    socket.on('room', (room) => {
        console.log('join to room', room);
        socket.join(room);
    });
    socket.on('retrieve statuses', (servers_cache_keys) => {        
        console.log('servers keys:' + servers_cache_keys);
        
        servers_cache_keys.forEach(function(s) {
            try {
                redis_client.hget(s, "status", function(err, reply) {
                    // reply is null when the key is missing
                    let current_statuses = [];
                    if (!!reply) {
                        console.log(reply);
                        current_statuses.push({ "server_cache_key": s, "status": reply });
                        socket.emit('server status', { statuses: current_statuses });
                    }
                });

            } catch (e) {}
        });        
    });
});

redis_client.on("error", function(err) {
    console.log("Error on redis connection " + err);
});
