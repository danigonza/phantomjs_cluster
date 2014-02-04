/**
 * Module dependencies.
 */
var clim 		= require("clim"),
		winston = require('winston');

require('winston-papertrail').Papertrail;

var ClimService = function(prefix) {
	this.clim = clim;
	this.console = clim(prefix);
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
		console.log(prefixes);
	  // Default implementation writing to stderr
	  var line = clim.getTime() + " " + level;
	  if (prefixes.length > 0) { line += " " + prefixes.join(" "); }
	  line += " " + msg;
		process.stderr.write(line + "\n");
		switch (level) {
			case 'ERROR':
				self.logger.error(msg);
			  break;
			case 'WARN':
				self.logger.warn(msg);
			  break;
			default:
				self.logger.info(msg);
			  break;
		}
	};
}

module.exports = ClimService;
