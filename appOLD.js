/**
 * Module dependencies.
 */
var config = require('config');
var express = require('express');
var ClimService = require("./lib/climService");
var RasterizerService = require('./lib/rasterizerService');

var clim = new ClimService();

// Application exceptions
process.on('uncaughtException', function (err) {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

process.on('SIGTERM', function () {
  process.exit(0);
});

process.on('SIGINT', function () {
  process.exit(0);
});

// web service
var app = express();

app.configure(function(){
	app.use(app.router);
	app.set('climService', clim);
	app.set('rasterizerService', new RasterizerService(config.rasterizer, config.rasterizer.port, clim).startService());
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

require('./routes')(app, config.server);
app.listen(config.server.port);
clim.console.log('Express server listening on port ' + config.server.port);
