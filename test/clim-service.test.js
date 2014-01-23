var expect = require('chai').expect;
var ClimService = require('../lib/climService');

// Create a new test suite for our Clim Service
suite("Clim Service Tests", function() {

	// Define a pending test
  test("Should exist", function() {
    var climService = new ClimService();
    expect(climService).to.be.ok;
  });

});
