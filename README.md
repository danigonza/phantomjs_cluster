# Express PhantomJS

This project was started as a screenshot web service powered by [Express](http://expressjs.com) and [PhantomJS](http://www.phantomjs.org/). Basend on the project [screenshot-as-service](https://github.com/fzaninotto/screenshot-as-a-service) but with multiple phantomjs servers and a redis bd to save the work charge of the phantomjs servers. 

Now, this project is quite different. It's a cluster, of nodejs servers with a phantomjs executing as a moongose server (see the documentation of [phantomjs](http://www.phantomjs.org/)). This project use [Bull](https://github.com/OptimalBits/bull) as a internal job queue and [node-sidekiq](https://github.com/loopj/node-sidekiq) as a result queue.

The node servers had the responsability to keep alive the phantomjs servers.

## Setup

First [install](http://code.google.com/p/phantomjs/wiki/Installation) phantomjs, then clone this repo and install the deps:

```
$ npm install
```

Run the app:

```
$ node app
Express server listening on port 3000
```

## Usage

For a quick test insert a job in a bull queue as the exemple above:

```
var queue 	= require('bull')("jobs_phantomjs", 6379, '127.0.0.1');
var number 	= 100;
var lastJob = 0;

// Lets create a few jobs for the queue workers
for (var i = 0; i < number; i++){
	var data = {
		address: "http://www.google.com",
		output: "/tmp/test.png",
		type: 0
	};
  queue.add(data).then(function(job) {
  	console.log("Add job %s", job.jobId)
  	lastJob ++;
	}, function(err){
  	console.log("Error adding the job %s", job.jobId)
  	lastJob ++;
	});
}

setInterval(function(){
	console.log("Added %s jobs", lastJob)
	if (lastJob == number) { process.exit(1); }
},100);
```

## Configuration

Create a `config/development.yaml` or a `config/production.yaml` to override any of the settings found in the `config/default.yaml`:

```yml
rasterizer:
  command: phantomjs   # phantomjs executable
  port: 3100           # internal service port. No need to allow inbound or outbound access to this port
  viewport: '612x612' # browser window size. Height frows according to the content
#  num: 5
  debug: false
server:
  port: 3200           # main service port
  loadTest: false
redis:
  port: 6379
  host: 127.0.0.1
```

For instance, if you want to setup a proxy for phantomjs, create a `config/development.yaml` as follows:

```yml
rasterizer:
  command: 'phantomjs --proxy=myproxy:1234'
```
