/**
 * Module dependencies.
 */
var ClimService = require("./lib/climService");
var cluster = require("cluster")
var config = require('config');

var clim = new ClimService();

// Application exceptions
process.on('uncaughtException', function (err) {
  clim.console.error("[Exception]", err);
  clim.console.error(err.stack);
  process.exit(1);
});

// Listen for dying workers
cluster.on('exit', function (worker, code, signal) {
  // Replace the dead worker, we're not sentimental
  clim.console("Finishing worker %s". worker + " with code " + code + " and signal " + signal);
  clim.console.log('Worker ' + worker.id + ' died :(');
  cluster.fork();
});

if (cluster.isMaster) {
  // Count the machine's CPUs
  var cpuCount = require('os').cpus().length;

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
  	var new_worker_env = {};
  	new_worker_env["PHANTOMJS_PORT"] =  config.rasterizer.port + i;
    cluster.fork(new_worker_env);
  }
} else {
	// Include other modules
	var express = require('express');
	var RasterizerService = require('./lib/rasterizerService');

	// web service
	var app = express();

	app.configure(function(){
		app.use(app.router);
		app.set('climService', clim);
		app.set('rasterizerService', new RasterizerService(config.rasterizer, process.env['PHANTOMJS_PORT'], clim).startService());
	});

	app.configure('development', function() {
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	require('./routes')(app, config.server);
	app.listen(config.server.port);
	clim.console.log('Worker ' + cluster.worker.id + ' running!');
}
