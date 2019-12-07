const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser'); //post로 받은 데이터 해석 모듈
const ejs = require('ejs'); //ejs페이지 모듈
const crypto = require('crypto'); //비밀번호 암호화 모듈
const dbConfig = require('./db'); //db연결을 위한 커넥션


//추가구문
const ht = require('http').createServer();
const socketio = require('socket.io')(ht);
//const express = require('express');
const http = require('http');
//const ejs = require('ejs');
const fs = require('fs');

const app = express();

app.use(express.static('public')); //추가

//-----db연결---------//
const dbOptions = dbConfig;
const conn = mysql.createConnection(dbOptions);
conn.connect();

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
    let sql2 = 'SELECT id FROM users WHERE pw=?';
    conn.query(sql, [id], function (err, results) {
      if (err)
        return done(err);

      if (!results[0])
        return done('please check your id.');


      let user = results[0];
      conn.query(sql2, [pw], function (err, results) {

        if (!results[0])
          return done('please check your password.');

        else (err)
        console.log('로그인 성공!');
        return done(null, user);

        /* crypto.pbkdf2(password, user.salt, 100000, 64, 'sha512', function(err, derivedKey){
              if(err)
                return done(err);
       
              if(derivedKey.toString('hex') === user.password)
                return done(null, user);
              else
                return done('please check your password.');*/
      });//pbkdf2
    });//query
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



//----------------- 그림 채팅 시작-----------------------//
app.get('/lobby.html', function (request, response) {
  if (!request.user)
    response.redirect('/login'); //로그인 안하고 접근시 무조건 로그인 페이지로!!
  else
    fs.readFile('./lobby.html', function (error, data) {
      response.send(data.toString());
    });
});

app.get('/canvas/:room', function (request, response) {
  fs.readFile('./canvas.html', 'utf8', function (error, data) {
    response.send(ejs.render(data, {
      room: request.params.room
    }));
  });
});

app.get('/view/canvas/room', function (request, response) {
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
  socketio.on('connection', function (socket) {
    console.log('user connected: ', socket.id);
    const name = "사용자";
    socketio.to(socket.id).emit('change name', name);
    socketio.on('disconnect', function () {
      console.log('끊어진 사용자: ', socket.id)
    });

    // chat 이벤트
    socket.on('message', function (name, message) {

      const msg = name + ': ' + message;
      console.log(msg);
      socketio.emit('send_msg', msg);

    });

  });

});



//-------------회원가입API------------//
conn.connect((err) => {
  if (!err)
    console.log('db연결됨!');
  else
    console.log('db연결 안됨\n Error : ' + JSON.stringify(err, undefined, 2));
});


app.get('/join', function (request, response) {
  fs.readFile('./join.html', function (error, data) {
    response.send(data.toString());
  });
});



app.use(bodyParser.text());
app.use(bodyParser.text({ limit: '50mb' })); //body 의 크기 설정
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.post('/join', (req, res) => {

  let body = req.body;
  let id = body.id;
  let password = body.password;
  let name = body.name;
  let email = body.email;

  //res.send('id : ${id}, password : ${password}, name : ${name}, email : ${email}');
  if (!id || !password || !name || !email) {
    // res.send('회원가입 정보를 모두 기입하십시오!');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body><h1 style="color: red;">회원가입 정보를 모두 입력 하세요!</h1>' +
      '<input type="button" value="회원가입 페이지로 이동" onclick="history.back(-1)"></body></html>');

    return;
  }


  //var sql = 'INSERT INTO users(id, pw, email, name) VALUES(?, ?, ?, ?)';

  conn.query('INSERT INTO users(id, pw, email, name) VALUES("' + id + '","' + password + '","' + email + '","' + name + '")', function (err, rows) {

    if (err)
      console.log(err);
    else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body><h1>회원가입 완료!</h1>' +
        '<a href="./login">로그인하기!</a></body></html>');
      console.log(rows.insertId);
    }


  });
});