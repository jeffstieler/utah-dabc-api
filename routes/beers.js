var db = require('../models');

// GET: /beers
module.exports.all = function(req, res, next) {
	
	db.models.Beer.findAll().then(function(beers) {

		res.send(beers);

		next();

	});

};

// GET: /beers/<CS CODE>
module.exports.one = function(req, res, next) {

	var csCode = req.params.csCode;
	
	db.models.Beer.find({ 'where': { 'csCode': csCode } }).then(function(beer) {

		res.send(beer);

		next();

	});

};

