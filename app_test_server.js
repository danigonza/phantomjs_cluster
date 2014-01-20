var queue = require('bull')("work phantomjs server", 6379, '127.0.0.1');

// Lets create a few jobs for the queue workers
for (var i = 0; i <= 5; i++){
  queue.add({foo: 'bar'});
  console.log("Add job %s", i)
};

//process.exit(1);
