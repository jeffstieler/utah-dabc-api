'use strict';

const config = require( 'config' );
const DABC = require( './dabc' );
const WooCommerceAPI = require( 'woocommerce-api' );
const UntappdClient = require( 'node-untappd' );
const querystring = require( 'querystring' );
const PromisePool = require('promise-pool-executor');
const _ = require( 'lodash' );

const WooCommerce = new WooCommerceAPI( {
    url: config.get( 'woocommerce.url' ),
    consumerKey: config.get( 'woocommerce.key' ),
    consumerSecret: config.get( 'woocommerce.secret' ),
    wpAPI: true,
    version: 'wc/v2',
} );

const Untappd = new UntappdClient();
Untappd.setClientId( config.get( 'untappd.id' ) );
Untappd.setClientSecret( config.get( 'untappd.secret' ) );

const searchUntappd = ( beerName ) => new Promise( ( resolve, reject ) => {
    Untappd.beerSearch(
        ( err, response ) => {
            if ( err ) {
                reject( err );
            } else {
                // TODO: 'invalid_limit' == response.meta.error_type
                resolve( _.get( response, 'response.beers.items', [] ) );
            }
        },
        {
            q: beerName,
            sort: 'count',
        } );
} );

const createProduct = ( product ) => new Promise( ( resolve, reject ) => {
    WooCommerce.post(
        'products',
        product,
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                resolve( JSON.parse( body ) );
            }
        }
    );
} );

const findOrCreateTag = ( tagName ) => new Promise( ( resolve, reject ) => {
    WooCommerce.post(
        'products/tags',
        {
            name: tagName,
        },
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                const result = JSON.parse( body );

                // If the tag exists, return the existing id
                if ( 'term_exists' == result.code && result.data.resource_id ) {
                    resolve( { id: result.data.resource_id } );
                }

                resolve( result );
            }
        }
    );
} );

const findOrCreateCategory = ( categoryName, categoryImage ) => new Promise( ( resolve, reject ) => {
    WooCommerce.post(
        'products/categories',
        {
            name: categoryName,
            image: {
                src: categoryImage,
            },
        },
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                const result = JSON.parse( body );

                // If the category exists, return the existing id
                if ( 'term_exists' == result.code && result.data.resource_id ) {
                    resolve( { id: result.data.resource_id } );
                }

                resolve( result );
            }
        }
    );
} );

const addNewBeer = ( beerToCreate ) => {
    const beerProductData = {
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
    };

    console.log( `Searching Untappd for '${beerToCreate.description}'.` );

    return searchUntappd( beerToCreate.description )
        .then( searchResults => {
            let tasks = [];

            // if beers found:
            // - add product category for brewery
            // - add IBU, ABV as attributes
            // - add product tag for style
            // - add untapped ID as meta
            if ( searchResults.length ) {
                console.log( `Found '${searchResults[0].beer.beer_name}' on Untappd.` );
                console.log( `Creating brewery category: '${searchResults[0].brewery.brewery_name}'` );
                console.log( `Creating beer style tag: '${searchResults[0].beer.beer_style}'` );

                tasks.push( findOrCreateCategory(
                    searchResults[0].brewery.brewery_name,
                    searchResults[0].brewery.brewery_label,
                ) );
                tasks.push( findOrCreateTag( searchResults[0].beer.beer_style ) );

                beerProductData.name = searchResults[0].beer.beer_name;
                beerProductData.slug = searchResults[0].beer.beer_slug;
                beerProductData.description = searchResults[0].beer.beer_description;
                beerProductData.short_description = beerToCreate.description;
                
                beerProductData.attributes.push(
                    {
                        name: 'ABV',
                        slug: 'pa_abv',
                        options: [ searchResults[0].beer.beer_abv.toString() ],
                    },
                    {
                        name: 'IBU',
                        slug: 'pa_ibu',
                        options: [ searchResults[0].beer.beer_ibu.toString() ],
                    }
                );

                beerProductData.images = [
                    {
                        src: searchResults[0].beer.beer_label,
                        position: 0,
                    },
                ];

                beerProductData.meta_data = [
                    {
                        key: 'untappd_id',
                        value: searchResults[0].beer.bid,
                    },
                ];
            }

            return Promise.all( tasks ).then( taskResults => {

                if ( 2 == taskResults.length ) {
                    beerProductData.categories = [
                        {
                            id: tasks[0].id,
                        },
                    ];

                    beerProductData.tags = [
                        {
                            id: tasks[1].id,
                        },
                    ];
                }

                console.log( `Creating product for: '${beerProductData.name}'` );
                return createProduct( beerProductData );
            } );
        } );
};

const getBeerBySKU = ( sku ) => new Promise( ( resolve, reject ) => {
    WooCommerce.get(
        'products?' + querystring.stringify( { sku } ),
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                resolve( JSON.parse( body ) );
            }
        }
    );
} );

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
                        return addNewBeer( beer );
                    } else {
                        console.log( results[0].name + ' already exists.' );
                        return results[0];
                    }
                } );
        }
    } ).promise().then( ( results ) => {
        console.log( results.length + ' beers processed.' );
    } );
} );
