/**
 * Module dependencies.
 */
var ClimService = require("./lib/climService"),
		worker = require('./lib/worker.js')
 		cluster = require("cluster"),
		config = require('config'),
		Queue = require('bull');

var clim = new ClimService();
var workQueue = Queue("work phantomjs server", 6379, '127.0.0.1');
var resultQueue = Queue("result phantomjs server", 6379, '127.0.0.1');

workQueue.on('completed', function(job){
	clim.console.info("Task completed for job id: " + job.jobId);
  resultQueue.add({code: 200, msg: "Task completed for job id: " + job.jobId});
})
.on('failed', function(job, err){
	clim.console.error("Error for job id: " + job.jobId + " : " + err.toString());
  resultQueue.add({code: 500, msg: "Error for job id: " + job.jobId + " : " + err.toString()});
});

// Application exceptions
process.on('uncaughtException', function (err) {
  clim.console.error("[Exception]", err);
  clim.console.error(err.stack);
  process.exit(1);
});

// Listen for dying workers
cluster.on('exit', function (worker, code, signal) {
  // Replace the dead worker, we're not sentimental
  clim.console.log('Worker ' + worker.id + ' died :(');
  //cluster.fork();
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

	// web server
	var app = express();

	app.configure(function(){
		app.use(function(err, req, res, next) {
			resultQueue.add({code: 500, msg: "Error for job id: " + err.toString()});
		});
		app.set('climService', clim);
		app.set('rasterizerService', new RasterizerService(config.rasterizer, process.env['PHANTOMJS_PORT'], clim).startService());
	});

	app.configure('development', function() {
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	clim.console.log('Worker ' + cluster.worker.id + ' running!');

	workQueue.process(function(job, jobDone){
		worker.processing(app, config.server, job.data, function(err){
			if (err) { jobDone(err); }
			clim.console.log("Job done by worker", cluster.worker.id, "jobId",job.jobId);
	    jobDone();
		});
  });
}
