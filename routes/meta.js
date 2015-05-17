// GET: /versions
module.exports.apiVersions = function (req, apiResponse, next) {

	var versions = {
		'current_version': '1',
		'versions': ['1']
	};

	apiResponse.send(versions);

	next();

};

// GET: /help
module.exports.apiHelp = function(req, apiResponse, next) {

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

};