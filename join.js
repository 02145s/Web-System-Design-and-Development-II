const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser'); //post로 받은 데이터 해석 모듈
const bcrypt = require('bcrypt'); //비밀번호 암호화 모듈
const dbConfig = require('./db'); //db연결을 위한 커넥션
const r = express.Router(); //라우터 생성

//-------db연결---------//
const dbOptions = dbConfig;
const conn = mysql.createConnection(dbOptions);
conn.connect();

//-------------회원가입API------------//
conn.connect((err) => {
    if (!err)
        console.log('db연결 안됨\n Error : ' + JSON.stringify(err, undefined, 2));
    else
        console.log('db연결됨!');
});

r.use(bodyParser.text());
r.use(bodyParser.text({ limit: '50mb' })); //body 의 크기 설정
r.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

r.post('/join', (req, res) => {

    const body = req.body;
    const id = body.id;
    const password = body.password;
    const name = body.name;
    const email = body.email;

    if (!id || !password || !name || !email) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body><h1 style="color: red;">회원가입 정보를 모두 입력 하세요!</h1>' +
            '<input type="button" value="회원가입 페이지로 이동" onclick="history.back(-1)"></body></html>');

        return;
    }
    const salt = bcrypt.genSaltSync(10); //계속바뀌는 salt값
    const hashpw = bcrypt.hashSync(password, salt, null); //비밀번호와 salt값을 붙여서 암호화된 비밀번호를 생성한다.

    //var sql = 'INSERT INTO users(id, pw, email, name) VALUES(?, ?, ?, ?)';

    conn.query('INSERT INTO users(id, pw, email, name) VALUES("' + id + '","' + hashpw + '","' + email + '","' + name + '")', function (err, rows) {

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

module.exports = r;