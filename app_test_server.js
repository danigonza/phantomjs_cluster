var queue 	= require('bull')("jobs_phantomjs", 6379, '127.0.0.1');
var number 	= 100;
var lastJob = 0;

// Lets create a few jobs for the queue workers
for (var i = 0; i < number; i++){
	var data = {
		address: "http://notegraphy.com/api/v1/notes/546563/instagram?auth_token=w9Syk1SGiyvAdVZvqWni",
		//address: "http://localhost:3000/api/v1/notes/445488/instagram?auth_token=KUpAyrkjyBacfMrv6pkL",
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
