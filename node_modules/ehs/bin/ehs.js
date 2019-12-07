#!/usr/bin/env node
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

if (yargs.argv['create-project'] && yargs.argv['create-project'] != '') {
    var createPath = path.resolve(yargs.argv['create-project']);

    fs.mkdirSync(createPath);

    fs.mkdirSync(createPath + '/global');
    fs.writeFileSync(createPath + '/global/routes.js', 'module.exports = function() {\n\treturn [];\n};');
    fs.mkdirSync(createPath + '/global/modules');
    fs.mkdirSync(createPath + '/default');
    fs.writeFileSync(createPath + '/default/routes.js',  'module.exports = function() {\n\treturn [];\n};');
    fs.writeFileSync(createPath + '/default/site.json', JSON.stringify({hosts:[]}, null, 4));
    fs.mkdirSync(createPath + '/default/modules');

    process.exit();
}

require('../index.js').fsLoader({
    dir:yargs.argv.dir || process.env['ehs_dir'] || process.cwd(),
    
    fsScan: yargs.argv.fsScan || false,

    port:yargs.argv.port || process.env.PORT,
    host:yargs.argv.host || process.env.HOST
});