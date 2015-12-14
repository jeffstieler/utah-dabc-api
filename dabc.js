var	request = require('request'),
	cheerio = require('cheerio'),
	_ = require('underscore'),
	async = require('async');

var	URL_BASE               = 'http://www.webapps.abc.utah.gov/Production',
	BEER_LIST_URL          = '/OnlinePriceList/DisplayPriceList.aspx?DivCd=T',
	SPECIAL_ORDER_LIST_URL = '/OnlinePriceList/DisplayPriceList.aspx?ClassCd=YST',
	INVENTORY_URL          = '/OnlineInventoryQuery/IQ/InventoryQuery.aspx';

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

module.exports = {
	getAllBeers: getAllBeers
};