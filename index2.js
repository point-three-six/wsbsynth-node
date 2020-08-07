var app = require("express")();
var app2 = require("express")();
var http = require('http').Server(app);
var https = require('https');
var bodyParser = require('body-parser');
var fs = require( 'fs' );

var PROD = false;

if(PROD){
    var server = https.createServer({
        key: fs.readFileSync('/etc/letsencrypt/live/wsbsynth.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/wsbsynth.com/fullchain.pem') 
    },app2);
    server.listen(3000);   
} else {
    var server = http.createServer(app2);
    server.listen(3000);
}

var io = require('socket.io').listen(server);

var lastPayload = [];

// keeps track of average of last 10 payloads and the
// # of comments in each.
var payloadCounts = [];

io.on('connection', (socket) => {
    if(get_payload_avg() < 3 && lastPayload.length > 0){
        socket.emit('chunk', lastPayload);
    }
});

app.use(bodyParser.json())
app.post('/',function(req, res){
    res.send();
    console.log('received');
    var payload = req.body;
    var numComments = payload.length;
    if(numComments > 0){
        io.emit('chunk', payload);
        lastPayload = payload;
    }

    payloadCounts.push(numComments);
});

http.listen(3001, function(){
    console.log('Listening ...');
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