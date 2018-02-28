const jsdom = require('jsdom');
const { window } = new jsdom.JSDOM(`...`);
const $ = require('jquery')(window);
//console.warn($.toString());

function getDataObjectDetails(productionId, dataObjectId) {
    let apiEndpoint = 'http://localhost:57768/api'; //'https://sourcecore.azurewebsites.net/api';
    let apiKey = '136c709d8aa34e74baeaadc22c2ab701';

    let authRequest = $.ajax({
        type: 'POST',
        url: `${apiEndpoint}/auth`,
        data: `{"apiKey": "${apiKey}"}`,
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
    });

    authRequest.done(function(data) {
        let dataObjectRequest = $.ajax({
            type: 'GET',
            // alternatively, you can set your access token in the header instead of the query string like this:
            headers: { 'X-SOURCE-ACCESS-TOKEN': data.accessToken },
            // url: `${apiEndpoint  }/productions?access_token=${  data.accessToken}`,
            url: `${apiEndpoint}/productions/${productionId}/data-objects/${dataObjectId}`,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
        });

        dataObjectRequest.done(function(data) {
            console.log('Data object = ', data);
        });
    });
}

getDataObjectDetails('5a2f16368d0414143ce196d7', '5a3041e7583dce14b89325af');
