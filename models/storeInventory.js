module.exports = function(sequelize, DataTypes) {
	
	var StoreInventory = sequelize.define('StoreInventory', {
		'quantity': DataTypes.INTEGER
	});

	return StoreInventory;

};