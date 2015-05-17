var Sequelize = require('sequelize'),
	path = require('path');

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

var Beer = sequelize.import(path.join(__dirname, 'beer.js'));

var Store = sequelize.import(path.join(__dirname, 'store.js'));

var StoreInventory = sequelize.import(path.join(__dirname, 'storeInventory.js'));

Beer.belongsToMany(Store, {'through': 'StoreInventory'});

Store.belongsToMany(Beer, {'through': 'StoreInventory'});

module.exports = {
	'sequelize': sequelize,
	'models': {
		'Beer': Beer,
		'Store': Store,
		'StoreInventory': StoreInventory
	}
};