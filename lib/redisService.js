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
 *   server: Server address
 *   port: Server listerner port
 *
 * @param {Object} Server configuration
 * @api public
 */
 var RedisService = function(config) {
 	self = this;
 	this.config = config;
 	this.ready = false;
 }

RedisService.prototype.startService = function() {
  this.client =  redis.createClient(this.config.port, this.config.host)
   	this.client.on("ready", function(){
		console.log("Redis client conected")
		self.ready = true;
	});
	this.client.on("end", function(){
		console.log("Redis client connection closed")
		self.ready = false
	});
  this.client.set("phantomServers", JSON.stringify({}), function (err, reply) {
			if (err) throw(err)
			console.log("Redis phantomServer object initialized => " + reply.toString());
	});
  return this
}

RedisService.prototype.setServer = function(serverId, works) {
	if(this.ready){
		this.client.get("phantomServers", function (err, reply) {
			if (err) throw(err)
			console.log("ServerId %s", serverId);
			console.log("Works %s", works);
			console.log(reply);
			var data = JSON.parse(reply)
			data[serverId] = { "works": works};
			console.dir(data);
			self.client.set("phantomServers", JSON.stringify(data), function (err, reply) {
				if (err) throw(err)
      	console.log("PhantomJS server added in redis => " + reply.toString());
    	});
    });
	}
	else console.log("Server not ready");
}

RedisService.prototype.getServer = function(serverId) {
	if(this.ready){
		this.client.get("phantomServers", function (err, reply) {
			if (err) throw(err)
			console.log("Get PhanyomJS server info => " + reply.toString());
			data = JSON.parse(data)
			return { "serverId": serverId, "works": data[serverId]["works"] };
    });
	}
	else console.log("Server not ready");
}

RedisService.prototype.getAllServers = function(serverId) {
	if(this.ready){
		this.client.get("phantomServers", function (err, reply) {
			if (err) throw(err)
			console.log("Get all PhanyomJS server info => " + reply.toString());
			return JSON.parse(data)
    });
	}
	else console.log("Server not ready");
}

RedisService.prototype.removeServer = function(serverId) {
	if(this.ready){
		this.client.get("phantomServers", function (err, reply) {
			if (err) throw(err)
			var data = JSON.parse(reply)
			delete data[serverId];
			self.client.set("phantomServers", JSON.stringify(data), function (err, reply) {
				if (err) throw(err)
      	console.log("PhantomJS server deleted in redis => " + reply.toString());
    	});
    });
	}
	else console.log("Server not ready");
}

RedisService.prototype.getWorks = function(serverId) {
	if(this.ready){
		var data = this.client.get("phantomServers", function (err, reply) {
			if (err) throw(err)
			var data = JSON.parse(reply)
			console.log("Get PhanyomJS server info => " + JSON.stringify(data[serverId]));
			return data[serverId]["works"]
    });
	}
	else console.log("Server not ready");
}

module.exports = RedisService;