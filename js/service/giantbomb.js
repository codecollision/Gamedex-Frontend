// GiantBomb
(function(GiantBomb, gamedex, $, _, moment) {
    "use strict";

    // module references
    var Amazon = gamedex.module('amazon'),

        // REST URLS
        GIANTBOMB_SEARCH_URL = gamedex.api + 'giantbomb/search/',
        GIANTBOMB_DETAIL_URL = gamedex.api + 'giantbomb/detail/',
        GIANTBOMB_VIDEO_URL = gamedex.api + 'giantbomb/video/',

        // data
        giantBombDataCache = {},
        giantBombItemCache = {},
        giantBombVideoCache = {},

        // request queue
        getGiantBombItemDataQueue = {},
        getGiantBombItemDetailQueue = {};

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * searchGiantBomb -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.searchGiantBomb = function(keywords, onSuccess, onError) {

        var searchTerms = encodeURIComponent(keywords);

        // list of fields to get as query parameter
        var fieldList = ['id', 'name', 'original_release_date', 'image', 'platforms', 'site_detail_url', 'expected_release_day', 'expected_release_month', 'expected_release_quarter', 'expected_release_year'];

        var requestData = {
            'field_list': fieldList.join(','),
            'keywords': keywords,
            'page': 0
        };

        var searchRequest = $.ajax({
            url: GIANTBOMB_SEARCH_URL,
            type: 'GET',
            data: requestData,
            dataType: 'json',
            cache: true,
            success: onSuccess,
            error: onError
        });

        return searchRequest;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * parseGiantBombResultItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.parseGiantBombResultItem = function(resultItem) {
        var itemData = {
            id: resultItem.id,
            asin: 0,
            gbombID: resultItem.id,
            name: resultItem.name,
            platform: 'n/a',
            platforms: resultItem.platforms
        };

        // format date
        if (resultItem.original_release_date && resultItem.original_release_date !== '') {
            itemData.releaseDate = resultItem.original_release_date.split(' ')[0];

        // expected release date
        } else if (resultItem.expected_release_day && resultItem.expected_release_month && resultItem.expected_release_year) {

            // add leading 0 if day or month is single digit
            if (resultItem.expected_release_day.toString().length === 1) {
                resultItem.expected_release_day = '0' + resultItem.expected_release_day.toString();
            }
            if (resultItem.expected_release_month.toString().length === 1) {
                resultItem.expected_release_month = '0' + resultItem.expected_release_month.toString();
            }

            itemData.releaseDate = resultItem.expected_release_year + '-' + resultItem.expected_release_month + '-' + resultItem.expected_release_day;

        // release quarter
        } else if (resultItem.expected_release_quarter) {

            // detect Q1
            if ('Q1' == 'Q1') {
                itemData.releaseDate = 'year-03-31';
                itemData.calendarDate = 'Q1 YEAR';
            }
            // detect Q2
            else if ('Q1' == 'Q2') {
                itemData.releaseDate = 'year-06-31';
                itemData.calendarDate = 'Q2 YEAR';
            }
            // detect Q3
            else if ('Q1' == 'Q3') {
                itemData.releaseDate = 'year-09-31';
                itemData.calendarDate = 'Q3 YEAR';
            }
            // detect Q4
            else if ('Q1' == 'Q4') {
                itemData.releaseDate = 'year-12-31';
                itemData.calendarDate = 'Q4 YEAR';
            }
        }

        // calendar date
        if (itemData.releaseDate && itemData.releaseDate !== '1900-01-01') {
            itemData.calendarDate = moment(itemData.releaseDate, "YYYY-MM-DD").calendar();

        } else {
            itemData.calendarDate = 'Unknown';
            itemData.releaseDate = '1900-01-01';
        }

        // set small url
        if (resultItem.image && resultItem.image.small_url && resultItem.image.small_url !== '') {
            itemData.smallImage = resultItem.image.small_url;
        } else {
            itemData.smallImage = 'no image.png';
        }

        // set thumb url
        if (resultItem.image && resultItem.image.thumb_url && resultItem.image.thumb_url !== '') {
            itemData.thumbnailImage = resultItem.image.thumb_url;
        } else {
            itemData.thumbnailImage = 'no image.png';
        }

        // set large url
        if (resultItem.image && resultItem.image.small_url && resultItem.image.small_url !== '') {
            itemData.largeImage = resultItem.image.small_url;
        } else {
            itemData.largeImage = 'no image.png';
        }

        // set description
        if (resultItem.description && resultItem.description  !== '') {
            itemData.description = resultItem.description;
        } else {
            itemData.description = 'No Description';
        }

        return itemData;
    };


    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombItemPlatform -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.getGiantBombItemPlatform = function(gbombID, onSuccess, onError) {

        // list of fields to get as query parameter
        var fieldList = ['platforms'];

        var giantbombRequest = getGiantBombItem(GIANTBOMB_DETAIL_URL, gbombID, fieldList, function(data) {
            onSuccess(data, gbombID);
        }, onError);

        return giantbombRequest;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombItemData -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.getGiantBombItemData = function(gbombID, onSuccess, onError) {

        // find in giant bomb data cache first
        var cachedData = getCachedData(gbombID);

        // load cached gb data
        if (cachedData) {

            // return updated source item
            onSuccess(cachedData);

        // download gb data
        } else {

            // add to queue
            if (!_.has(getGiantBombItemDataQueue, gbombID)) {
                getGiantBombItemDataQueue[gbombID] = [];
            }
            getGiantBombItemDataQueue[gbombID].push(onSuccess);

            // run for first call only
            if (getGiantBombItemDataQueue[gbombID].length === 1) {

                // download data
                var fieldList = ['description', 'site_detail_url', 'videos'];

                // giantbomb item request
                getGiantBombItem(GIANTBOMB_DETAIL_URL, gbombID, fieldList, function(data) {

                    // iterate queued return methods
                    _.each(getGiantBombItemDataQueue[gbombID], function(successMethod) {

                        // cache result
                        giantBombDataCache[gbombID] = data.results;

                        // return data
                        successMethod(data.results);
                    });

                    // empty queue
                    getGiantBombItemDataQueue[gbombID] = [];

                }, onError);
            }
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombVideo -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.getGiantBombVideo = function(videoID, onSuccess, onError) {

        // find in giant bomb data cache first
        var cachedData = getCachedVideo(videoID);
        var giantBombVideoAjax = null;

        // load cached gb data
        if (cachedData) {

            // return updated source item
            onSuccess(cachedData);

        // download gb data
        } else {

            // download data
            var fieldList = [];

            // giantbomb item request
            giantBombVideoAjax = getGiantBombItem(GIANTBOMB_VIDEO_URL, videoID, fieldList, function(data) {

                // cache result
                giantBombVideoCache[videoID] = data.results;

                // return data
                onSuccess(data.results);

            }, onError);
        }

        return giantBombVideoAjax;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombItemDetail -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    GiantBomb.getGiantBombItemDetail = function(gbombID, onSuccess, onError) {

        // find in giant bomb data cache first
        var cachedItem = getCachedItem(gbombID);

        // load cached gb data1
        if (cachedItem) {

            // return updated source item
            onSuccess(cachedItem);

        // download gb item
        } else {

            // add to queue
            if (!_.has(getGiantBombItemDetailQueue, gbombID)) {
                getGiantBombItemDetailQueue[gbombID] = [];
            }
            getGiantBombItemDetailQueue[gbombID].push(onSuccess);

            // run for first call only
            if (getGiantBombItemDetailQueue[gbombID].length === 1) {

                // download data
                var fieldList = ['id', 'name', 'original_release_date', 'image'];

                // giantbomb item request
                getGiantBombItem(GIANTBOMB_DETAIL_URL, gbombID, fieldList, function(data) {

                    // iterate queued return methods
                    _.each(getGiantBombItemDetailQueue[gbombID], function(successMethod) {

                        // cache result
                        giantBombItemCache[gbombID] = data.results;

                        // return data
                        successMethod(data.results);
                    });

                    // empty queue
                    getGiantBombItemDetailQueue[gbombID] = [];

                }, onError);
            }
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getGiantBombItem = function(url, gbombID, fieldList, onSuccess, onError) {

        var requestData = {
            'field_list': fieldList.join(','),
            'id': gbombID
        };

        var giantbombRequest = $.ajax({
            url: url,
            type: 'GET',
            data: requestData,
            dataType: 'json',
            cache: true,
            success: onSuccess,
            error: onError
        });

        return giantbombRequest;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getCachedVideo -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getCachedVideo = function(id) {

        var giantBombVideo = null;

        if (typeof giantBombVideoCache[id] !== 'undefined') {
            giantBombVideo = giantBombVideoCache[id];
        }

        return giantBombVideo;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getCachedData -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getCachedData = function(id) {

        var giantBombData = null;

        if (typeof giantBombDataCache[id] !== 'undefined') {
            giantBombData = giantBombDataCache[id];
        }

        return giantBombData;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getCachedItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getCachedItem = function(id) {

        var giantBombItem = null;

        if (typeof giantBombItemCache[id] !== 'undefined') {
            giantBombItem = giantBombItemCache[id];
        }

        return giantBombItem;
    };


})(gamedex.module('giantbomb'), gamedex, jQuery, _, moment);

