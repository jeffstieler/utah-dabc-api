module.exports = function(sequelize, DataTypes) {
	
	var Beer = sequelize.define('beer', {
		'description': {
			'type': DataTypes.STRING
		},
		'div': {
			'type': DataTypes.STRING
		},
		'dept': {
			'type': DataTypes.STRING
		},
		'cat': {
			'type': DataTypes.STRING
		},
		'size': {
			'type': DataTypes.STRING
		},
		'csCode': {
			'type': DataTypes.STRING,
			'field': 'cs_code'
		},
		'price': {
			'type': DataTypes.STRING
		},
		'status': {
			'type': DataTypes.STRING
		}
	});

	return Beer;

};