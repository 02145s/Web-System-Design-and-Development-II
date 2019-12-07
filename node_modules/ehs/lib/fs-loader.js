module.exports = function(settings) {
    const fs = require('fs');
    const path = require('path');
    const hound = require('hound');

    const instance = require('./instance.js')({
        debugText: settings.debugText || true,

        port: settings.port,
        host: settings.host
    });

    settings.dir = path.resolve(settings.dir);

    function scan() {
        fs.readdirSync(settings.dir).forEach(function(object) {
            if (object == 'global') {
                if (fs.existsSync(path.join(settings.dir + '/' + object + '/routes.js'))) {
                    require(path.join(settings.dir + '/' + object + '/routes.js'))(instance.store).forEach(function(route) {
                        console.log(`[ehs][cli-server] Registered ${route.type}:${route.path} from ${object}/routes.js`);
                        instance.route(route.path, route.type, route.callback);
                    });
                }
    
                if (fs.existsSync(path.join(settings.dir + '/' + object + '/modules'))) {
                    fs.readdirSync(path.join(settings.dir + '/' + object + '/modules')).forEach(function(_object) {
                        if (_object.endsWith('.module.js')) {
                            console.log(`[ehs][cli-server] Loaded module from ${object}/modules/${_object}`);
                            require(settings.dir + '/' + object + '/modules/' + _object)(instance);
                        }
                    });
                }

                if (fs.existsSync(path.join(settings.dir + '/' + object + '/static'))) {
                    instance.static(settings.dir + '/' + object + '/static');
                }
    
                return false;
            }
    
            if (!fs.existsSync(path.join(settings.dir + '/' + object + '/site.json'))) {
                console.log(`[ehs][cli-server] ${object} does not have a valid site.json`);
    
                return false;
            }

            console.log(`[ehs][cli-server] Site was found in ${object}`);
    
            var siteConfig = require(path.join(settings.dir + '/' + object + '/site.json'));
            var site = instance.createSite(siteConfig.hosts);

            if (fs.existsSync(path.join(settings.dir + '/' + object + '/static'))) {
                site.static(settings.dir + '/' + object + '/static');
            }
    
            if (fs.existsSync(path.join(settings.dir + '/' + object + '/routes.js'))) {
                require(path.join(settings.dir + '/' + object + '/routes.js'))(site.store, instance.store).forEach(function(route) {
                    console.log(`[ehs][cli-server] Registered ${route.type}:${route.path} from ${object}/routes.js`);
                    site.route(route.path, route.type, route.callback);
                });
            }
    
            if (fs.existsSync(path.join(settings.dir + '/' + object + '/modules'))) {
                fs.readdirSync(path.join(settings.dir + '/' + object + '/modules')).forEach(function(_object) {
                    if (_object.endsWith('.module.js')) {
                        console.log(`[ehs][cli-server] Loaded module from ${object}/modules/${_object}`);
                        require(settings.dir + '/' + object + '/modules/' + _object)(site, instance);
                    }
                });
            }
        });
    }

    scan();

    if (settings.fsScan || false) {
        console.log(`[ehs][fs-scan] fs-scan is enabled, this mode is not stable and may lead to errors/bugs!`)
        var fsScan = hound.watch(settings.dir);

        fsScan.on('create', function(file, stats) {
            console.log(`[ehs][fs-scan] File change detected on ${file}, reloading routes...`);
            
            instance.reset();
            scan();
        });

        fsScan.on('change', function(file, stats) {
            console.log(`[ehs][fs-scan] File change detected on ${file}, reloading routes...`);
            
            instance.reset();
            scan();
        });

        fsScan.on('delete', function(file) {
            console.log(`[ehs][fs-scan] File change detected on ${file}, reloading routes...`);
            
            instance.reset();
            scan();
        });
    }
}