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

const untappdAccessTokens = config.get( 'untappd.tokens' );
let untappdAccessTokenIdx = 0;

const Untappd = new UntappdClient();

const rotateUntappdToken = () => {
    const nextIdx = untappdAccessTokenIdx++ % untappdAccessTokens.length;
    Untappd.setAccessToken( untappdAccessTokens[ nextIdx ] );
};

const searchUntappd = ( beerName ) => new Promise( ( resolve, reject ) => {
    rotateUntappdToken();
    Untappd.beerSearch(
        ( err, response ) => {
            if ( err ) {
                reject( err );
            } else {
                if ( 'invalid_limit' == _.get( response, 'meta.error_type' ) ) {
                    console.error( '***** Hit Untappd Rate Limit *****' );
                    process.exit( 0 );
                }

                resolve( _.get( response, 'response.beers.items', [] ) );
            }
        },
        {
            q: beerName,
            sort: 'count',
        } );
} );

const getUntappdBeer = ( untappdId ) => new Promise( ( resolve, reject ) => {
    rotateUntappdToken();
    Untappd.beerInfo(
        ( err, response ) => {
            if ( err ) {
                reject( err );
            } else {
                if ( 'invalid_limit' == _.get( response, 'meta.error_type' ) ) {
                    console.error( '***** Hit Untappd Rate Limit *****' );
                    process.exit( 0 );
                }

                resolve( _.get( response, 'response.beer', {} ) );
            }
        },
        {
            BID: untappdId,
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
                try {
                    const json = JSON.parse( body );

                    resolve( json );
                } catch ( syntaxError ) {
                    console.error( body );

                    reject( syntaxError );
                }
            }
        }
    );
} );

const updateProduct = ( product ) => new Promise( ( resolve, reject ) => {
    WooCommerce.put(
        'products/' + product.id,
        product,
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                try {
                    const json = JSON.parse( body );

                    resolve( json );
                } catch ( syntaxError ) {
                    console.error( body );

                    reject( syntaxError );
                }
            }
        }
    );
} );

const findOrCreateTag = ( tagName ) => new Promise( ( resolve, reject ) => {
    console.log( `Creating tag: '${tagName}'` );
    WooCommerce.post(
        'products/tags',
        {
            name: tagName,
        },
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                try {
                    const result = JSON.parse( body );

                    // If the tag exists, return the existing id
                    if ( 'term_exists' == result.code && result.data.resource_id ) {
                        resolve( { id: result.data.resource_id } );
                    }

                    resolve( result );
                } catch ( syntaxError ) {
                    console.error( body );

                    reject( syntaxError );
                }
            }
        }
    );
} );

const findOrCreateCategory = ( categoryName, categoryImage ) => new Promise( ( resolve, reject ) => {
    console.log( `Creating category: '${categoryName}'` );
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
                try {
                    const result = JSON.parse( body );

                    // If the category exists, return the existing id
                    if ( 'term_exists' == result.code && result.data.resource_id ) {
                        resolve( { id: result.data.resource_id } );
                    }

                    resolve( result );
                } catch ( syntaxError ) {
                    console.error( body );

                    reject( syntaxError );
                }
            }
        }
    );
} );

const mapUntappdBeerToProduct = ( beerProduct, untappdBeer ) => {
    let tasks = [];

    // Add product category for brewery
    tasks.push( findOrCreateCategory(
        untappdBeer.brewery.brewery_name,
        untappdBeer.brewery.brewery_label,
    ) );

    // Add product tag for style
    tasks.push( findOrCreateTag( _.get( untappdBeer, 'beer.beer_style', _.get( untappdBeer, 'beer_style' ) ) ) );

    beerProduct.short_description = beerProduct.name;
    beerProduct.name = _.get( untappdBeer, 'beer.beer_name', _.get( untappdBeer, 'beer_name' ) );
    beerProduct.slug = _.get( untappdBeer, 'beer.beer_slug', _.get( untappdBeer, 'beer_slug' ) );
    beerProduct.description = _.get( untappdBeer, 'beer.beer_description', _.get( untappdBeer, 'beer_description' ) );

    const abv = _.get( untappdBeer, 'beer.beer_abv', _.get( untappdBeer, 'beer_abv' ) );
    const ibu = _.get( untappdBeer, 'beer.beer_ibu', _.get( untappdBeer, 'beer_ibu' ) );

    // Add IBU, ABV as attributes
    beerProduct.attributes.push(
        {
            name: 'ABV',
            slug: 'pa_abv',
            options: [ abv.toString() ],
        },
        {
            name: 'IBU',
            slug: 'pa_ibu',
            options: [ ibu.toString() ],
        }
    );

    beerProduct.images = [
        {
            src: _.get( untappdBeer, 'beer.beer_label', _.get( untappdBeer, 'beer_label' ) ),
            position: 0,
        },
    ];

    // Add untapped ID as meta
    beerProduct.meta_data = [
        {
            key: 'untappd_id',
            value: _.get( untappdBeer, 'beer.bid', _.get( untappdBeer, 'bid' ) ),
        },
    ];

    return Promise.all( tasks ).then( taskResults => {
        beerProduct.categories = [
            {
                id: taskResults[0].id,
            },
        ];

        beerProduct.tags = [
            {
                id: taskResults[1].id,
            },
        ];

        return beerProduct;
    } );
};

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
            if ( searchResults.length ) {
                console.log( `Found '${searchResults[0].beer.beer_name}' on Untappd.` );
                console.log( `Creating product for: '${beerProductData.name}'` );

                return mapUntappdBeerToProduct( beerProductData, searchResults[0] )
                    .then( createProduct );
            }
        } );
};

const updateBeerFromUntappd = ( beerProduct ) => {
    console.log( 'Updating ' + beerProduct.name + ' with Untappd data.' );

    const untappdMeta = _.find( beerProduct.meta_data, { key: 'untappd_id' } );
    const untappdId = untappdMeta.value;

    return getUntappdBeer( untappdId )
        .then( untappdBeer => mapUntappdBeerToProduct( beerProduct, untappdBeer ) )
        .then( updateProduct );
};

const getBeerBySKU = ( sku ) => new Promise( ( resolve, reject ) => {
    WooCommerce.get(
        'products?' + querystring.stringify( { sku } ),
        ( err, res, body ) => {
            if ( err ) {
                reject( err );
            } else {
                try {
                    const json = JSON.parse( body );

                    resolve( json );
                } catch ( syntaxError ) {
                    console.error( body );

                    reject( syntaxError );
                }
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
                        const untappdId = _.find( results[0].meta_data, { key: 'untappd_id' } );

                        if ( untappdId && '' == results[0].short_description ) {
                            return updateBeerFromUntappd( results[0] );
                        }

                        console.log( results[0].name + ' already exists.' );
                        return results[0];
                    }
                } );
        }
    } ).promise().then( ( results ) => {
        console.log( results.length + ' beers processed.' );
    } );
} );
