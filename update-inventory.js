var	models = require('./server/server.js').models,
	DABC = require('./dabc.js'),
	async = require('async');

function syncStores( syncStoresCallback ) {

	DABC.getAllStores( function( err, stores ) {

		if ( err ) {
			return syncStoresCallback( err );
		}

		async.each(
			stores,
			function findOrCreateStore( store, findOrCreateCallback ) {

				if ( null === store.storeNumber ) {
					return findOrCreateCallback();
				}

				console.log( 'Syncing Store ' + store.storeNumber, typeof store.storeNumber );

				var storeToCreate = {
					number: store.storeNumber,
					name: store.label,
					address: store.address01,
					city: store.whatCity,
					phone: store.phone
				};

				models.Store.findOrCreate(
					{
						where: {
							number: store.storeNumber
						}
					},
					storeToCreate,
					function( err, instance, created ) {
						if ( err ) {
							return findOrCreateCallback( err );
						} else {
							if ( created ) {
								console.log( 'Created Store ' + instance.number + '.' );
							}
							else {
								console.log( 'Store ' + instance.number + ' already exists.' );
							}
							return findOrCreateCallback();
						}
					}
				);

			},
			syncStoresCallback
		);

	} );

}

// Kick off sync of all stores, beers, and inventory
async.waterfall(
	[
		syncStores
	],
	function finishedSync( err ) {
		if ( err ) {
			console.error( err );
		} else {
			console.log( 'Sync complete.' );
		}
	}
);