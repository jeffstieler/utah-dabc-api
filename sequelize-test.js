var request = require('request'),
	async = require('async'),
	db = require('./models'),
	Beer = db.models.Beer,
	Store = db.models.Store,
	StoreInventory = db.models.StoreInventory;

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