var express = require('express');
var session = require('express-session');//세션 사용을 위한 모듈
var bodyParser = require('body-parser');//POST 방식 전송을 위해서 필요함
var app = express();
var MySQLStore = require('express-mysql-session')(session);//session mysql 스토어를 위해 사용
var bkfd2Password = require("pbkdf2-password");//pbkdf2-password 모듈 사용
var hasher = bkfd2Password();
var passport = require('passport');//passport 모듈 사용
var LocalStrategy = require('passport-local').Strategy;//passport 모듈 사용
var FacebookStrategy = require('passport-facebook').Strategy;
var mysql = require('mysql');//MYSQL 사용하기위해 씀

 
app.use(bodyParser.urlencoded({extended: false}));//미들웨어 등록부분
//resave 세션아이디를 접속할때마다 발급하지 않는다
app.use(session({
secret: '12312dajfj23rj2po4$#%@#',
resave: false,
saveUninitialized: true,
store:new MySQLStore({
host: 'localhost',
port: 3306,
user: 'root',
password: '1234',
database: 'nodejs'

})

}));

 

var conn = mysql.createConnection({
host : 'localhost',
user : 'root',
password : '1234',
database : 'nodejs',
port : 3306
});

 

conn.connect();//database 접속 완료

app.use(passport.initialize());//passport 초기화
app.use(passport.session());//passport 인증 작업시 필요 이것은 세션을 사용하기 위한 윗 app.use(session)뒤에 써야한다
app.get('/auth/logout', function(req, res){
req.logout();//passportjs에 있는 기능
req.session.save(function(){//세션작업이 끝난상태에서 안전하게 welcome페이지로 이동
res.redirect('/welcome');
});

});

 
app.get('/welcome', function(req, res){
//console.log(req.user);
//passportjs의 세션을 이용하는게 바람직함
console.log('welcome page!!');
if(req.user && req.user.displayName){//req객체에 user가 생성되었고 값이 있으면 로그인 성공
res.send(`
<h1>Hello, ${req.user.displayName}</h1>
<a href="/auth/logout">logout</a>
`);

}else{//값이 없으면 로그인에 실패 혹은 로그인 안한사람
res.send(`
<h1>Welcome</h1>
<ul>
<li><a href="/auth/login">Login</a></li>
<li><a href="/auth/register">Register</a></li>
</ul>

`);

}
});

 
var users = [
{
authId:'local:egoing',//facebook때문에추가됨
username:'egoing',
password:'bXHtzdi7m+jclUkfYdqgGsm5nYpBBYrqUFjkP+wHFF/j+zFipSf2N8GZJ7eD0yp9T9ovLbnCjjtS/upvcIL8Tw2ffG0G6vnk1vQfG4qMmSyXM4Aug8xgzJxGalSCnbkMVQR5A8r22kKoeTQIjkQtMFisPwZQZSuknrreGuq9am4=',
salt:'rWfFWL8EZGoKGGbzryiu1ZJfkfhvBo0XMinpFrJLTy43EmOV2g9LXIL6385l5FerQAlVK1jXYNmFryKHREPXxQ==',
displayName:'egoing'
},
];

app.post('/auth/register', function(req, res){
hasher({password:req.body.password}, function(err, pass, salt, hash){
var user = {
authId:'local:'+req.body.username,//facebook때문에 추가됨
username:req.body.username,
password:hash,//hash로 대체함
salt:salt,//만든 salt값도 같이 저장함
displayName:req.body.displayName
};
 
var sql = 'INSERT INTO users SET ?';
conn.query(sql, user, function(err, results){
if(err){
console.log(err);
res.status(500);
}else{
//회원가입후 바로 로그인 하기 위한 코드임
req.login(user, function(err){//회원가입이 되고 바로 동시에 로그인 하기 위함
req.session.save(function(){
res.redirect('/welcome');
});
});
}
});//두번째에 user를 주면 알아서 authId = ~~ 등으로 들어감
 
});
});

app.get('/auth/register', function(req, res){
var output = `
<h1>Register</h1>
<form action="/auth/register" method="post">
<p>
<input type="text" name="username" placeholder="username">
</p>
<p>
<input type="password" name="password" placeholder="password">
</p>
<p>
<input type="text" name="displayName" placeholder="displayName">
</p>
<p>
<input type="submit">
</p>
</form>
`;
res.send(output);
});


//done(null, user)가 호출되면 이게 호출됨 여기의 user는 아래 콜백의 user임
passport.serializeUser(function(user, done) {
//console.log('serializeUser', user);
done(null, user.authId);//고유의 id값을 넘겨줘야함 유저를 찾는데 사용함 이 데이터는 세션에 저장됨
});

 

//serializeUser실행 후 다음 유저는 deserializeUser메소드로 옴

//즉 id는 user.authId임 facebook 때문에 변경됨

