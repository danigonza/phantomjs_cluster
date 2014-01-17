var utils = require('../lib/utils');
var join = require('path').join;
var fs = require('fs');
var path = require('path');
var request = require('request');

module.exports = function(app, serverConfig) {
  var rasterizerService = app.settings.rasterizerService;
  var climService = app.settings.climService;

  // routes
  app.get('/', function(req, res, next) {
    // Check parameters
    if (!req.param('address', false) || !req.param('output', false) || !req.param('type', false)) {
      return res.status(400).send('Missisng required parameters');  
    }

    // Get parameters
    var url = utils.url(req.param('address'));
    var filePath = req.param('output');
    var renderType = req.param('type');

    // Get the phantomServer with less work
    var callbackUrl = req.param('callback', false) ? utils.url(req.param('callback')) : false;

    // Checking if file exist in disc 
    if (!serverConfig.loadTest && fs.existsSync(filePath)) {
      console.log('Request for %s - Found in cache', url);
      processImageUsingCache(filePath, res, callbackUrl, function(err){ 
        finishingProcessingImage(err, res, next); 
      });
      return;
    }

    var params = { 'url': url, 'filePath': filePath, 'renderType': renderType };
    createHeaders(req, params, rasterizerService.getPort(), serverConfig, function(options){
      console.log('Request for %s - Rasterizing it', url);
      processImageUsingRasterizer(options, filePath, res, callbackUrl, function(err){ 
        finishingProcessingImage(err, res, next); 
      });
    });

  });

  app.get('*', function(req, res, next) {
    res.status(404).send('Only supported index route');  
  });

  var createHeaders = function(req, params, port, serverConfig, callback){
    // Required options
    var options = {
      uri: 'http://localhost:' + port + '/',
      headers: { url: params.url, path: params.filePath, renderType: params.renderType }
    };
    ['width', 'height', 'clipRect', 'javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password', 'delay'].forEach(function(name) {
      if (req.param(name, false)){ options.headers[name] = req.param(name); }
    });

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

  // bits of logic
  var processImageUsingCache = function(filePath, res, url, callback) {
    if (url) {
      // Asynchronous
      res.send('Will post screenshot to ' + url + ' when processed');
      postImageToUrl(filePath, url, callback);
    } else {
      // Synchronous
      if (serverConfig.sendImage){
        sendImageInResponse(filePath, res, callback); 
      } else {
        callback(); 
      }
    }
  }

  var processImageUsingRasterizer = function(rasterizerOptions, filePath, res, url, callback) {
    if (url) {
      // asynchronous
      res.send('Will post screenshot to ' + url + ' when processed');
      callRasterizer(rasterizerOptions, function(error) {
        if (error){ return callback(error); }
        postImageToUrl(filePath, url, callback);
      });
    } else {
      // synchronous
      callRasterizer(rasterizerOptions, function(error) {
        if (error){ return callback(error); }
        if (serverConfig.sendImage){ 
          sendImageInResponse(filePath, res, callback);
        } else { 
          callback(); 
        }
      });
    }
  }

  var callRasterizer = function(rasterizerOptions, callback) {
    request.get(rasterizerOptions, function(error, response, body) {
      if (error || response.statusCode != 200) {
        console.error('Error while requesting the rasterizer: {%s}', response.body.trim());
        return callback(new Error(response.body.trim()));
      }
      callback(null);
    });  
  }

  var postImageToUrl = function(imagePath, url, callback) {
    console.log('Streaming image to %s', url);
    var fileStream = fs.createReadStream(imagePath);
    fileStream.on('error', function(err){
      console.error('Error while reading file: %s', err.message);
      callback(err);
    });
    fileStream.pipe(request.post(url, function(err) {
      if (err){ console.error('Error while streaming screenshot: %s', err); }
      callback(err);
    }));
  }

  var sendImageInResponse = function(imagePath, res, callback) {
    console.log('Sending image in response');
    if (serverConfig.useCors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Type");
    }
    res.sendfile(imagePath, function(err) {
      callback(err);
    });
  }

  var finishingProcessingImage = function(err, res, next){
    console.log('Finished processing image');
    if (err) {
      res.send(500, { error: err.toString() });
      next(err);
    } else {
      res.send(200, { message: "OK" });
    } 
  }
};
