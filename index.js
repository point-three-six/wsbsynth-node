var app = require("express")();
var app2 = require("express")();
var http = require('http');
var https = require('https');
var bodyParser = require('body-parser');
var fs = require( 'fs' );

var PROD = false;

if(PROD){
    var server = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/wsbsynth.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/wsbsynth.com/fullchain.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/wsbsynth.com/chain.pem') 
    },app2);
    server.listen(3000);   
} else {
    var server = http.Server(app2);
    server.listen(3000);
}

var io = require('socket.io').listen(server);

var lastPayload = [];
var last_mentions = [];

// keeps track of average of last 10 payloads and the
// # of comments in each.
var payloadCounts = [];

var current_dd_url = "";
var current_dd_title = "";

io.on('connection', (socket) => {
    if(get_payload_avg() < 3 && lastPayload.length > 0){
        socket.emit('chunk', lastPayload);
    }

    if(current_dd_url && current_dd_title){
        socket.emit('info', {
            "listeners" : io.engine.clientsCount,
            "current_dd_url" : current_dd_url,
            "current_dd_title" : current_dd_title
        });
    }

    socket.emit('mentions', last_mentions);
});

setInterval(function(){
    io.emit('info', {
        "listeners" : io.engine.clientsCount,
        "current_dd_url" : current_dd_url,
        "current_dd_title" : current_dd_title
    });
},10000);

app.use(bodyParser.json())
app.post('/',function(req, res){
    res.send();
    var payload = req.body;
    var numComments = payload.length;
    if(numComments > 0){
        io.emit('chunk', payload);
        lastPayload = payload;
    }

    payloadCounts.push(numComments);
});
app.post('/metadata',function(req, res){
    res.send();
    var metadata = req.body;

    current_dd_url = metadata.url;
    current_dd_title = metadata.title;
});
app.post('/mentions',function(req, res){
    res.send();
    last_mentions = req.body;

    io.emit('mentions', last_mentions);
});

http.Server(app).listen(3001, function(){
    console.log('Listening (prod:'+ PROD +')...');
});

function get_payload_avg(){
    var num_payloads = payloadCounts.length;
    if(num_payloads > 10){
        payloadCounts.shift();
        num_payloads--;
    }
    var sum = payloadCounts.reduce((a, b) => a + b, 0);
    var avg = sum / num_payloads;
    return avg;
}