//expand - expand the basic req and res provided by node.js
module.exports = function(req, res, handle) {
    const querystring = require('querystring');
    const mime = require('mime-types');
    const fs = require('fs');

    res.setHeader('x-powered-by', 'node-ehs');

    var pathParse = req.url.split('?');
    req.host = req.headers.host.split(':').shift();
    req.address = req.connection.remoteAddress;
    req.path = pathParse[0];
    req.query = {};
    req.cookies = {};
    req.body = {};
    req.bodyRaw = '';
    req.ended = false;

    if (pathParse.length == 2) {
        req.query = querystring.parse(pathParse[1]);
    }

    if (typeof req.headers.cookie != 'undefined') {
        var cookieParse = req.headers.cookie.split('; ');
        var cookieLoop;
        for (cookieLoop = 0; cookieLoop < cookieParse.length; cookieLoop++) { 
            var [key, value] = cookieParse[cookieLoop].split('=');
    
            if (typeof key == 'undefined') {
                key = 'cookie'+cookieLoop;
            }
    
            if (typeof value == 'undefined') {
                value = null;
            }
    
            req.cookies[key] = value;
        }
    }

    res.__end = res.end;
    res.__setHeader = res.setHeader;

    res.end = function(data) {
        if (req.ended == false) {
            req.ended = true;
            res.__end(data);
        }    
    }

    res.setHeader = function(key, value) {
        if (req.ended == false) {
            res.__setHeader(key, value)
        }   
    }

    res.status = function(code) {
        res.writeHead(code);

        return res;
    }

    res.setCookie = function (key, value, settings = []) {
        if (settings.length > 0) {
            settings = settings.join('; ');
        }

        res.setHeader('set-cookie', key+'='+value+'; '+settings);

        return res;
    }

    res.setContent = function(type) {
        res.setHeader('content-type', type);
        
        return res;
    }

    res.setContentAuto = function(file) {
        res.setHeader('content-type', mime.lookup(file));

        return res;
    }

    res.streamFile = function(file) {
        fs.createReadStream(file).pipe(res).on('end', function() {
            req.ended = true;
        });
    }

    res.sendFile = function(file) {
        res.end(fs.readFileSync(file).toString());
    }

    res.fillFile = function(file, data) {
        var _file = fs.readFileSync(file).toString();

        for (var key in data){
            if (data.hasOwnProperty(key)) {
                _file = _file.replace(new RegExp('{{'+key+'}}', 'g'), data[key]);
            }
        }

        res.end(_file);
    }

    res.send = function(data) {
        res.end(data);
    };

    res.redirect = function(location) {
        res.writeHead(302, {Location:location});
        res.end(`Go to: ${location}`);
    }

    res.json = function(data) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(data, null, 4));
    };

    if (req.method == ('POST' || 'DELETE' || 'PUT')) {
        req.on('data', function(chunk) {
            req.bodyRaw += chunk.toString();
        });
    
        req.on('end', function() {
            if (req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
                req.body = querystring.parse(req.bodyRaw);

                return handle();
            }

            
            if (req.headers['content-type'].includes('application/json')) {
                req.body = JSON.parse(req.bodyRaw);

                return handle();
            }

            req.body = req.bodyRaw;

            return handle();
        });

        return false;
    }

    return handle();
};