/**
 * Module dependencies.
 */
var spawn = require('child_process').spawn;
var request = require('request');

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
 * @api public
 */
var RasterizerService = function(config, port, clim) {
  this.isStopping = false;
  this.config = config;
  this.rasterizer;
  this.pingDelay = 10000; // every 10 seconds
  this.sleepTime = 30000; // three failed health checks, 30 seconds
  this.lastHealthCheckDate = null;
  this.port = port;
  var self = this;
  process.on('exit', function() {
    self.isStopping = true;
    self.killService();
  });
  this.clim = clim;
}

RasterizerService.prototype.rasterizerExitHandler = function (code) {
  if (this.isStopping){
    return;
  }
  this.clim.console.log("Phantomjs server in port " + this.port + " failed. Restarting");
  this.startService();
};

RasterizerService.prototype.startService = function() {
  var rasterizer = spawn(this.config.command, ['scripts/rasterizer.js', this.port, this.config.viewport]);

  rasterizer.stderr.on('data', function (data) {
    this.clim.console.error("Phantomjs server in port " + this.port + " error: " + data.toString().trim());
  });
  rasterizer.stdout.on('data', function (data) {
    this.clim.console.log("Phantomjs server in port " + this.port + " output: " + data.toString().trim());
  });
  rasterizer.on('exit', this.rasterizerExitHandler);
  this.rasterizer = rasterizer;
  this.lastHealthCheckDate = Date.now();
  this.pingServiceIntervalId = setInterval(this.pingService.bind(this), this.pingDelay);
  this.checkHealthIntervalId = setInterval(this.checkHealth.bind(this), 1000);
  this.clim.console.log('Phantomjs internal server listening on port ' + this.port);
  return this;
}

RasterizerService.prototype.killService = function() {
  if (this.rasterizer) {
    // Remove the exit listener to prevent the rasterizer from restarting
    this.rasterizer.removeListener('exit', this.rasterizerExitHandler);
    this.rasterizer.kill();
    clearInterval(this.pingServiceIntervalId);
    clearInterval(this.checkHealthIntervalId);
    this.clim.console.log("Stopping Phantomjs internal server in port " + this.port);
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
  if (this.config.debug) {
    this.clim.console.info("Ping for server %s", this.port);
  } 
  var self = this;
  request('http://localhost:' + this.port + '/healthCheck', function(error, response) {
    if (error || response.statusCode != 200){
      if (self.config.debug){
        this.clim.console.error("Error in Pong for server %s", port);
      }
      return;
    }
    if (self.config.debug){
      this.clim.console.info("Pong for server %s", port);
    }
    self.lastHealthCheckDate = Date.now();
  });
}

RasterizerService.prototype.checkHealth = function() {
  if (this.config.debug){
    this.clim.console.log("Checkhealth for server " + this.port);
    this.clim.console.info("   Date.now: %s", Date.now());
    this.clim.console.info("   LastHealthCheckDate: %s", this.lastHealthCheckDate);
    this.clim.console.info("   SleepTime: %s", (Date.now() - this.lastHealthCheckDate));
  }
  if (Date.now() - this.lastHealthCheckDate > this.sleepTime) {
    this.clim.console.log("Phantomjs server in port " + this.port + " is sleeping. Restarting.");
    this.restartService();
  }
}

RasterizerService.prototype.getPort = function() {
  return this.port;
}

module.exports = RasterizerService;
