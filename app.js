/**
 * Module dependencies.
 */
var ClimService = require("./lib/climService"),
		worker 			= require('./lib/worker.js')
 		cluster	 		= require("cluster"),
		config 			= require('config'),
		Queue 			= require('bull'),
		redis 		= require("redis"),
		Sidekiq 		= require("sidekiq");

// Initilize console
var clim = new ClimService();

// Jobs queue
var workQueue 	= Queue("jobs_phantomjs", config.redis.port, config.redis.host);
var resultQueue = Queue("errors_phantomjs", config.redis.port, config.redis.host);

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
  	new_worker_env["PHANTOMJS_PORT"] = config.rasterizer.port + i;
    cluster.fork(new_worker_env);
  }
} else {
	// Include other modules
	var express = require('express');
	var RasterizerService = require('./lib/rasterizerService');

	// Redis
	var redis_client = redis.createClient(config.redis.port, config.redis.host); 
	redis_client.select(12);

	// Sidekiq
	var sidekiq = new Sidekiq(redis_client, 'bgjobs');

	// Costumizing job queue events
	workQueue.on('completed', function(job){
		//clim.console.log("Job #%s completed!", job.jobId);
	})
	.on('failed', function(job, err){
		clim.console.error("Job #%s failed! => " + err.toString(), job.jobId);
		resultQueue.add({jobId: job.jobId, msg: err.toString()});
	})
	.on('progress', function(job, progress){
		clim.console.info('\r  job #' + job.jobId + ' ' + progress + '% complete');
	})
	.on('paused', function(){
		clim.console.warn("Work queue paused");
	})
	.on('resumed', function(job){
		clim.console.warn("Work queue resumed");
	});

	// App instance
	var app = express();

	app.configure(function(){;
		app.set('climService', clim);
		app.set('rasterizerService', new RasterizerService(config.rasterizer, process.env['PHANTOMJS_PORT'], clim).startService(function(port){
			clim.console.log("Worker %s and PhantomJS server http://localhost:" + port + " running!", cluster.worker.id);
		}));
	});

	app.configure('development', function() {
  	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	workQueue.process(function(job, jobDone){
		worker.processing(app, config.server, job.data, function(err){
			var state;
			var filePath;
			if (err instanceof Error) { 
				jobDone(err);
				state = job.data.error_state	 
				filePath = null;
			} else {
				state = job.data.success_state
				filePath = err;
			}
			try {
				clim.console.info("Class Name: %s", job.data.class_name);
				clim.console.info("State: %s", state);
				clim.console.info("Note Id: %s", job.data.note_id);
				//clim.console.info("Share: %s", share);
				
				sidekiq.enqueue(job.data.class_name, [state, job.data.note_id, job.data.share, filePath],{
					retry: 5,
					queue: 'default'
				});
			}
			catch (err){
				clim.console.error(err.toString())
			}
			clim.console.log("Job done by worker", cluster.worker.id, "jobId",job.jobId);
	    jobDone();
		});
  });
}
