/**
 * Module dependencies.
 */
var spawn = require('child_process').spawn;
var request = require('request');
var clim = require("clim");
var console = clim();

/**
 * Rasterizer service.
 *
 * The service starts, kills or restarts rasterizer server
 *
 * The constructor expects a configuration object as parameter, with these properties:
 *   command: Command to start a phantomjs process
 *   port: Server listerner port
 *   path: Destination of temporary images
 *   viewport: Width and height represent the viewport size (format: '1024x800')
 *
 * @param {Object} Server configuration
 * @api public
 */
var RasterizerService = function(config, port, redisService) {
  this.isStopping = false;
  this.config = config;
  this.rasterizer;
  this.pingDelay = 1000; // every 10 seconds
  this.sleepTime = 3000; // three failed health checks, 30 seconds
  this.lastHealthCheckDate = null;
  this.port = port;
  var self = this;
  process.on('exit', function() {
    self.isStopping = true;
    self.killService();
  });
  this.redis = redisService;
}

RasterizerService.prototype.rasterizerExitHandler = function (code) {
  if (this.isStopping) return;
  console.log("Phantomjs server in port " + this.getPort() + " failed. Restarting");
  this.startService();
};

RasterizerService.prototype.startService = function() {
  var rasterizer = spawn(this.config.command, ['scripts/rasterizer.js', this.getPort(), this.config.viewport]);
  rasterizer.stderr.on('data', function (data) {
    console.error("Phantomjs server in port " + this.getPort() + " error: " + data);
  });
  rasterizer.stdout.on('data', function (data) {
    console.log("Phantomjs server in port " + this.getPort() + " output: " + data);
  });
  rasterizer.on('exit', this.rasterizerExitHandler);
  this.rasterizer = rasterizer;
  this.lastHealthCheckDate = Date.now();
  this.pingServiceIntervalId = setInterval(this.pingService.bind(this), this.pingDelay);
  this.checkHealthIntervalId = setInterval(this.checkHealth.bind(this), 1000);
  this.redis.setServer(this.getPort(), 0);
  console.log('Phantomjs internal server listening on port ' + this.getPort());
  return this;
}

RasterizerService.prototype.killService = function() {
  if (this.rasterizer) {
    // Remove the exit listener to prevent the rasterizer from restarting
    this.rasterizer.removeListener('exit', this.rasterizerExitHandler);
    this.rasterizer.kill();
    clearInterval(this.pingServiceIntervalId);
    clearInterval(this.checkHealthIntervalId);
    console.log("Stopping Phantomjs internal server in port " + this.getPort());
  }
}

RasterizerService.prototype.restartService = function() {
  if (this.rasterizer) {
    this.killService();
    this.startService();
  }
}

RasterizerService.prototype.pingService = function() {
  if (!this.rasterizer) {
    this.lastHealthCheckDate = 0;
  }
  var port = this.getPort();
  var self = this;
  if(this.config.debug) console.info("Ping for server %s", port);
  request('http://localhost:' + port + '/healthCheck', function(error, response) {
    if (error || response.statusCode != 200){
      if(self.config.debug) console.error("Error in Pong for server %s", port);
      return;
    }
    if(self.config.debug) console.info("Pong for server %s", port);
    self.lastHealthCheckDate = Date.now();
  });
}

RasterizerService.prototype.setLastHealthCheckDate = function(date, port) {
  if(this.config.debug) console.warn("Set lastHealthCheckDate %s for server " + port, date);
  this.lastHealthCheckDate = date;
}

RasterizerService.prototype.checkHealth = function() {
  if(this.config.debug){
    console.log("Checkhealth for server " + this.port);
    console.info("   Date.now: %s", Date.now());
    console.info("   LastHealthCheckDate: %s", this.lastHealthCheckDate);
    console.info("   SleepTime: %s", (Date.now() - this.lastHealthCheckDate));
  }
  if (Date.now() - this.lastHealthCheckDate > this.sleepTime) {
    console.log("Phantomjs server in port " + this.port + " is sleeping. Restarting.");
    this.restartService();
  }
}

RasterizerService.prototype.getPort = function() {
  return this.port;
}

module.exports = RasterizerService;