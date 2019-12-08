const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser'); //post로 받은 데이터 해석 모듈
const ejs = require('ejs'); //ejs페이지 모듈
const bcrypt = require('bcrypt'); //비밀번호 암호화 모듈
const dbConfig = require('./db'); //db연결을 위한 커넥션
const join = require('./join'); //회원가입 모듈

const ht = require('http').createServer();
const socketio = require('socket.io')(ht);// 소켓io모듈 
const http = require('http'); //http모듈
const fs = require('fs');

const app = express();

app.use(express.static('public')); //추가

//-------db연결---------//
const dbOptions = dbConfig;
const conn = mysql.createConnection(dbOptions);
conn.connect();

//----------로그인API---------//
app.set('view engine', 'ejs');
app.set('views', './view');
app.use(bodyParser.urlencoded({ extended: false })); //로그인 인코딩
app.use(session({
  secret: '!@#$%^&*',
  store: new MySQLStore(dbOptions),
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  function (id, pw, done) {
    let sql = 'SELECT * FROM users WHERE id=?';

    conn.query(sql, [id], function (err, results) { //db에서 id를 찾아 일치하는지 검색
      if (err)
        return done(err);

      if (!results[0])
        return done('please check your id.');

      let user = results[0];

      const r1 = bcrypt.compareSync(pw, user.pw);  //비밀번호 hash값 복호화
      console.log('해시값 비교:' + r1);

      let sql2 = 'SELECT id FROM users WHERE pw=?';
      conn.query(sql2, [user.pw], function (err, results) {

        if (r1 == false) //암호화된 비밀번호와 입력한 비밀번호가 다를 경우 로그인 실패
          return done('please check your password.');

        else (err) //암호화된 비밀번호와 입력한 비밀번호가 일치하면 로그인 성공
        console.log('로그인 성공!');
        return done(null, user);
      });
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  let sql = 'SELECT * FROM users WHERE id=?';
  conn.query(sql, [id], function (err, results) {
    if (err)
      return done(err, false);
    if (!results[0])
      return done(err, false);

    return done(null, results[0]);
  });
});

app.get('/', function (req, res) {
  if (!req.user)
    res.redirect('/login'); //세션에 로그인 정보가 없을때 무조건 로그인 페이지로 돌아감.
  else
    res.redirect('/main');

});

app.get('/login', function (req, res) {
  if (!req.user)
    res.render('login', { message: 'input your id and password.' });
  else
    res.redirect('/main');
});

app.get('/main', function (req, res) {
  if (!req.user)
    return res.redirect('/login');
  else
    res.render('main', { name: req.user.name });
  });

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/login',
  passport.authenticate(
    'local',
    {
      successRedirect: '/main',
      failureRedirect: '/login',
      failureFlash: false
    })
);

/*app.listen(3000, function () {
 console.log('Example app listening on port 3000!');
});*/

const server = http.createServer(app);
server.listen(5, function () {
  console.log('server running at http://127.0.0.1:5');
});
app.set('port', process.env.PORT || 8000);

//----------------- 그림 채팅 API-----------------------//
app.get('/lobby.html', function (request, response) {
  if (!request.user)
    response.redirect('/login'); //로그인 안하고 접근시 무조건 로그인 페이지로!!
  else
    fs.readFile('./lobby.html', function (error, data) {
      response.send(data.toString());
    });
});

app.get('/canvas/:room', function (request, response) { //채팅방을 생성
  fs.readFile('./canvas.html', 'utf8', function (error, data) { //채팅방 생성후 페이지 이동
    response.send(ejs.render(data, {
      room: request.params.room
    }));
  });
});

app.get('/view/canvas/room', function (request, response) { //생성된 채팅방
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

  socketio.on('connection', function (socket) {
    console.log('user connected: ', socket.id);
    const name = "사용자";
    socketio.to(socket.id).emit('change name', name);
    socketio.on('disconnect', function () {
      console.log('끊어진 사용자: ', socket.id)
    });

  });
    // chat 이벤트
    socket.on('message', function (name, message) {
      //const name = req.user.name;
      const msg = name + ': ' + message; //메시지 = 이름+보낼메시지
      console.log(msg);
      socketio.emit('send_msg', msg); 

    });

  });

//-------------회원가입API------------//
app.use(join); //회원가입 모듈 불러오기

app.get('/join', function (request, response) {
  fs.readFile('./join.html', function (error, data) {
    response.send(data.toString());
  });
});

