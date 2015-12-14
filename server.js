var request = require('request'),
	restify = require('restify'),
	cheerio = require('cheerio'),
	cache = require('restify-cache'),
	dotenv = require('dotenv'),
	semver = require('semver'),
	_ = require('underscore'),
	async = require('async'),
	DABC = require('./dabc.js');

dotenv.load({ 'silent': true });

var server = restify.createServer({
	'name': 'Utah DABC API',
	'version': '1.0.0',
	'versions': ['1.0.0']
});

// allow path based API versioning
// based on https://stackoverflow.com/a/29706259
server.pre(function (req, res, next) {
	var pieces = req.url.replace(/^\/+/, '').split('/'),
		pathVersion = pieces[0],
		semVersion = semver.valid(pathVersion);

	// only if you want to use this routes:
	// /api/v1/resource
	// /api/v1.0/resource
	// /api/v1.0.0/resource
	if (!semVersion) {
		semVersion = pathVersion.replace(/v(\d{1})\.(\d{1})\.(\d{1})/, '$1.$2.$3');
		semVersion = semVersion.replace(/v(\d{1})\.(\d{1})/, '$1.$2.0');
		semVersion = semVersion.replace(/v(\d{1})/, '$1.0.0');
	}

	if (semver.valid(semVersion) && server.versions.indexOf(semVersion) > -1) {
		req.url = req.url.replace(pathVersion + '/', '');
		req.headers['accept-version'] = semVersion;
	}

	return next();
});

server.use(restify.CORS());
server.use(restify.queryParser());
server.pre(restify.pre.sanitizePath());
server.use(cache.before);
server.on('after', cache.after);

function allBeers( req, apiResponse, next ) {

	DABC.getAllBeers( function( err, beers ) {

		if ( err ) return next( err );

		apiResponse.send( beers );

		next();

	} );

}

function beerInventory( req, apiResponse, next ) {

	apiResponse.cache( {
		'maxAge': 60 * 60 * 2
	} );

	var csCode = req.params.cs_code;

	DABC.getBeerInventory( csCode, function( err, inventory ) {

		if ( err ) return next( err );

		apiResponse.send( inventory );

		next();

	} );

}

function apiVersions(req, apiResponse, next) {

	var versions = {
		'current_version': '1',
		'versions': ['1']
	};

	apiResponse.send(versions);

	next();

}

function apiHelp(req, apiResponse, next) {

	var endpoints = [];

	endpoints.push({
		'description': 'Get a list of beers with basic information like name, price, and size.',
		'method': 'GET',
		'group': 'beers',
		'path_format': '/beers',
		'path_labeled': '/beers',
		'request': {
			'path': {},
			'query': {
				'fields': {
					'type': '(string)',
					'description': 'Optional. Returns specified fields only. Comma-separated list. Example: fields=cs_code,description,price'
				}
			},
			'body': []
		},
		'response': {
			'body': {}
		}
	});

	endpoints.push({
		'description': 'Get store availability of a beer as well as extra information about it.',
		'method': 'GET',
		'group': 'beer',
		'path_format': '/beers/%d',
		'path_labeled': '/beers/$id',
		'request': {
			'path': {
				'$id': {
					'type': '(int|string)',
					'description': 'DABC Beer ID'
				}
			},
			'query': {},
			'body': []
		},
		'response': {
			'body': {
				'sku': {
					'type': '(int|string)',
					'description': 'Unique beer ID, DABC\'s SKU number.'
				},
				'status': {
					'type': '(string)',
					'description': 'Beer availability descriptor. (e.g. General Distribution, Special Order, Trial)'
				},
				'price': {
					'type': '(string)',
					'description': 'Cost per single beer in USD.'
				},
				'description': {
					'type': '(string)',
					'description': 'Beer name and container size.'
				},
				'warehouseOnOrder': {
					'type': '(int)',
					'description': 'Quantity on order at the DABC warehouse.'
				},
				'warehouseInventory': {
					'type': '(int)',
					'description': 'Quantity in stock at the DABC warehouse.'
				},
				'stores': {
					'type': '(array)',
					'description': 'Stores the beer is in stock at, with quantities.'
				}
			}
		}
	});

	apiResponse.send(endpoints);

	next();

}

server.get({ 'path': '/help', 'version': '1.0.0' }, apiHelp);

server.get({ 'path': '/versions', 'version': '1.0.0' }, apiVersions);

server.get({ 'path': '/beers', 'version': '1.0.0' }, allBeers);

server.get({ 'path': '/beers/:cs_code', 'version': '1.0.0' }, beerInventory);

server.listen(process.env.PORT || 8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});