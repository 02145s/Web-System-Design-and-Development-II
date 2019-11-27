// 모듈을 추출합니다.
const ht = require('http').createServer();
const socketio = require('socket.io')(ht);
const express = require('express');
const http = require('http');
const ejs = require('ejs');
const fs = require('fs');

// 웹 서버를 생성합니다.
const app = express();
app.use(express.static('public'));

// 웹 서버를 실행합니다.
const server = http.createServer(app);
server.listen(5, function () {
    console.log('server running at http://127.0.0.1:5');
});
app.set('port', process.env.PORT || 8000);

// 라우트를 수행합니다.
app.get('/', function (request, response) {
    fs.readFile('lobby.html', function (error, data) {
        response.send(data.toString());
    });
});

app.get('/canvas/:room', function (request, response) {
    fs.readFile('canvas.html', 'utf8', function (error, data) {
        response.send(ejs.render(data, {
            room: request.params.room
        }));
    });
});

app.get('/room', function (request, response) {
    const rooms = Object.keys(io.sockets.adapter.rooms).filter(function (item) {
        return item.indexOf('/') < 0;
    })
    response.send(rooms);
});

// 소켓 서버를 생성합니다.
const io = socketio.listen(server);
io.sockets.on('connection', function (socket) {
    let roomId = "";

    socket.on('join', function (data) {
        socket.join(data);
        roomId = data;
    });
    socket.on('draw', function (data) {
        io.sockets.in(roomId).emit('line', data);
    });
    socket.on('create_room', function (data) {
        io.sockets.emit('create_room', data.toString());
    });

    //채팅 이름 설정
    const count = 1;
    socketio.on('connection', function(socket){
        console.log('user connected: ', socket.id);   
        const name = "사용자";
        socketio.to(socket.id).emit('change name',name);
        socketio.on('disconnect', function(){
            console.log('끊어진 사용자: ', socket.id)
        });

    // chat 이벤트
    socket.on('message', function (name, message) {
                
        
        const msg = name+': '+message;
        console.log(msg);
        socketio.emit('send_msg', msg);
      
    });
    
});

    });