module.exports = function(sequelize, DataTypes) {
	
	var Store = sequelize.define('store', {
		'number': {
			'type': DataTypes.STRING
		},
		'city': {
			'type': DataTypes.STRING
		},
		'googleZoom': {
			'type': DataTypes.STRING,
			'field': 'google_zoom'
		},
		'address1': {
			'type': DataTypes.STRING,
			'field': 'address_1'
		},
		'address2': {
			'type': DataTypes.STRING,
			'field': 'address_2'
		},
		'phoneNumber': {
			'type': DataTypes.STRING,
			'field': 'phone_number'
		},
		'latitude': {
			'type': DataTypes.STRING
		},
		'longitude': {
			'type': DataTypes.STRING
		}
	});

	return Store;

};