var	models = require('./server/server.js').models,
	DABC = require('./dabc.js'),
	async = require('async');

var	allStores = {},
	allItems = [];

function syncStores( syncCallback ) {

	DABC.getAllStores( function( err, stores ) {

		if ( err ) {
			return syncCallback( err );
		}

		async.each(
			stores,
			function findOrCreateStore( store, findOrCreateCallback ) {

				if ( null === store.storeNumber ) {
					return findOrCreateCallback();
				}

				console.log( 'Syncing Store ' + store.storeNumber );

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
							// cache the store number
							allStores[ instance.number ] = true;

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
			syncCallback
		);

	} );

}

function syncItems( syncCallback ) {

	DABC.getAllBeers( function( err, items ) {

		if ( err ) {
			return syncCallback( err );
		}

		async.each(
			items,
			function findOrCreateItem( item, findOrCreateCallback ) {
				console.log( 'Syncing Item ' + item.cs_code + ': ' + item.description );

				var itemToCreate = {
					sku: item.cs_code,
					price: item.price,
					volume: item.size,
					description: item.description
				};

				models.Item.findOrCreate(
					{
						where: {
							sku: item.cs_code
						}
					},
					itemToCreate,
					function( err, instance, created ) {
						if ( err ) {
							return findOrCreateCallback( err );
						} else {
							// cache the item sku
							allItems.push( instance.sku );

							if ( created ) {
								console.log( 'Created Item ' + instance.sku + '.' );
							}
							else {
								console.log( 'Item ' + instance.sku + ' already exists.' );
							}
							return findOrCreateCallback();
						}
					}
				);
			},
			syncCallback
		);

	} );

}

function syncInventory( syncCallback ) {

	async.eachLimit(
		allItems,
		5,
		function syncItemInventory( itemSku, itemSyncCallback ) {

			DABC.getBeerInventory( itemSku, function( err, inventory ) {

				if ( err ) {
					return itemSyncCallback( err );
				}

				async.each(
					inventory.stores,
					function findOrCreateInventory( store, findOrCreateCallback ) {

						var storeNumber = store.store.replace(/^0+/, '');

						if ( ! allStores[ storeNumber ] ) {
							return itemSyncCallback( 'Could not find instance for Store ' + storeNumber );
						}

						var inventoryToCreate = {
							itemSku: itemSku,
							storeNumber: storeNumber,
							quantity: store.qty
						};

						models.Inventory.findOrCreate(
							{
								where: {
									and: [
										{
											itemSku: itemSku
										},
										{
											storeNumber: storeNumber
										}
									]
								}
							},
							inventoryToCreate,
							function( err, instance, created ) {
								if ( err ) {
									return findOrCreateCallback( err );
								} else {
									if ( created ) {
										console.log( 'Created Inventory for ' + instance.itemSku + ' at Store ' + instance.storeNumber + '.' );
										return findOrCreateCallback();
									}

									instance.updateAttributes(
										{
											quantity: inventoryToCreate.quantity
										},
										function updateInventoryQuantity( err, instance ) {
											if ( err ) {
												return findOrCreateCallback( err );
											}
											console.log( 'Updated Inventory for ' + instance.itemSku + ' at Store ' + instance.storeNumber + '.' );
											return findOrCreateCallback();
										}
									);

								}
							}
						);
					},
					itemSyncCallback
				);

			} );

		},
		syncCallback
	);

}

// Kick off sync of all stores, beers, and inventory
async.waterfall(
	[
		syncStores,
		syncItems,
		syncInventory
	],
	function finishedSync( err ) {
		if ( err ) {
			console.error( err );
		} else {
			console.log( 'Sync complete.' );
		}
		process.exit();
	}
);