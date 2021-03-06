// ItemLinker
(function(ItemLinker, gamedex, $, _) {
    "use strict";

    // Dependencies
    var Amazon = gamedex.module('amazon'),
        GiantBomb = gamedex.module('giantbomb'),
        Utilities = gamedex.module('utilities');

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * standardizeTitle -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.standardizeTitle = function(title) {

        var sanitizedName = title;
        var re = null;
        var reRoman = null;

        var match = null;
        var match2 = null;
        var roman = '';
        var dec = 0;
        var num = 0;
        var arr = null;

        // remove brackets and parenthesis and content inside
        sanitizedName = sanitizedName.replace(/\s*[\[\(].*[\)\]]/gi, '');

        // remove the word: trophies
        sanitizedName = sanitizedName.replace(/\s*trophies/gi, '');
        // remove word that appears before 'edition'
        sanitizedName = sanitizedName.replace(/\S+ edition$/gi, '');
        // remove words appearing after 'with'
        sanitizedName = sanitizedName.replace(/\swith\s.*/gi, '');
        // remove 'the ' if at the start of title
        sanitizedName = sanitizedName.replace(/^\s*the\s/gi, '');

        if (match && match[0].length > 3) {
            sanitizedName = sanitizedName.replace(re, '');
        }

        return sanitizedName.toLowerCase();
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getSimilarityScore -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.getSimilarityScore = function(sourceItem, searchItem) {

        // matching properties
        var score = 100;

        // get levenshten string distance value (greater value = more difference between strings)
        var levenshteinValue = levenshtein(sourceItem.standardName, searchItem.name);

        // subtract levenshteinValue from score
        score = score - levenshteinValue;

        // exact release date check
        if (typeof searchItem.releaseDate !== 'undefined') {

            // get difference in days
            var diff = Math.floor((Date.parse(sourceItem.releaseDate) - Date.parse(searchItem.releaseDate) ) / 86400000);

            if (diff === 0) {
                score = score + 100;
            }

            // don't subtract score if search result date is unknown/unreleased
            if (!isNaN(diff) && searchItem.releaseDate !== '1900-01-01')  {
                score -= Math.abs(diff / 365);
            }
        }

        // platform match
        if (typeof searchItem.platform !== 'undefined') {
            // get standard platform name from platform
            var standardPlatform = Utilities.matchPlatformToIndex(searchItem.platform).name;

            if (sourceItem.platform === standardPlatform) {
                score += 20;
            }
        }

        return score;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * convertRomanNumerals -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.convertRomanNumerals = function(name) {

        var reRoman = new RegExp('\\s[XVI]+', 'gi');
        var match = reRoman.exec(name);

        // roman numeral found
        if (match && match[0].length > 0) {

            var roman = match[0];
            // remove III first and set dec to start at 3
            // the simplified converter below does add 'III' of anything correctly
            var re = new RegExp('III', 'gi');
            var match2 = re.exec(roman);
            var dec = '';

            if (match2 && match2[0].length > 0) {
                dec = 3;
                roman = roman.replace(re, '');
            }

            var arr = roman.split('');
            var num = null;

            // iterate each roman character except last blank character
            for (var i = arr.length - 1; i >= 1; i--) {
                switch(arr[i]) {
                    case 'I':
                    num = 1;
                break;
                    case 'V':
                    num = 5;
                break;
                    case 'X':
                    num = 10;
                break;
            }

            if (num < dec) {
                dec = dec - num;
            } else {
                dec = dec + num;
            }

            }

            // replace roman with decimal
            name = name.replace(reRoman, ' ' + dec);
        }

        return name;
    };


    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * findItemOnAlternateProvider
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.findItemOnAlternateProvider = function(item, provider, preventMultipleRequests, onSuccess, onError) {

        var searchRequest = null;
        onError = typeof onError !== 'undefined' ? onError : null;

        switch (provider) {
            case Utilities.SEARCH_PROVIDERS.Amazon:

                var searchName = item.standardName;

                // run search for giantbomb
                searchRequest = GiantBomb.searchGiantBomb(searchName, function(data) {
                    findGiantbombMatch(data, item, onSuccess, onError);
                });
                break;

            case Utilities.SEARCH_PROVIDERS.GiantBomb:

                var browseNode = 0;

                // run same platform search
                if (item.platform !== 'n/a') {
                    browseNode = Utilities.getStandardPlatform(item.platform).amazon;
                }

                // run search for amazon
                searchRequest = Amazon.searchAmazon(item.name, browseNode, function(data) {
                    findAmazonMatch(data, item, onSuccess, onError, false);
                }, onError, preventMultipleRequests);
                break;
        }

        return searchRequest;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getLinkedItemData
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.getLinkedItemData = function(item, provider, onSuccess) {

        switch (provider) {

            // amazon is provider > fetch from giantbomb
            case Utilities.SEARCH_PROVIDERS.Amazon:

                // get item from giantbomb
                GiantBomb.getGiantBombItemDetail(item.gbombID, function(data) {
                    getGiantBombItemDetail_result(data, onSuccess);
                });
                break;

            // giantbomb is provider > fetch from amazon
            case Utilities.SEARCH_PROVIDERS.GiantBomb:

                // get item from amazon
                Amazon.getAmazonItemDetail(item.asin, function(data) {
                    getAmazonItemDetail_result(data, onSuccess);
                });
                break;
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * findWikipediaMatch -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    ItemLinker.findWikipediaMatch = function(data, sourceItem, onSuccess) {

        var results = data;
        var searchItem = {};

        // matching properties
        var bestMatch = null;
        var bestScore = -99999;
        var score = 0;

        // iterate search results
        for (var i = 0, len = results.length; i < len; i++) {

            // create searchItem object
            searchItem = {
                'name': results[i]
            };

            // init best match with first item
            if (i === 0) {
                bestMatch = searchItem;
            }

            // get similarity score
            score = ItemLinker.getSimilarityScore(sourceItem, searchItem);

            // check if score is new best
            if (score > bestScore) {
                bestMatch = searchItem;
                bestScore = score;
            }
        }

        // return best match to onSuccess method
        if (results.length !== 0) {
            // return best match
            onSuccess(bestMatch);
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getAmazonItemDetail_result
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getAmazonItemDetail_result = function(data, onSuccess) {

        var detailItem = {};
        // iterate results
        $('Item', data).each(function() {

            // parse item and set detailItem
            detailItem = Amazon.parseAmazonResultItem($(this), true);
        });

        // display second item
        onSuccess(detailItem);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getGiantBombItemDetail_result
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getGiantBombItemDetail_result = function(data, onSuccess) {

        // parse result item and set detailItem
        var detailItem = GiantBomb.parseGiantBombResultItem(data);

        // display second item
        onSuccess(detailItem);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * findAmazonMatch
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var findAmazonMatch = function(data, sourceItem, onSuccess, onError, lastSearch) {

        var resultLength = ($('Item', data).length);
        var searchItem = {};
        var count = 0;

        // matching properties
        var bestMatch = null;
        var bestScore = -99999;
        var score = 0;

        // iterate results
        $('Item', data).each(function() {

            // parse item and return searchItem
            searchItem = Amazon.parseAmazonResultItem($(this));

            // searchItem not filtered
            if (typeof searchItem.isFiltered === 'undefined') {


                // save first non-filtered result
                if (count === 0) {
                    bestMatch = searchItem;
                }

                count++;
                // get similarity score
                score = ItemLinker.getSimilarityScore(sourceItem, searchItem);

                // check if score is new best
                if (score > bestScore) {
                    bestMatch = searchItem;
                    bestScore = score;

                }
            }
        });

        // return best match to onSuccess method
        if (bestMatch) {
            // return best match
            onSuccess(bestMatch);

        // re-run search without platform filter - only if this hasn't been run before
        } else if (!lastSearch) {
            Amazon.searchAmazon(sourceItem.name, 0, function(data) {
                findAmazonMatch(data, sourceItem, onSuccess, onError, true);
            }, onError);
        } else {
            onError();
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * findGiantbombMatch -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var findGiantbombMatch = function(data, sourceItem, onSuccess, onError) {

        var results = data.results;
        var searchItem = {};

        // matching properties
        var bestMatch = null;
        var bestScore = -99999;
        var score = 0;

        // iterate search results
        for (var i = 0, len = results.length; i < len; i++) {

            // parse result into searchItem object
            searchItem = GiantBomb.parseGiantBombResultItem(results[i]);

            // init best match with first item
            if (i === 0) {
                bestMatch = searchItem;
            }

            // get similarity score
            score = ItemLinker.getSimilarityScore(sourceItem, searchItem);

            // check if score is new best
            if (score > bestScore) {
                bestMatch = searchItem;
                bestScore = score;
            }
        }

        // return best match to onSuccess method
        if (results.length !== 0) {

            // return best match
            onSuccess(bestMatch);

        // no match found
        } else {
            onError();
        }

    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * levenshtein -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var levenshtein = function(s1, s2) {

        if (s1 == s2) {
            return 0;
        }

        var s1_len = s1.length;
        var s2_len = s2.length;
        if (s1_len === 0) {
            return s2_len;
        }
        if (s2_len === 0) {
            return s1_len;
        }

        // BEGIN STATIC
        var split = false;
        try{
            split=!('0')[0];
        } catch (e){
            split=true; // Earlier IE may not support access by string index
        }
        // END STATIC
        if (split){
            s1 = s1.split('');
            s2 = s2.split('');
        }

        var v0 = new Array(s1_len+1);
        var v1 = new Array(s1_len+1);

        var s1_idx=0, s2_idx=0, cost=0;
        for (s1_idx=0; s1_idx<s1_len+1; s1_idx++) {
            v0[s1_idx] = s1_idx;
        }
        var char_s1='', char_s2='';
        for (s2_idx=1; s2_idx<=s2_len; s2_idx++) {
            v1[0] = s2_idx;
            char_s2 = s2[s2_idx - 1];

            for (s1_idx=0; s1_idx<s1_len;s1_idx++) {
                char_s1 = s1[s1_idx];
                cost = (char_s1 == char_s2) ? 0 : 1;
                var m_min = v0[s1_idx+1] + 1;
                var b = v1[s1_idx] + 1;
                var c = v0[s1_idx] + cost;
                if (b < m_min) {
                    m_min = b; }
                if (c < m_min) {
                    m_min = c; }
                v1[s1_idx+1] = m_min;
            }
            var v_tmp = v0;
            v0 = v1;
            v1 = v_tmp;
        }
        return v0[s1_len];
    };

})(gamedex.module('itemLinker'), gamedex, jQuery, _);
