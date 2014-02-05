/**
 * Module dependencies.
 */
var clim 		= require("clim"),
	winston 	= require("winston");
	os			= require("os");

require('winston-papertrail').Papertrail;

var ClimService = function(port) {
	this.localIp = getLocalIp();
	this.clim = clim;
	this.console = clim("\u001B[33m[" + this.localIp + ':' + port + "]\u001b[39m");
	this.personalization();
	this.logger = new winston.Logger({
    transports: [
      new winston.transports.Papertrail({
        host: 'logs.papertrailapp.com',
        port: 11172,
        logFormat: function(level, message) {
          return '[' + level + '] ' + message;
        },
        colorize: true
      })
    ]
  });
}

ClimService.prototype.personalization = function() {
	var self = this;

	this.clim.getTime = function(){
		return new Date().toDateString();
	}

	// Clim personalization
	this.clim.logWrite = function(level, prefixes, msg) {
		// Default implementation writing to stderr
	  	var line = level;
	  	if (prefixes.length > 0) { line += " " + prefixes.join(" "); }
	  	line += " " + msg;
		process.stderr.write(clim.getTime() + " " + line + "\n");
		switch (level) {
			case 'ERROR':
				self.logger.error(line);
			  break;
			case 'WARN':
				self.logger.warn(line);
			  break;
			default:
				self.logger.info(line);
			  break;
		}
	};
}

ClimService.prototype.addPrefix = function(prefix) {
	this.console = clim("\u001B[35m" + prefix + "\u001b[39m", this.console);
}

var getLocalIp = function(){
	var ifaces = os.networkInterfaces();
	var ip = new Array();
	for (var dev in ifaces) {
		if(dev.indexOf("en") != -1){
  			ifaces[dev].forEach(function(details){
    			if (details.family=='IPv4') {
    				ip.push(details.address);
    			}
  			});
		}
	}
	return ip[0];
}

module.exports = ClimService;
