# node-ehs
An easy all in one HTTP server without all the bloat. ehs ships as a nodejs module and can also start from the command line.

## Install
To install locally for your project, run `npm install ehs`. 

If you wish to run ehs via the command line, run `sudo npm install ehs -g`.

## Running (Module)
```JavaScript
const ehs = require('ehs');

const server = ehs.server({
    debugText: true, //do you want to see debug text in the console

    port: 3000, //what port to listen
    host: '0.0.0.0' //what address to listen
});

server.route('/', 'GET', function(req, res) {
    res.end('Hello world!')
});

const virtualSite = server.createSite(['example.com']); //create a virtual host

//this section will only fire when accessed from http://example.com/
virtualSite.route('/', 'GET', function(req, res) { 
    res.end('Hello but from virtual site!');
});
```

You can also run ehs based on a site layout. A site layout is a set of folders that instructs ehs on how to load sites. See below for more information regarding site layouts.

```JavaScript
require('ehs').fsLoader({
    dir: '~/sites', //where is the site layout located
    
    fsScan: false, //listen for changes and attempt to reload the sites
    
    port: settings.port, //what port to listen
    host: settings.host //what address to listen
});
```


## Running (Command Line)
* To create a basic site layout, you can refrence `example/` or run `ehs --create-site ~/ehs_example`.
* To start the server, you must point it to the directory containing the site layout. `ehs --dir ~/ehs_example`

## Modules
ehs supports a basic set of module functionality. the goal behind modules is to allow routes and sites to share functions in between each other.

## FAQ
* Why create ehs when express and connect exist?
    * ehs was created as a custom solution for wanting to serve a series of web apps accessible from different domains.
* Why not use middleware?
    * Middleware can be confusing to setup and the goal for ehs is to be as easy as possible.
* Will support for middleware be added?
    * No, the goal for ehs is to include as much out of the box support as possible.

## Open Source
ehs is realsed under the Apache-2.0 license. Open source contributions are welcome as long as they meet with the overal goal.

If you come across a critical security issue, please contact me directly to fix the issue. Publishing the issue on GitHub could allow for hackers to attack sites running outdated versions of ehs.