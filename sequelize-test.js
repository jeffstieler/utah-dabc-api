var Sequelize = require('sequelize');

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

function startApp() {

	console.log('app start here');

	var beers = require('./beers.json');

	for ( var idx in beers ) {

		var beerData = beers[idx];

		beerData['csCode'] = beerData['cs_code'];

		delete( beerData['cs_code'] );

		Beer.create(beerData).then(function(beer){
			console.log('created beer: ', beer.description);
		});

	}


}