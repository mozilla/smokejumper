#!/usr/local/bin/node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Module dependencies.
require('../../lib/extensions/number');

const 
express     = require('express'),
http        = require('http')
logger      = require('../../lib/logger'),
util        = require('util'),
application = require('./controllers/application'),
socket      = require('./socket'),
config      = require('../../lib/configuration'),
partials    = require('express-partials');

var app = express();

app.use(partials());

// Express Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  
  app.use(function (req, res, next) {
    res.removeHeader("X-Powered-By");
    next();
  });

  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// HTTP Routes
routes = {
  site: require('./controllers/site'),
  share: require('./controllers/share')
};

app.get('/', routes.site.index);

app.get('/share/:id', routes.share.file);

process.on('uncaughtException', function(err) {
  logger.error(err);
});

var port = config.get('bind_to').port;
var httpd = http.createServer(app);
httpd.listen(config.get('bind_to').port);

socket.listen(httpd);

logger.info("HTTP server listening on port " + port + ".");
