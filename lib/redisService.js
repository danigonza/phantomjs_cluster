/**
 * Module dependencies.
 */
var redis = require('redis');
var self;

/**
 * Redis service.
 *
 * The service starts a redis client and save and get information from there.
 *
 * The constructor expects a configuration object as parameter, with these properties:
 *   config: config object for redis
 *
 * @param {Object} Server configuration
 * @api public
 */
 var RedisService = function(config) {
 	this.config = config;
 	this.client;
 	self = this;
 }

RedisService.prototype.startService = function(callback) {
  this.client =  redis.createClient(this.config.port, this.config.host)
  this.client.on("ready", function(){
		console.log("Redis client conected")
		callback();
	});
	this.client.on("end", function(){
		console.log("Redis client connection closed")
	});
	this.client.on("error", function(err){
		console.log("Redis error: %s",err);
	});
  return this
}

RedisService.prototype.setServer = function(serverId, works) {
	this.client.hset("phantomWorkers", serverId, works, function(err, reply){
		console.log("PhantomJS server %s added in redis with " + works + " works", serverId);
	});
}

RedisService.prototype.getServer = function(serverId, callback) {
	this.client.hget("phantomWorkers", serverId, function(err, reply){
		console.log("Get PhanyomJS server works => " + reply.toString());
		callback({ "serverId": serverId, "works": reply });
	});
}

RedisService.prototype.getAllServers = function(callback) {
	this.client.hgetall("phantomWorkers", function (err, replies) {
		if (self.config.debug) console.log("Get All Servers:")
		var data = []
    Object.keys(replies).forEach(function (i) {
    	data.push({ "serverId": i, "works": replies[i] });
      if (self.config.debug) console.log("	PhantomJS server " + i + " with " + replies[i] + " works")
    });
    callback(data);
	});
}

RedisService.prototype.removeServer = function(serverId) {
	this.client.hdel("phantomWorkers", serverId, function(err, reply){
		console.log("PhantomJS server %s deleted in redis", serverId);	
	});
}

RedisService.prototype.addWork = function(serverId) {
	this.client.hincrby("phantomWorkers", serverId, 1, function(err, reply){
		console.log("Add a work to phantomJS server %s. Total works: " + reply.toString(), serverId);	
	});
}

RedisService.prototype.removeWork = function(serverId) {
	this.client.hincrby("phantomWorkers", serverId, -1, function(err, reply){
		console.log("Remove a work to phantomJS server %s. Total works: " + reply.toString(), serverId);	
	});
}

RedisService.prototype.getServerLessWork = function(callback) {
	this.getAllServers(function(servers){
		var server = null;
		servers.forEach(function(serverData){
			if (self.config.debug) console.log("PhantomJS server " + serverData.serverId + " with " + serverData.works + " works")
			if (server != null) { if(serverData.works < server.works) server = serverData; }
			else server = serverData;
		});
		console.log("Server with less work server " + server.serverId + " with " + server.works + " works");
		callback(server);
	});
}

module.exports = RedisService;