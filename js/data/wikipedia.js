// Wikipedia
(function(Wikipedia) {

	// Dependencies
	var User = gamedex.module('user'),
		Utilities = gamedex.module('utilities'),
		ItemLinker = gamedex.module('itemLinker'),

		// wikipedia cache
		wikipediaPageCache = {};

	/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* getWikipediaPage -
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	Wikipedia.getWikipediaPage = function(title, sourceItem, onSuccess) {

		// find in attributes cache first
		var itemAttributes = wikipediaPageCache[sourceItem.id];

		if (itemAttributes && typeof itemAttributes.wikipediaPage !== 'undefined') {

			// display attribute
			onSuccess(itemAttributes.wikipediaPage);

		// search wikipedia
		} else {

			searchWikipedia(title, function(data) {

				// get page array
				pageArray = data[1];

				// match page to sourceItem
				ItemLinker.findWikipediaMatch(pageArray, sourceItem, function(item) {

					// get wikipedia page details
					getWikipediaPageDetails(item.name, function(data) {

						// get wikipedia page url
						_.each(data.query.pages, function(pageItem, key){

							// add to cache
							if (itemAttributes) {
								itemAttributes.wikipediaPage = pageItem.fullurl;
							} else {
								wikipediaPageCache[sourceItem.id] = {wikipediaPage: pageItem.fullurl};
							}

							// display attribute
							onSuccess(pageItem.fullurl);
						});
					});
				});
			});
		}
	};

	/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* searchWikipedia
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	var searchWikipedia = function(keywords, onSuccess, onError) {

		var url = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?';

		var requestData = {
			'search': keywords,
			'prop': 'revisions',
			'rvprop': 'content'
		};

        $.ajax({
            url: url,
            type: 'GET',
            data: requestData,
            dataType: 'jsonp',
            cache: false,
            crossDomain: true,
            success: onSuccess,
            error: onError
        });

	};

	/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* getWikipediaPageDetails
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	var getWikipediaPageDetails = function(pageTitle, onSuccess, onError) {

		var url = 'http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?';

		var requestData = {
			'titles': pageTitle,
			'prop': 'info',
			'inprop': 'url'
		};

        $.ajax({
            url: url,
            type: 'GET',
            data: requestData,
            dataType: 'jsonp',
            cache: false,
            crossDomain: true,
            success: onSuccess,
            error: onError
        });

	};


})(gamedex.module('wikipedia'));

