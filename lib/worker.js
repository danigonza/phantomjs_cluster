var utils = require('../lib/utils');
var join = require('path').join;
var fs = require('fs');
var path = require('path');
var request = require('request');

var rasterizerService;
var climService;

var processing = function(app, serverConfig, params, callback) {
  rasterizerService = app.settings.rasterizerService;
  climService = app.settings.climService;

  // Check parameters
  if (!params.address || !params.output || !params.output){
    callback(new Error('Missisng required parameters'));
    return;
  }

  // Get parameters
  var url = utils.url(params.address);
  var filePath = params.output;
  var renderType = params.type;

  // Get the phantomServer with less work
  var callbackUrl = params.callback ? utils.url(params.callback) : false;

  // Checking if file exist in disc 
  if (!serverConfig.loadTest && fs.existsSync(filePath)) {
    climService.console.log('Request for %s - Found in cache', url);
    processImageUsingCache(filePath, callbackUrl, function(){ 
      finishingProcessingImage(null, filePath, callback); 
    });
    return;
  }

  var paramsJSON = { 'url': url, 'filePath': filePath, 'renderType': renderType };
  createHeaders(paramsJSON, rasterizerService.getPort(), serverConfig, function(options){
    climService.console.log('Request for %s - Rasterizing it', url);
    processImageUsingRasterizer(options, filePath, callbackUrl, function(err){ 
      finishingProcessingImage(err, filePath, callback); 
    });
  });

}

// bits of logic
var processImageUsingCache = function(filePath, callbackUrl, callback) {
  if (callbackUrl) {
    // Asynchronous
    climService.console.info("Will post screenshot to %s when processed", callbackUrl);
    postImageToUrl(filePath, callbackUrl, callback);
  } else {
    // Synchronous
    callback(); 
  }
}

var postImageToUrl = function(imagePath, callbackUrl, callback) {
  climService.console.log("Streaming image to %s", callbackUrl);
  var fileStream = fs.createReadStream(imagePath);
  fileStream.on('error', function(err){
    climService.console.error('Error while reading file: %s', err.message);
    callback(err);
  });
  fileStream.pipe(request.post(callbackUrl, function(err) {
    if (err){ climService.console.error('Error while streaming screenshot: %s', err); }
    callback(err);
  }));
}

var finishingProcessingImage = function(err, imagePath, callback){
  climService.console.log('Finished processing image!');
  if (err) {
    callback(err);
  } else {
    callback(imagePath)
  } 
}

var createHeaders = function(params, port, serverConfig, callback){
  // Required options
  var options = {
    uri: 'http://localhost:' + port + '/',
    headers: { url: params.url, path: params.filePath, renderType: params.renderType }
  };

  // Set the filename and added to the request header
  var filename;
  if (!serverConfig.loadTest) {
    filename = params.filePath.split("/").pop();
  } else {
  // If we are in load test we create files with diferent names
    filename = Math.random().toString(36).substring(7) + '.png';
    filePath = "/tmp/test_load/" + filename;
    options.headers.path = filePath
  }
  options.headers.filename = filename;
  
  callback(options);
}

var processImageUsingRasterizer = function(rasterizerOptions, filePath, url, callback) {
  if (url) {
    // asynchronous
    climService.console.info('Will post screenshot to ' + url + ' when processed');
    callRasterizer(rasterizerOptions, function(error) {
      if (error){ return callback(error); }
      postImageToUrl(filePath, url, callback);
    });
  } else {
    // synchronous
    callRasterizer(rasterizerOptions, function(error) {
      if (error){ return callback(error); }
      callback(); 
    });
  }
}

var callRasterizer = function(rasterizerOptions, callback) {
  request.get(rasterizerOptions, function(error, response, body) {
    if (error || response.statusCode != 200) {
      climService.console.error('Error while requesting the rasterizer: { %s }', response.body.trim());
      return callback(new Error(response.body.trim()));
    }
    callback(null);
  });  
}

module.exports.processing = processing;
