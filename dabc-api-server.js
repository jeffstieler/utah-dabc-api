var request = require('request'),
	restify = require('restify'),
	cheerio = require('cheerio'),
	cache = require('restify-cache');

var server = restify.createServer();

server.use(cache.before);
server.on('after', cache.after);

var URL_BASE      = 'http://www.webapps.abc.utah.gov/Production',
	BEER_LIST_URL = '/OnlinePriceList/DisplayPriceList.aspx?DivCd=T',
	INVENTORY_URL = '/OnlineInventoryQuery/IQ/InventoryQuery.aspx';


server.get('/inventory/:cs_code', function(req, apiResponse, next) {

	var csCode = req.params.cs_code;

	request(URL_BASE + INVENTORY_URL, function(err, res, html) {

		if ( err ) {
		
			return next(err);
		
		}

		var $ = cheerio.load(html);

		var VIEWSTATE = $('#__VIEWSTATE').val(),
			EVENTVALIDATION = $('#__EVENTVALIDATION').val();

		request.post(
			URL_BASE + INVENTORY_URL,
			{
				'headers': {
					'User-Agent': 'Mozilla'
				},
				'form': {
					'__VIEWSTATE': VIEWSTATE,
					'__EVENTVALIDATION': EVENTVALIDATION,
					'__ASYNCPOST': true,
					'ctl00$ContentPlaceHolderBody$tbCscCode': csCode
				}
			},
			function(err, res, html) {

				if ( err ) {

					return next(err);

				}

				var $ = cheerio.load(html);

				var inventory = {
					'sku': $('#ContentPlaceHolderBody_lblSku').text(),
					'status': $('#ContentPlaceHolderBody_lblStatus').text(),
					'price': $('#ContentPlaceHolderBody_lblPrice').text(),
					'description': $('#ContentPlaceHolderBody_lblDesc').text(),
					'warehouse': {
						'onOrder': parseInt( $('#ContentPlaceHolderBody_lblWhsOnOrder').text() ),
						'inventory': parseInt( $('#ContentPlaceHolderBody_lblWhsInv').text() )
					},
					'stores': []
				};

				var colMap = ['store', 'name', 'qty', 'address', 'city', 'phone'];

				$('#ContentPlaceHolderBody_gvInventoryDetails tr.gridViewRow').each(function(idx, row) {

					var store = {};

					$(row).find('td').each(function(idx, td) {

						store[colMap[idx]] = $(td).text();

					});

					store.qty = parseInt(store.qty);

					inventory.stores.push(store);

				});

				apiResponse.send(inventory);

				next();

			}
		);

	});

});

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});