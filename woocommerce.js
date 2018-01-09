'use strict';

const config = require( 'config' );
const DABC = require( './dabc' );
const WooCommerceAPI = require( 'woocommerce-api' );
const querystring = require( 'querystring' );
const PromisePool = require('promise-pool-executor');

const WooCommerce = new WooCommerceAPI( {
    url: config.get( 'woocommerce.url' ),
    consumerKey: config.get( 'woocommerce.key' ),
    consumerSecret: config.get( 'woocommerce.secret' ),
    wpAPI: true,
    version: 'wc/v2',
} );

const createBeer = ( beerToCreate ) => {
    return WooCommerce
        .postAsync( 'products', {
            name: beerToCreate.description,
            type: 'simple',
            regular_price: beerToCreate.price.substring( 1 ),
            sku: beerToCreate.cs_code,
            attributes: [
                {
                    name: 'Size',
                    slug: 'pa_size',
                    options: [ beerToCreate.size ],
                }
            ],
        } );
};

const getBeerBySKU = ( sku ) => (
    new Promise( ( resolve, reject ) => {
        WooCommerce.get(
            'products?' + querystring.stringify( { sku } ),
            ( err, res, body ) => {
                if ( err ) {
                    reject( err );
                } else {
                    resolve( JSON.parse( body ) );
                }
            }
        )
    } )
);

DABC.getAllBeers( function( err, beers ) {
    console.log( `Found ${beers.length} beers, creating products.` );

    // Create a pool with a concurrency limit of 2
    const pool = new PromisePool.PromisePoolExecutor( {
        frequencyLimit: 10,
        frequencyWindow: 1200,
    } );

    pool.addEachTask( {
        data: beers,
        generator: ( beer ) => {
            return getBeerBySKU( beer.cs_code )
                .then( results => {
                    if ( 0 === results.length ) {
                        console.log( 'Creating: ' + beer.description );
                        return createBeer( beer );
                    } else {
                        console.log( beer.description + ' already exists.' );
                        return results[0];
                    }
                } );
        }
    } ).promise().then( ( results ) => {
        console.log( results.length + ' beers processed.' );
    } );
} );
