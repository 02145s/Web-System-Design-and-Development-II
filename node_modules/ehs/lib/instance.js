module.exports = function(settings) {
    const http = require('http');

    const websocket = require('ws');
    const uuid4 = require('uuid/v4');
    
    const events = require('events');
    const fs = require('fs');
    const path = require('path');

    const expand = require('./expand.js');
    const router = require('./router.js');

    var ehs_instance = {
        global: {
            before: [],
            routes: [],
            static: [],
            emitter:new events.EventEmitter(),
            store:{}
        },

        sites: [],

        settings: {
            validatePath: settings.validatePath || true,
            debugText: settings.debugText || false,

            host: settings.host || '127.0.0.1',
            port: settings.port || 3000
        }
    };

    var server = http.createServer(function (req, res) {
        if (settings.validatePath && (req.path.includes('..') || req.path.includes('~'))) { //we don't do that here
            return false;
        }

        expand(req, res, function() {
            ehs_instance.global.emitter.emit('request', req, res);

            if (ehs_instance.settings.debugText) {
                console.log(`[ehs] ${req.method}:${req.host}${req.path}`);
            }
    
            try {
                var sites = ehs_instance.sites.filter(function(s) {return s.hosts.includes(req.host)});
                if (sites.length > 0) {
                    var siteRoutes = sites[0].routes.filter(function(i) {return i.type == req.method});
                    sites[0].emitter.emit('request', req, res);
    
                    if (router(req, siteRoutes, function(route) {
                        var a;
                        for (a = 0; a < ehs_instance.global.before.length; a++) {
                            if(ehs_instance.global.before[a](req, res)) {
                                return false;
                            }
                        }
    
                        var b;
                        for (b = 0; b < sites[0].before.length; b++) { 
                            if(sites[0].before[b](req, res)) {
                                return false;
                            }
                        }
    
                        return route.callback(req, res);
                    })) {
                        return false;
                    };
    
                    var d
                    for (d = 0; d < sites[0].static.length; d++) {
                        if (fs.existsSync(path.join( sites[0].static[d], req.url))) {
                            res.setContentAuto(req.url);
                            res.streamFile(path.join(sites[0].static[d], req.url));
        
                            return false;
                        }
                    }
                }
        
                var globalRoutes = ehs_instance.global.routes.filter(function(i) {return i.type == req.method});
        
                if (router(req, globalRoutes, function(route) {
                    var a;
                    for (a = 0; a < ehs_instance.global.before.length ; a++) { 
                        if(ehs_instance.global.before[a](req, res)) {
                            return false;
                        }
                    }
    
                    return route.callback(req, res);
                })) {
                    return false;
                };
    
                var d
                for (d = 0; d < ehs_instance.global.static.length; d++) {
                    if (fs.existsSync(path.join(ehs_instance.global.static[d], req.url))) {
                        res.setContentAuto(req.url);
                        res.streamFile(path.join(ehs_instance.global.static[d], req.url));
    
                        return false;
                    }
                }
            } catch (e) {
                if (ehs_instance.global.emitter.listenerCount('error') > 0) {
                    ehs_instance.global.emitter.emit('error', {message:'An error occured while trying to process a route.', error:e, code:500}, req, res);
        
                    return false;
                }
    
                console.error(e)

                /*if (req.ended == false) {
                    res.status(500).fillFile(__dirname + '/../static/error_500.html', {error:e});
                }*/

                return false;
            }
    
            if (ehs_instance.global.emitter.listenerCount('error') > 0) {
                ehs_instance.global.emitter.emit('error', {message:'Could not find a route with the path specified.', error:null, code:404}, req, res);
    
                return false;
            }
    
            res.status(404).sendFile(__dirname + '/../static/error_404.html');
            return false;
        });
    }).listen(ehs_instance.settings.port, ehs_instance.settings.host, function() {
        if (ehs_instance.settings.debugText) {
            console.log(`[ehs] HTTP server is listening on ${ehs_instance.settings.host}:${ehs_instance.settings.port}...`);
        }
    });

    server.on('upgrade', function upgrade(request, socket, head) {
        ehs_instance.global.emitter.emit('upgrade', request, socket, head);
    });

    const ws = new websocket.Server({server:server});

    ws.on('connection', function(ws, req) {
        ws.id = uuid4();

        if (ehs_instance.settings.debugText) {
            console.log(`[ehs] WebSocket:${req.url}`);
        }

        ehs_instance.global.emitter.emit('websocket', ws, req);

        if (req.url.startsWith('/socket/site-')) {
            var sites = ehs_instance.sites.filter(function(s) {return s.hosts.includes(req.url.replace('/socket/host-', ''))});

            if (sites.length > 0) {
                sites[0].emitter('websocket', ws, req);
            }
        }
    });

    return {
        reset:function() {
            ehs_instance.global.before = [];
            ehs_instance.global.routes = [];

            ehs_instance.sites = [];
        },

        route:function(path, type, callback) {
            ehs_instance.global.routes.push({path:path, type:type, callback:callback});
        },
        before:function(callback) {
            ehs_instance.global.before.push(callback);
        },
        static:function(dir) {
            ehs_instance.global.static.push(dir)
        },

        events:ehs_instance.global.emitter,
        store:ehs_instance.global.store,

        createSite:function(hosts) {
            var site = {
                hosts:hosts,

                before: [],

                static: [],
                routes: [],

                emitter:new events.EventEmitter(),

                store:{}
            }

            ehs_instance.sites.push(site);

            return {
                route:function(path, type, callback) {
                    site.routes.push({path:path, type:type, callback:callback});
                },
                before:function(callback) {
                    site.before.push(callback);
                },
                static:function(dir) {
                    site.static.push(dir);
                },

                events:site.emitter,
                store:site.store
            }
        }
    }
}