/**
 * Module dependencies.
 */
var clim = require("clim");

var ClimService = function() {
	this.clim = clim;
	this.console = clim();
	
	// Change date format
	this.clim.getTime = function(){
	  return new Date().toDateString();
	}

	// Clim personalization
	this.clim.logWrite = function(level, prefixes, msg) {
	  // Default implementation writing to stderr
	  var line = clim.getTime() + " " + level;
	  if (prefixes.length > 0) { line += " " + prefixes.join(" "); }
	  line += " " + msg;
	  process.stderr.write(line + "\n");	
	};
}

module.exports = ClimService;
