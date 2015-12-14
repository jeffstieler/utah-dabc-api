var	request = require('request'),
	cheerio = require('cheerio'),
	_ = require('underscore'),
	async = require('async');

var	URL_BASE               = 'http://www.webapps.abc.utah.gov/Production',
	BEER_LIST_URL          = '/OnlinePriceList/DisplayPriceList.aspx?DivCd=T',
	SPECIAL_ORDER_LIST_URL = '/OnlinePriceList/DisplayPriceList.aspx?ClassCd=YST',
	INVENTORY_URL          = '/OnlineInventoryQuery/IQ/InventoryQuery.aspx',
	STORE_MAP_URL          = 'http://abc.utah.gov/common/script/abcMap.js';

var colMap = [
	'description',
	'div',
	'dept',
	'cat',
	'size',
	'cs_code',
	'price',
	'status'
];

function parseBeerTable( html ) {

	var inventory = [],
		$ = cheerio.load( html );

	$( '#ctl00_ContentPlaceHolderBody_gvPricelist > tr' ).each( function( idx, row ) {

		var $cols = $( row ).find( 'td' );

		if ( $cols.length ) {

			var beer = {};

			$cols.each( function( idx, td ) {

				if ( idx in colMap ) {

					beer[ colMap[ idx ] ] = $( td ).text();

				}

			} );

			inventory.push( beer );

		}

	} );

	return inventory;

}

function getAllBeers( callback ) {

	async.concat(
		[
			URL_BASE + BEER_LIST_URL,
			URL_BASE + SPECIAL_ORDER_LIST_URL
		],
		function( url, asyncCallback ) {

			request( url, function( err, res, html ) {

				if ( err ) return asyncCallback( err );

				var inventory = parseBeerTable( html );

				asyncCallback( null, inventory );

			} );

		},
		callback
	);

}

function getBeerInventory( csCode, callback ) {

	request( URL_BASE + INVENTORY_URL, function( err, res, html ) {

		if ( err ) {

			return callback( err );

		}

		var	$ = cheerio.load( html ),
			VIEWSTATE = $( '#__VIEWSTATE' ).val(),
			EVENTVALIDATION = $( '#__EVENTVALIDATION' ).val();

		request.post(
			URL_BASE + INVENTORY_URL,
			{
				'headers' : {
					'User-Agent' : 'Mozilla'
				},
				'form'    : {
					'__VIEWSTATE'                            : VIEWSTATE,
					'__EVENTVALIDATION'                      : EVENTVALIDATION,
					'__ASYNCPOST'                            : true,
					'ctl00$ContentPlaceHolderBody$tbCscCode' : csCode
				}
			},
			function( err, res, html ) {

				if ( err ) {

					return callback( err );

				}

				var $ = cheerio.load( html );

				var inventory = {
					'sku'                : $( '#ContentPlaceHolderBody_lblSku' ).text(),
					'status'             : $( '#ContentPlaceHolderBody_lblStatus' ).text(),
					'price'              : $( '#ContentPlaceHolderBody_lblPrice' ).text(),
					'description'        : $( '#ContentPlaceHolderBody_lblDesc' ).text(),
					'warehouseOnOrder'   : parseInt( $( '#ContentPlaceHolderBody_lblWhsOnOrder' ).text() ),
					'warehouseInventory' : parseInt( $( '#ContentPlaceHolderBody_lblWhsInv' ).text() ),
					'stores'             : []
				};

				var colMap = [ 'store', 'name', 'qty', 'address', 'city', 'phone' ];

				$( '#ContentPlaceHolderBody_gvInventoryDetails tr.gridViewRow' ).each( function( idx, row ) {

					var store = {};

					$( row ).find( 'td' ).each( function( idx, td ) {

						store[ colMap[ idx ] ] = $( td ).text();

					} );

					store.qty = parseInt( store.qty );

					inventory.stores.push( store );

				} );

				callback( null, inventory );

			}

		);

	} );

}

function getAllStores( callback ) {

	request( STORE_MAP_URL, function( err, res, mapJs ) {

		if ( err ) {

			return callback( err );

		}

		var storePattern = /^locations\.push\(({.+})\);/mg;

		var matches = mapJs.match( storePattern );

		var stores = matches.map( function( storeMatch ) {

			var storeJSON = storeMatch.substring( 15, ( storeMatch.length - 2 ) );

			storeJSON = storeJSON.replace( / ([a-zA-Z][\w\d]*):/g, ' "$1":' );

			storeJSON = storeJSON.replace( /'/g, '"' );

			return JSON.parse( storeJSON );

		} );

		callback( null, stores );

	} );

}

module.exports = {
	getAllBeers: getAllBeers,
	getBeerInventory: getBeerInventory,
	getAllStores: getAllStores
};