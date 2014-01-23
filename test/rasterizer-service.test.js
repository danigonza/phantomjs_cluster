var expect = require('chai').expect;
var RasterizerService = require('../lib/rasterizerService');

// Create a new test suite for our Clim Service
suite("Rasterizer Service Tests", function() {

	// Define a pending test
  test("Should exist", function() {
    var rasterizerService = new RasterizerService();
    expect(rasterizerService).to.be.ok;
  });

  test("Function getPort()", function() {
  	var rasterizerService = new RasterizerService(null, 1000, null);
    expect(rasterizerService.getPort()).to.equal(1000);
  });

  test("Function rasterizerExitHandler()", function() {});

  test("Function rasterizerExitHandler doesn't start if is killed", function() {});

  test("Function rasterizerExitHandler doesn't start if is restarted", function() {});

  test("Function startService()", function() {});

  test("Function rasterizerExitHandler()", function() {});

  test("Function rasterizerExitHandler()", function() {});

  test("Function rasterizerExitHandler()", function() {});

  test("Function rasterizerExitHandler()", function() {});

});
