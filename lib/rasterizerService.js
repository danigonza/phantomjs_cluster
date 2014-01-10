/**
 * Module dependencies.
 */
var spawn = require('child_process').spawn;
var request = require('request');
var clim = require("clim");
var console = clim();
var self;

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
var RasterizerService = function(config, port) {
  this.isStopping = false;
  this.config = config;
  this.rasterizer;
  this.pingDelay = 10000; // every 10 seconds
  this.sleepTime = 30000; // three failed health checks, 30 seconds
  this.lastHealthCheckDate = null;
  this.port = port;
  self = this;
  process.on('exit', function() {
    self.isStopping = true;
    self.killService();
  });
}

RasterizerService.prototype.rasterizerExitHandler = function (code) {
  if (this.isStopping) return;
  console.log("Phantomjs server in port " + this.port + " failed. Restarting");
  self.startService();
};

RasterizerService.prototype.startService = function(redisService) {
  var rasterizer = spawn(this.config.command, ['scripts/rasterizer.js', this.port, this.config.viewport]);
  rasterizer.stderr.on('data', function (data) {
    console.log("Phantomjs server in port " + this.port + " error: " + data);
  });
  rasterizer.stdout.on('data', function (data) {
    console.log("Phantomjs server in port " + this.port + " output: " + data);
  });
  rasterizer.on('exit', this.rasterizerExitHandler);
  this.rasterizer = rasterizer;
  this.lastHealthCheckDate = Date.now();
  this.pingServiceIntervalId = setInterval(this.pingService.bind(this), this.pingDelay);
  this.checkHealthIntervalId = setInterval(this.checkHealth.bind(this), 1000);
  redisService.setServer(this.port, 0);
  console.log('Phantomjs internal server listening on port ' + this.port);
  return this;
}

RasterizerService.prototype.killService = function() {
  if (this.rasterizer) {
    // Remove the exit listener to prevent the rasterizer from restarting
    this.rasterizer.removeListener('exit', this.rasterizerExitHandler);
    this.rasterizer.kill();
    clearInterval(this.pingServiceIntervalId);
    clearInterval(this.checkHealthIntervalId);
    console.log("Stopping Phantomjs internal server in port " + this.port);
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
  var self = this;
  request('http://localhost:' + this.getPort() + '/healthCheck', function(error, response) {
    if (error || response.statusCode != 200) return;
    self.lastHealthCheckDate = Date.now();
  });
}

RasterizerService.prototype.checkHealth = function() {
  if (Date.now() - this.lastHealthCheckDate > this.sleepTime) {
    console.log("Phantomjs server in port " + this.port + " is sleeping. Restarting.");
    this.restartService();
  }
}

RasterizerService.prototype.getPort = function() {
  return this.port;
}

module.exports = RasterizerService;