passport.deserializeUser(function(id, done) {
console.log('deserializeUser1', id);
var sql = 'SELECT * FROM users WHERE authId=?';
conn.query(sql, {id}, function(err, results){
if(err){
console.log(err);
done('There is no user');
}else{
done(null, results[0]);
}
});
});

 

//미들웨어부분

passport.use(new LocalStrategy(
function(username, password, done){//여기서 실제 사용자가 맞는지 인증하는 부분을 수행
var uname = username;//POST방식으로 보낸 값을 가져옴
var pwd = password;
var sql = 'SELECT * FROM users WHERE authId=?';
conn.query(sql, ['local:'+ uname], function(err, results){
if(err){
return done('There is no user');
}//if문
var user = results[0];//쿼리된 값 1개를 가져와서
return hasher({password:pwd, salt:user.salt}, function(err, pass, salt, hash){//salt는 이미 저장된 salt값을 넘겨줌
if(hash === user.password){//저장된 해쉬값과 만든 해쉬값이 같으면 인증 성공
//console.log('localstrategy', user);
done(null, user);//로그인 성공을 의미 serializeUser 호출 윗 파라미터의 done이 아니다
}else{
done(null, false);//로그인 실패를 의미 message항목은 failureFlash가 true일때만 씀
}//if문 종료
});//hasher 종료
});//query문 종료
}));//use문 종료

 
//facebook strategy 등록 부분
passport.use(new FacebookStrategy({
clientID: '381822035542311',//개발자 페이지에서 APP ID 값
clientSecret: '5f8d7e59b8701fa64cf7343ebe8c0d8a',//개발자 페이지에서 App Secret값 입력
 
callbackURL: "/auth/facebook/callback",//다음 콜백 페이지
profileFields:['id', 'email', 'gender', 'link', 'locale',
'name', 'timezone', 'updated_time', 'verified', 'displayName']

},

 

//profile은 페이스북에 의해 제공된 유저 프로필 정보를 포함한다.
function(accessToken, refreshToken, profile, done) {
console.log(profile);
var authId = 'facebook:'+ profile.id;//사용자의 고유한 값을 넣어줌
for(var i=0; i<users.length; i++){
var user = users[i];
if(user.authId === authId){//이미 존재하는 사용자인지 확인
return done(null, user);//사용자 정보를 넘겨줌
}

}

//이제 식별자는 authId가 됨 기존의 식별자는 username이었음 그래서 기존 데이터에 authId를 추가함

//사용자의 이메일도 수용가능
var newuser = {
'authId':authId,
'displayName':profile.displayName,
'email':profile.emails[0].value
};

//사용자가 없으면 사용자를 만들고 푸쉬함
users.push(newuser);
done(null, newuser);
}
));

 

 

//전송된 데이터는 passport.authenticate라는 미들웨어로 가게함

//성공시 /welcome으로

//실패시 /auth/login으로 감

//로그인 실패시 사용자에게 인증에 실패했다고 정보를 알려주는 것이 failureFlash: true

// 'local전략을 쓰라는뜻 만약 페이스북이면 'facebook'이 될 것임


 
//local 전략이 실행되면 function(username, password, done) 콜백이 실행됨

app.post('/auth/login',
passport.authenticate('local', {
successRedirect: '/welcome',
failureRedirect: '/auth/login',
failureFlash: false })
);

 

//get방식으로 다음링크에 오면 facebook전략으로 동작 시킮
app.get('/auth/facebook',
passport.authenticate('facebook',
{scope:'email'}//scope에서 페이스북에서 email을 가져올 수 있음.
));

 

//callbackURL: "/auth/facebook/callback"에 의해서 호출되는 페이지

//페이스북일 때는 라우트가 2개가 된다.

//라우트를 2번하는 이유 :

//페이스북 링크 클릭하면 /auth/facebook으로 감

//사용자가 페이스북 으로 가입 버튼을 누르면 페이스북으로 다시한번 정보를 추가해서 넘겨줌

//이부분이 바로 아래 콜백이 함

app.get('/auth/facebook/callback',
passport.authenticate('facebook',
{
successRedirect: '/welcome',
failureRedirect: '/auth/login'
}
));

 

 

app.get('/auth/login', function(req, res){
var output = `
<h1>Login</h1>
<form action="/auth/login" method="post">
<p>
<input type="text" name="username" placeholder="username">
</p>
<p>
<input type="password" name="password" placeholder="password">
</p>
<p>
<input type="submit">
</p>
</form>
<a href="/auth/facebook">FACEBOOK</a>
`;
res.send(output);
});

 

app.get('/count', function(req, res){
if(req.session.count){//값이 있을때
req.session.count++;
}else{//처음 접속했을때 즉 값이 없을 때
req.session.count = 1;//세션을 만듬
}
 

res.send('count : ' + req.session.count);
});

 
app.listen(3000, function(){
console.log('Connected 3000 port!!!');

});
