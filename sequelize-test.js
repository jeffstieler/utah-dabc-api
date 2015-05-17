var Sequelize = require('sequelize'),
	request = require('request'),
	async = require('async');

Sequelize.Promise.onPossiblyUnhandledRejection(function(e) {
    console.log(e);
    throw e;
    process.exit(1);
});

var sequelize = new Sequelize(
	'sequelize_test',
	'_root',
	'spam32',
	{
		'host': '192.168.33.10',
		'dialect': 'mysql'
	}
);

var Beer = sequelize.define('beer', {
	'description': {
		'type': Sequelize.STRING
	},
	'div': {
		'type': Sequelize.STRING
	},
	'dept': {
		'type': Sequelize.STRING
	},
	'cat': {
		'type': Sequelize.STRING
	},
	'size': {
		'type': Sequelize.STRING
	},
	'csCode': {
		'type': Sequelize.STRING,
		'field': 'cs_code'
	},
	'price': {
		'type': Sequelize.STRING
	},
	'status': {
		'type': Sequelize.STRING
	}
});

var Store = sequelize.define('store', {
	'number': {
		'type': Sequelize.STRING
	},
	'city': {
		'type': Sequelize.STRING
	},
	'googleZoom': {
		'type': Sequelize.STRING,
		'field': 'google_zoom'
	},
	'address1': {
		'type': Sequelize.STRING,
		'field': 'address_1'
	},
	'address2': {
		'type': Sequelize.STRING,
		'field': 'address_2'
	},
	'phoneNumber': {
		'type': Sequelize.STRING,
		'field': 'phone_number'
	},
	'latitude': {
		'type': Sequelize.STRING
	},
	'longitude': {
		'type': Sequelize.STRING
	}
});

var StoreInventory = sequelize.define('StoreInventory', {
	'quantity': Sequelize.INTEGER
});

Beer.belongsToMany(Store, {'through': 'StoreInventory'});

Store.belongsToMany(Beer, {'through': 'StoreInventory'});

Beer.sync().then(function(){
	console.log('beer model synced');
	Store.sync().then(function(){
		console.log('store model synced');
		StoreInventory.sync().then(function(){
			console.log('storeinventory synced');
			startApp();
		})
	});
});

function loadBeers() {

	var beers = require('./beers.json');

	beers = beers.map(function(beer) {

		beer['csCode'] = beer['cs_code'];

		delete( beer['cs_code'] );

		return beer;

	});

	Beer.bulkCreate(beers).then(function(beers){
		console.log('created ' + beers.length + ' beers in bulk');
		setInventory();
	});

}

function setInventory() {

	Beer.all().then(function(beers) {

		async.eachLimit(
			beers,
			5,
			function(beer, next) {

				var beerData = beer.get({
					'plain': true
				});

				request({
					'url': 'http://jeffstieler.com/utah-dabc-api/beers/' + beerData.csCode,
					'json': true
				}, function(err, res, data) {

					if (err) return next(err);

					async.each(data.stores, function(storeInfo, cb) {

						Store.findOrCreate({
							'where': {
								'number': storeInfo.store
							},
							'defaults': {
								'number': storeInfo.store,
								'address1': storeInfo.address,
								'city': storeInfo.city,
								'phoneNumber': storeInfo.phone
							}
						}).spread(function(store, created) {
							beer.addStore(store, {'quantity': storeInfo.qty});
							cb();
						});

					}, next);

				});

			},
			function(err) {

				console.log('done w/beer inventory:', err);

			}
		);

	});

}

function startApp() {

	console.log('app start here');

	// loadBeers();

	// setInventory();

	Store.find({
	'where': {
		'number': '0038'
	}
	}).then(function(store){

		console.log(store.get({plain:true}));

		store.getBeers({'order': [['description', 'ASC']]}).then(function(storeBeers) {

			console.log(storeBeers.map(function(beer){
				beer = beer.get({plain:true});

				return beer.description + ' - ' + beer.StoreInventory.quantity;
			}));

		});

	});

}