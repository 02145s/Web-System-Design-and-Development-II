module.exports = function(req, routes, callback) {
    if (routes.length > 0) {
        var a;
        for (a = 0; a < routes.length; a++) {
            var incomingRoute = req.path.split('/');
            var routeExplode = routes[a].path.split('/');

            var compute = {path:[], data:{}, supercatch:false};

            var b;
            for (b = 0; b < routeExplode.length; b++) {
                if (compute.supercatch || routeExplode[b].startsWith('*')) {
                    if (!compute.supercatch && req.path.startsWith(routeExplode.join('/').replace('*', ''))) {
                        compute.supercatch = true;
                    }

                    compute.path.push(incomingRoute[b]);
                } else if (routeExplode[b].startsWith(':')) {
                    compute.data[routeExplode[b].replace(':', '')] = incomingRoute[b];

                    compute.path.push(incomingRoute[b]);
                } else {
                    compute.path.push(routeExplode[b]);
                }
            }
            
            if (compute.path.join('/') == req.path || compute.supercatch) {
                req.params = compute.data;

                return !callback(routes[a]);
            }
        }    
    }


    return false;
}