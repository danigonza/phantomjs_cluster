/*
 * phantomjs rasteriser server
 *
 * Usage:
 *   phantomjs rasterizer.js [basePath] [port] [defaultViewportSize]
 *
 * This starts an HTTP server waiting for screenshot requests
 */
var port  = phantom.args[0] || 3001;

var defaultViewportSize = phantom.args[1] || '';
defaultViewportSize = defaultViewportSize.split('x');
defaultViewportSize = {
  width: ~~defaultViewportSize[0] || 612,
  height: ~~defaultViewportSize[1] || 612
};

var pageSettings = ['javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password'];

var server, service;

server = require('webserver').create();

/*
 * Screenshot service
 *
 * Generate a screenshot file on the server under the basePath
 *
 * Usage:
 * GET /
 * url: http://www.google.com
 *
 * Optional headers:
 * filename: google.png
 * width: 1024
 * height: 600
 * clipRect: { "top": 14, "left": 3, "width": 400, "height": 300 }
 *
 * If path is omitted, the service creates it based on the url, removing the
 * protocol and replacing all slashes with dots, e.g
 * http://www.google.com => www.google.com.png
 *
 * width and height represent the viewport size. If the content exceeds these
 * boundaries and has a non-elastic style, the screenshot may have greater size.
 * Use clipRect to ensure the final size of the screenshot in pixels.
 *
 * All settings of the WebPage object can also be set using headers, e.g.:
 * javascriptEnabled: false
 * userAgent: Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+
 */ 
service = server.listen(port, function(request, response) {
  if (request.url == '/healthCheck') {
    response.statusCode = 200;
    response.write('up');
    response.close();
    return;
  }

  // Check required parameters
  if (request.headers.url == undefined) {
    response.statusCode = 400;
    response.write('Request must contain an url header' + "\n");
    response.close();
    return;
  }
  if (request.headers.path == undefined) {
    response.statusCode = 400;
    response.write('Request must contain an path header' + "\n");
    response.close();
    return;
  }
  if (request.headers.renderType == undefined) {
    response.statusCode = 400;
    response.write('Request must contain an renderType header' + "\n");
    response.close();
    return;
  }

  var url = request.headers.url;
  var path = request.headers.path;
  var renderType = request.headers.renderType;
  var page = new WebPage();
  var delay = request.headers.delay || 0;

  try {
    page.viewportSize = {
      width: request.headers.width || defaultViewportSize.width,
      height: request.headers.height || defaultViewportSize.height
    };
    if (renderType == 1){
      page.clipRect = { top: 0, left: 0, width: 612, height: 612 }; 
    }
    for (name in pageSettings) {
      if (value = request.headers[pageSettings[name]]) {
        value = (value == 'false') ? false : ((value == 'true') ? true : value);
        page.settings[pageSettings[name]] = value;
      }
    }
  } catch (err) {
    response.statusCode = 500;
    response.write('Error while parsing headers: ' + err.message);
    return response.close();
  }

  page.onResourceError = function(resourceError) {
    page.close();
    response.statusCode = 404;
    response.write("Unable to load resource \n");
    return response.close();  
  };

  page.open(url, function(status) {
    if (status == 'success') {
      var retries = 0;
      var pageLoad = function(){
        retries++;
        if (retries <= 100) {        
          var loading = page.evaluate(function(){
            var ele = document.getElementsByTagName("html")[0];
            var cls = "loading";
            return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
          });
          if (typeof loading == 'object') {
            setTimeout(function(){
              pageLoad();
            }, 10);
          } else {
            console.log('Success: Screenshot saved to ' + path + "\n");
            page.render(path);
            response.write('Success: Screenshot saved to ' + path + "\n");
            page.release();
            //new
            response.statusCode = 200;
            response.write('OK');
            //
            response.close();
            // new
            return;
          }
        } else {
          console.log("Too much retries \n");
          page.release();
          response.statusCode = 500;
          response.write("Too much retries \n");
          response.close();  
          return;
        }
      }
      pageLoad();
    } else {
      console.log('Url returned status ' + status + "\n");
      page.release();
      response.statusCode = 404;
      response.write('Url returned status ' + status + "\n");
      response.close();
      return;
    }
  });

  // must start the response now, or phantom closes the connection
  //response.statusCode = 200;
  //response.write('');
});
