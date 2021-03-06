// ITEM VIEW
(function(ItemView, gamedex, $, _, ListJS) {
    "use strict";

    // modules references
    var User = gamedex.module('user'),
        SiteView = gamedex.module('siteView'),
        TagView = gamedex.module('tagView'),
        Utilities = gamedex.module('utilities'),
        DetailView = gamedex.module('detailView'),
        ImportView = gamedex.module('importView'),
        GridView = gamedex.module('gridView'),
        ItemData = gamedex.module('itemData'),
        ItemCache = gamedex.module('itemCache'),
        TagData = gamedex.module('tagData'),
        Amazon = gamedex.module('amazon'),
        Metacritic = gamedex.module('metacritic'),
        ItemLinker = gamedex.module('itemLinker'),
        FilterPanel = gamedex.module('filterPanel'),
        GiantBomb = gamedex.module('giantbomb'),
        Steam = gamedex.module('steam'),

        // constants
        DISPLAY_TYPE = {'List': 0, 'Icons': 1},
        VIEW_MODES = {'collection': 'collection', 'discussion': 'discussion'},
        SORT_TYPES = {'alphabetical': 0, 'metascore': 1, 'releaseDate': 2, 'platform': 3, 'price': 4},
        PANEL_HEIGHT_OFFSET_USE = 230,                  // height offset when logged in
        PANEL_HEIGHT_OFFSET_INFO = 460,                 // height offset when logged out
        PANEL_HEIGHT_PADDING_DISCUSSION_MAX = 10,       // padding for discussion content (panel no scrolling)
        PANEL_HEIGHT_PADDING_DISCUSSION_SCROLL = 50,    // padding for discussion content (panel requires scrolling)
        PANEL_HEIGHT_PADDING_COLLECTION_MAX = 5,        // padding for collection content (panel no scrolling)
        PANEL_HEIGHT_PADDING_COLLECTION_SCROLL = 10,    // padding for collection content (panel requires scrolling)
        VIEW_ALL_TAG_ID = '0',
        VIEW_ALL_TAG_NAME = 'View All',

        // list
        itemList = null,
        listOptions = {
            valueNames: ['itemName', 'metascore', 'releaseDate', 'platform', 'gameStatus', 'playStatus', 'userRating'],
            item: 'list-item'
        },

        // properties
        currentViewTagID = VIEW_ALL_TAG_ID,
        displayType = DISPLAY_TYPE.Icons,
        currentSortIndex = 0,
        filterHasBeenApplied = false,
        queueDisplayRefresh = false,
        filterType = null,
        itemMenuOpen = false,
        panelHeightOffset = PANEL_HEIGHT_OFFSET_INFO,
        isFiltered = false,
        itemViewMode = VIEW_MODES.collection,

        // element cache
        $wrapper = $('#wrapper'),
        $itemResults = $('#itemResults tbody'),
        $resizeContainer = $('#resizeContainer'),
        $viewItemsContainer = $('#viewItemsContainer'),
        $itemResultsContainer = $('#itemResultsContainer'),
        $displayOptions = $viewItemsContainer.find('.displayOptions'),
        $gridViewButton = $('#gridView_btn'),
        $showCollectionButton = $('#showCollection_btn'),

        $viewList = $('#viewList'),
        $viewName = $viewList.find('.viewName'),

        $itemViewMenu = $('#itemViewMenu'),
        $editMenu = $('#editMenu'),

        // sort elements
        $sortOptions = $viewItemsContainer.find('.sortOptions'),
        $sortTypeField = $sortOptions.find('.sortType'),

        // filter elements
        $filterOptions = $viewItemsContainer.find('.filterOptions'),
        $platformFilterSubNav = $('#platformFilterSubNav'),
        $clearFiltersBtn = $filterOptions.find('.clearFilters_btn'),
        $filterTypeField = $filterOptions.find('.filterType'),
        $applyFiltersButton = $('#applyFilters_btn'),

        // delete list modal
        $deleteListConfirmModal = $('#deleteListConfirm-modal'),
        $deleteListConfirmBtn = $('#deleteListConfirm_btn'),
        $deleteListBtn = $('#deleteList_btn'),
        $deleteListName = $deleteListBtn.find('.listName'),

        // import menu
        $importMenu = $('#importMenu'),

        // error modal
        $errorModal = $('#error-modal'),

        // update list modal
        $updateListModal = $('#updateList-modal'),
        $tagNameField = $('#tagNameField'),
        $updateListBtn = $('#updateListConfirm_btn'),
        $editListBtn = $('#editList_btn'),

        $loadingStatus = $itemResultsContainer.find('.loadingStatus'),

        // jquery objects
        currentHoverItem = null,

        // templates
        priceMenuTemplate = _.template($('#price-menu-template').html()),
        steamPriceMenuTemplate = _.template($('#steam-price-menu-template').html()),
        itemResultsTemplate = _.template($('#item-results-template').html());

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * init
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var init = function() {

        createEventHandlers();

        // initialize nanoscroll
        var nanoScrollOptions = {
            sliderMinHeight: 20,
            iOSNativeScrolling: true,
            preventPageScrolling: true,
            flash: true,
            flashDelay: 1500
        };
        $itemResultsContainer.nanoScroller(nanoScrollOptions);

        // update nano scroller sizes periodically
        setInterval(function() {
            $itemResultsContainer.nanoScroller();
        }, 1500);

        // set initial filtered status
        setClearFiltersButton(false);

        // init BootstrapSubMenu (bootstrap sub menu)
        $platformFilterSubNav.BootstrapSubMenu({'$mainNav': $filterOptions});
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * createEventHandlers
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var createEventHandlers = function() {

        // itemViewMenu .dropdown: hover
        $itemViewMenu.on('mouseenter', '.dropdown-toggle', function(e) {

            var that = this;

            // if dropdown open trigger click on .dropdown
            $itemViewMenu.find('.dropdown').each(function() {

                if ($(this).hasClass('open') && $(this).find('.dropdown-toggle').get(0) !== $(that).get(0)) {
                    $(that).trigger('click');
                }
            });
        });

        // viewList: click
        $viewList.find('ul').on('click', 'a', function(e) {
            e.preventDefault();
            changeViewList($(this).attr('data-content'));
        });

        // applyFilters_btn: click
        $applyFiltersButton.click(function(e) {
            e.preventDefault();

            if (!$wrapper.hasClass('gridView')) {
                // show clear filters button
                setClearFiltersButton(true);
                applyFilters(0);
            }
        });

        // clearFiltersBtn: click
        $clearFiltersBtn.click(function(e) {
            e.preventDefault();

            // hide clear filters button
            setClearFiltersButton(false);
            $filterTypeField.text('None');
            // clear filters
            FilterPanel.resetFilters();
            applyFilters();
        });

        // item record: click
        $viewItemsContainer.on('click', '#itemResults tr', function(e) {

            // view item
            viewItem($(this).attr('id'));
        });

        // deleteItem_btn: click
        $itemResults.on('click', '.deleteItem_btn', function(e) {
            e.preventDefault();

            // get id from delete button attribute
            var id = $(this).attr('data-content');
            deleteItem(id);
        });

        // quickAttributes: click
        $itemResults.on('click', '.quickAttributes a', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // get attribute id
            var attributeID = parseInt($(this).attr('data-content'), 10);
            var id = $(this).parent().parent().attr('data-content');

            // set quick attribute
            setQuickAttribute($(this), id, attributeID);
        });

        // deleteList_btn: click
        $deleteListBtn.click(function(e) {
            e.preventDefault();

            SiteView.hideSiteGuide();

            // check how many tags left
            if (TagView.getTagCount() > 1) {
                $deleteListConfirmModal.modal('show');
            } else {
                $errorModal.find('.alertTitle').text('Tag Delete Error');
                $errorModal.find('.alertText').text('Cannot delete last tag');
                $errorModal.modal('show');
            }
        });

        // deleteListConfirm_btn: click
        $deleteListConfirmBtn.click(function(e) {
            e.preventDefault();

            $deleteListConfirmModal.modal('hide');
            // delete currently viewing list
            deleteTag(currentViewTagID);
        });

        // updateListModal: form submit
        $updateListModal.find('form').submit(function(e) {
            e.preventDefault();
            // update tag name
            updateTag(currentViewTagID, $tagNameField.val());
            $updateListModal.modal('hide');
        });

        // updateListBtn: click
        $updateListBtn.click(function(e) {
            e.preventDefault();

            // update tag name
            updateTag(currentViewTagID, $tagNameField.val());
            $updateListModal.modal('hide');
        });

        // editListBtn: click
        $editListBtn.click(function(e) {
            e.preventDefault();

            SiteView.hideSiteGuide();

            var currentTagName = TagView.getTagName(currentViewTagID);

            // set field name
            $tagNameField.val(currentTagName);

            $updateListModal.modal('show');

            // select field text
            _.delay(function() {
                $tagNameField.focus().select();
            }, 1000);
        });

        // import menu buttons: click
        $importMenu.find('li').click(function(e) {
            e.preventDefault();

            SiteView.hideSiteGuide();

            // import games from source
            ImportView.startImport(parseInt($(this).attr('data-importSource'), 10));
        });

        // displayType: toggle
        $displayOptions.find('button').click(function(e) {
            e.preventDefault();

            changeDisplayType($(this));
        });

        // sortOptions: select
        $sortOptions.find('li a').click(function(e) {
            e.preventDefault();
            sortList(parseInt($(this).attr('data-content'), 10));
        });

        // filterOptions: select
        $filterOptions.find('li:not(.dropdown-sub) a').click(function(e) {
            e.preventDefault();

            // custom filter
            filterType = $(this).attr('data-content');
            if (filterType == '0') {

                SiteView.hideSiteGuide();
                FilterPanel.showFilterPanel();

            // quick filter
            } else {

                // show clear filters button
                setClearFiltersButton(true);

                // set filterType field
                $filterTypeField.text($(this).text());

                quickFilter(filterType);
            }

        });

        // show grid view button: click
        $gridViewButton.click(function(e) {
            e.preventDefault();

            SiteView.hideSiteGuide();
            showGridView();
        });

        // show collection button: click
        $showCollectionButton.click(function(e) {
            e.preventDefault();
            viewCollection();
        });

        // window, itemResults: resized
        $resizeContainer.resize(resizePanel);
        $(window).resize(resizePanel);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * render -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var render = function(items) {

        // clear item view before render
        clearItemView();

        // item length
        var length = 0;
        var delayBetweenBlocks = 500;
        var blockSize = 25;
        var blockCount = 0;

        var itemChunk = [];

        // add displayType/currentViewTagID to templateData
        $itemResults.addClass('list display-' + displayType);

        // add user attributes to model
        _.each(items, function(item, key) {
            addUserAttributes(item);
            length++;

            itemChunk.push(item);

            // if we reach block size break point
            if (length % blockSize === 0) {

                // create new closure and pass in current properties and data
                (function(length, itemChunk, currentViewTagID) {
                    // render
                    _.delay(function() {
                        renderChunk(itemChunk, currentViewTagID);
                        itemChunk = [];
                    }, delayBetweenBlocks * blockCount);

                }(length, $.extend(true, {}, itemChunk), currentViewTagID));

                blockCount++;

                // clear item chunk for next block size break point
                itemChunk = [];
            }
        });

        // finalize and load remaining items which do not fit inside of block size
        _.delay(function() {
            renderChunk(itemChunk, currentViewTagID);
            itemChunk = [];

            finalizeRender(items, length);

        }, delayBetweenBlocks * blockCount);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * renderChunk
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var renderChunk = function(itemChunk, renderViewTagID) {

        if (renderViewTagID === currentViewTagID) {

            // get model data
            var templateData = {'items': itemChunk, 'length': length};

            templateData.currentViewTagID = currentViewTagID;

            // render model data to template
            $itemResults.append(itemResultsTemplate(templateData));

        } else {
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * finalizeRender
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var finalizeRender = function(items, length) {

        if (length > 0) {

            // activate tooltips for quickAttributes bar
            $itemResults.find('.quickAttributes a').each(function(key, button) {
                var $button = $(button);
                $button.opentip($button.attr('data-ot'), {tipJoint: 'bottom'});
            });

            // load preliminary data (for filtering, sorting)
            _.each(items, function(item, key) {
                loadPreliminaryMetascore(item);
            });

            // load latest/extra information for each item
            _.each(items, function(item, key) {
                loadThirdPartyData(item);
            });

            // update list.js for item list
            itemList = new ListJS('itemResultsContainer', listOptions);

            // sort using current sort method
            sortList(currentSortIndex);

            // apply filters
            applyFilters();

            // reset filters - allow filter index to be recreated after dynamic data loaded
            filterHasBeenApplied = false;
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getItem = function(id) {

        return ItemData.getItem(id);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * clearItemView -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var clearItemView = function() {

        $itemResults.empty();
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * resizePanel -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var resizePanel = function() {

        var windowHeight = $(window).height();
        var resultsHeight = $resizeContainer.height();
        var discussionPaddingScroll = 0;
        var discussionPaddingMax = 0;

        // add loading status height if visible
        if ($loadingStatus.is(':visible')) {
            resultsHeight += $loadingStatus.height();
        }

        // if viewing collection: add additional height padding
        if (itemViewMode === VIEW_MODES.discussion) {
            discussionPaddingScroll = PANEL_HEIGHT_PADDING_DISCUSSION_SCROLL;
            discussionPaddingMax = PANEL_HEIGHT_PADDING_DISCUSSION_MAX;
        }

        // panel does not require shrinking
        if (resultsHeight - discussionPaddingScroll < windowHeight - panelHeightOffset) {
            $itemResultsContainer.css({'height': resultsHeight + PANEL_HEIGHT_PADDING_COLLECTION_MAX + discussionPaddingMax});

        // shrink panel to match window height
        } else {
            var constrainedHeight = windowHeight - panelHeightOffset;
            $itemResultsContainer.css({'height': constrainedHeight + PANEL_HEIGHT_PADDING_COLLECTION_SCROLL + discussionPaddingScroll});
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * loggedInView -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var loggedInView = function(isLoggedIn) {

        if (isLoggedIn) {
            panelHeightOffset = PANEL_HEIGHT_OFFSET_USE;
        } else {
            panelHeightOffset = PANEL_HEIGHT_OFFSET_INFO;
        }

        resizePanel();
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * initializeUserItems -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var initializeUserItems = function(onSuccess, onFail) {

        // save tagID
        currentViewTagID = VIEW_ALL_TAG_ID;

        // load item data for tagID
        return ItemData.getItems(VIEW_ALL_TAG_ID, onSuccess, onFail);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * initializeUserItems_result - called upon result of initializeUserItems and other dependencies
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var initializeUserItems_result = function(items) {

        // ItemData items result
        ItemData.itemsAndDirectoryLoaded(items);

        // select 'view all' tag
        changeViewList(VIEW_ALL_TAG_ID);

        if (!$.isEmptyObject(items)) {
            // view random item
            viewRandomItem();

        } else {
            DetailView.resetDetail();
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * updateListDeletions -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var updateListDeletions = function(itemID, deletedTagIDs) {

        var tagCount = null;

        // remove items deleted from view
        for (var i = 0, len = deletedTagIDs.length; i < len; i++) {

            // remove element from html
            // except when in 'view all' list (id: 0) and itemDeleted is the last tag for itemID
            if (currentViewTagID === VIEW_ALL_TAG_ID) {

                // get item by id
                tagCount = ItemData.getDirectoryItemByItemID(itemID).tagCount;

                if (tagCount === 0) {

                    // remove item by itemID
                    $('#' + itemID).remove();
                }

            // not viewing 'all items' remove item
            } else if (currentViewTagID === deletedTagIDs[i]) {
                $('#' + itemID).remove();
            }
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * updateListAdditions
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var updateListAdditions = function(data, addedItems) {

        var renderCurrentList = false;

        // update view list
        TagView.updateViewList(data.tagIDsAdded, currentViewTagID);

        // viewing user list
        if (currentViewTagID !== VIEW_ALL_TAG_ID) {

            // iterate added tagIDs - render if viewing list where item was added
            for (var i = 0, len = data.tagIDsAdded.length; i < len; i++) {

                if (data.tagIDsAdded[i] == currentViewTagID) {
                    renderCurrentList = true;
                }
            }

        // viewing 'all list' view
        // don't re-render item already displayed in 'view all' list
        } else if (ItemData.getDirectoryItemByItemID(data.itemID).tagCount >= 1) {
            renderCurrentList = true;
        }

        if (renderCurrentList) {

            // get and render items
            changeViewList(currentViewTagID);
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * updateListAttributesChanged
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var updateListAttributesChanged = function(item) {

        queueDisplayRefresh = true;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * showListView -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var showListView = function(tagID, newFilterType, filterTypeFieldText, isFiltered) {

        filterType = newFilterType;

        changeViewList(tagID);

        $filterTypeField.text(filterTypeFieldText);
        setClearFiltersButton(isFiltered);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * viewDiscussion -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var viewDiscussion = function() {
        itemViewMode = VIEW_MODES.discussion;
        $viewItemsContainer.removeClass().addClass(itemViewMode);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * viewCollection -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var viewCollection = function() {
        itemViewMode = VIEW_MODES.collection;
        $viewItemsContainer.removeClass().addClass(itemViewMode);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * refreshView -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var refreshView = function() {

        viewItems(currentViewTagID);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * showGridView -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var showGridView = function() {

        // show grid for current tag
        GridView.showGridView(currentViewTagID, filterType, $filterTypeField.text(), isFiltered);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * changeViewList -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var changeViewList = function(tagID) {

        var tagName = '';

        // show edit menu
        if (tagID !== VIEW_ALL_TAG_ID) {

            tagName = TagView.getTagName(tagID);

            // change edit menu delete list name
            $deleteListName.text(tagName);

            // show edit menu
            $editMenu.show();

        // hide edit menu
        } else {
            tagName = VIEW_ALL_TAG_NAME;
            $editMenu.hide();
        }

        // set view name
        $viewName.text(tagName);

        // view items
        viewItems(tagID);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * viewItems -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var viewItems = function(tagID, onSuccess) {

        // save tagID
        currentViewTagID = tagID;

        // load item data for tagID
        ItemData.getItems(tagID,

            // success - render items
            function(items) {

                render(items);

                if (onSuccess) {
                    onSuccess();
                }
            },

            // error - empty view
            function() {
                render({});
            }
        );
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * loadThirdPartyData - loads and displays specialized item detail and populates new data into item model
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var loadThirdPartyData = function(item) {

        // initialize limited function as static property of function loadThirdPartyData
        if (typeof loadThirdPartyData.getAmazonItemOffersLimited == 'undefined') {

            // get amazon price data
            loadThirdPartyData.getAmazonItemOffersLimited = function(item) {

                Amazon.getAmazonItemOffers(item.asin, item, function(offers) {
                    amazonPrice_result(item.id, item, offers);

                    // update shared amazon price info
                    ItemData.updateSharedItemPrice(item, Utilities.PRICE_PROVIDERS.Amazon, function(data) {
                    });
                });

            }.lazy(250, 2000);
        }

        // download amazon offer data
        if (!User.isViewUser() && (_.isUndefined(item.offers) || _.keys(item.offers).length === 0)) {

            loadThirdPartyData.getAmazonItemOffersLimited(item);

        // use data from item
        } else {
            amazonPrice_result(item.id, item, item.offers);
        }


        // get steam page and price
        if (!User.isViewUser() && _.isUndefined(item.steamPrice)) {

            Steam.getSteamGame(item.standardName, item,

                // steam item found
                function(steamItem) {
                    steamPrice_result(item.id, item, steamItem);

                    // update shared amazon price info
                    ItemData.updateSharedItemPrice(item, Utilities.PRICE_PROVIDERS.Steam, function(data) {
                    });
                },
                // no result
                function() {
                    ItemData.updateSharedItemPrice(item, Utilities.PRICE_PROVIDERS.Steam, function(data) {
                    });
                }
            );

        // use data from item
        } else {
            steamPrice_result(item.id, item, item);
        }

        // get updated metascore - if metascore or metascore page not in item data
        if (!User.isViewUser() && (item.metascore === null || item.metascorePage === null || item.metascorePage === '')) {

            // get updated score
            Metacritic.getMetascore(item.standardName, item, false, displayMetascore);
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * addUserAttributes -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var addUserAttributes = function(item) {

        // find directory item by itemID
        var itemData = ItemData.getDirectoryItemByItemID(item.itemID);

        if (itemData) {
            // add attributes to model item
            item.gameStatus = itemData.gameStatus;
            item.playStatus = itemData.playStatus;
            item.userRating = itemData.userRating;
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * amazonPrice_result -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var amazonPrice_result = function(id, item, offers) {

        // render if offers available
        if (typeof offers.productURL !== 'undefined') {

            if (_.isUndefined(offers.lowestNewPrice)) {
                offers.lowestNewPrice = '';
            }

            if (_.isUndefined(offers.lowestUsedPrice)) {
                offers.lowestUsedPrice = '';
            }

            var priceSelector = '#' + id + ' .priceDetails';
            var lowestProvider = getLowestPrice(item);

            // attach amazon price to item
            if (lowestProvider == 'amazon') {
                // attach to existing item result
                $(priceSelector).html(priceMenuTemplate(offers));

                // add tooltip
                $(priceSelector).find('.priceButton').opentip($(priceSelector).find('.priceButton').attr('data-ot'), {tipJoint: 'bottom'});
            }
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * steamPrice_result -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var steamPrice_result = function(id, item, steamItem) {

        if (steamItem.steamPrice !== '') {

            var priceSelector = '#' + id + ' .priceDetails';
            var lowestProvider = getLowestPrice(item);

            // attach steam price to item
            if (lowestProvider == 'steam') {

                // truncate steam page url
                steamItem.steamPageDisplay = steamItem.steamPage.split('.com')[1].split('?')[0];

                // attach to existing item result
                $(priceSelector).html(steamPriceMenuTemplate(steamItem));

                // add tooltip
                $(priceSelector).find('.priceButton').opentip($(priceSelector).find('.priceButton').attr('data-ot'), {tipJoint: 'bottom'});
            }
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * getLowestPrice -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var getLowestPrice = function(item) {

        var buyNowPrice = 9999.00;
        var lowestNewPrice = 9999.00;
        var lowestAmazonPrice = 9999.00;

        var steamPrice = 9999.00;

        var lowestPrice = 'amazon';

        // get amazon prices
        if (!_.isUndefined(item.offers)) {
            if (!_.isUndefined(item.offers.buyNowPrice)) {
                buyNowPrice = parseFloat(item.offers.buyNowPrice);
                lowestAmazonPrice = buyNowPrice;
            }
            if (!_.isUndefined(item.offers.lowestNewPrice)) {
                lowestNewPrice = parseFloat(item.offers.lowestNewPrice);
            }
        }

        // get steam price
        if (!_.isUndefined(item.steamPrice)) {
            steamPrice = parseFloat(item.steamPrice);
        }

        // get lowest amazon price
        if (lowestNewPrice < buyNowPrice) {
            lowestAmazonPrice = lowestNewPrice;
        }

        // get lowest price overall
        if (steamPrice < lowestAmazonPrice) {
            lowestPrice = 'steam';
        }

        return lowestPrice;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * load -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var loadPreliminaryMetascore = function(item) {

        // set displayMetascore and metascorePage preliminary data attributes
        if (item.metascore === -1) {
            item.displayMetascore = 'n/a';
        } else {
            item.displayMetascore = item.metascore;
        }

        displayMetascore(item);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * displayMetascore -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var displayMetascore = function(item) {

        // display score
        var metascoreSelector = '#' + item.id + ' .metascore';
        Metacritic.displayMetascoreData(item.metascorePage, item.metascore, metascoreSelector);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * viewRandomItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var viewRandomItem = function() {

        // get random id and view item for id
        var id = ItemData.getRandomItemID();
        viewItem(id);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * viewItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var viewItem = function(id) {

        // get item
        var item = getItem(id);

        // show item detail page
        DetailView.viewItemDetail(item);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * deleteItem -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var deleteItem = function(id) {

        // delete item from server
        var itemID = ItemData.deleteSingleTagForItem(id, currentViewTagID, deleteItem_result);

        // remove tag from add list (Detail View) - only if currently viewing item matches deleted item
        if (DetailView.getViewingItemID() === id) {
            TagView.removeTagFromAddList(currentViewTagID);
        }

        // remove element from html
        $('#' + id).remove();
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * deleteItem_result -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var deleteItem_result = function(data) {

    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * deleteTag -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var deleteTag = function(tagID) {

        // delete tag
        TagView.deleteTag(tagID, function() {
            deleteTag_result();
        });
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * deleteTag_result -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var deleteTag_result = function() {

        // default back to 'view all' list
        changeViewList(VIEW_ALL_TAG_ID);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * updateTag -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var updateTag = function(tagID, tagName) {

        // delete database data
        TagData.updateTag(tagName, tagID, function(data) {
        });

        // update List
        TagView.getTags(function(data) {
            TagView.getTags_result(data);
        });

        // update tag name
        updateTagName(tagName, tagID);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * updateTagName -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var updateTagName = function(tagName, tagID) {

        // update update tag input field and current viewing tag name
        $viewName.text(tagName);
        $tagNameField.val(tagName);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * setQuickAttribute -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var setQuickAttribute = function($button, id, attributeID) {

        if (User.isViewUser()) {
            return;
        }

        // get item by id
        var item = getItem(id);

        // flag for item refresh
        queueDisplayRefresh = true;

        switch (attributeID) {

            // playing
            case 0:
                if (item.playStatus === '1') {
                    resetPlayStatusQuickAttributes($button, '0');
                    $button.parent().removeClass().addClass('playStatus-0');
                    item.playStatus = '0';
                } else {
                    resetPlayStatusQuickAttributes($button, '1');
                    $button.parent().removeClass().addClass('playStatus-1');
                    item.playStatus = '1';
                }
                break;
            // played
            case 1:
                if (item.playStatus === '2') {
                    resetPlayStatusQuickAttributes($button, '0');
                    $button.parent().removeClass().addClass('playStatus-0');
                    item.playStatus = '0';
                } else {
                    resetPlayStatusQuickAttributes($button, '2');
                    $button.parent().removeClass().addClass('playStatus-2');
                    item.playStatus = '2';
                }
                break;
            // finished
            case 2:
                if (item.playStatus === '3') {
                    resetPlayStatusQuickAttributes($button, '0');
                    $button.parent().removeClass().addClass('playStatus-0');
                    item.playStatus = '0';
                } else {
                    resetPlayStatusQuickAttributes($button, '3');
                    $button.parent().removeClass().addClass('playStatus-3');
                    item.playStatus = '3';
                }
                break;
            // favorite
            case 3:
                if (item.userRating === '10') {
                    $button.parent().removeClass('rating-10');
                    item.userRating = '0';
                } else {
                    $button.parent().removeClass().addClass('rating-10');
                    item.userRating = '10';
                }
                break;
            // owned
            case 4:
                if (item.gameStatus === '1') {
                    $button.parent().removeClass().addClass('gameStatus-0');
                    item.gameStatus = '0';
                } else {
                    $button.parent().removeClass().addClass('gameStatus-1');
                    item.gameStatus = '1';
                }
                break;
        }

        // update remote data
        ItemData.updateUserItem(item, function(item, data) {
            // update item detail view
            DetailView.viewItemDetail(item);
        });
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * resetPlayStatusQuickAttributes -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var resetPlayStatusQuickAttributes = function($button, status) {

        // find all quick attribute buttons with class playStatus-x
        $button.parent().parent().find('span[class*="playStatus"]').each(function() {
            $(this).removeClass().addClass('playStatus-' + status);
        });

    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * quickFilter -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var quickFilter = function(filterType) {

        var quickFilter = parseInt(filterType, 10);

        // reset filters
        FilterPanel.resetFilters();

        // filter is not a number - run platform quick filter
        if (isNaN(filterType)) {
            FilterPanel.platformQuickFilter(filterType);

        // standard quick filters
        } else {

            switch (quickFilter) {

                // upcoming
                case 1:
                    // sort and apply filter
                    sortList(SORT_TYPES.releaseDate);
                    // set current filter text on filters button
                    // set filter panel option
                    FilterPanel.upcomingQuickFilter(itemList);
                    break;

                // new releases
                case 2:
                    sortList(SORT_TYPES.releaseDate);
                    FilterPanel.newReleasesQuickFilter(itemList);
                    break;

                // never played
                case 3:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.neverPlayedQuickFilter(itemList);
                    break;

                // games playing
                case 4:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.gamesPlayingQuickFilter(itemList);
                    break;

                // games played
                case 5:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.gamesPlayedQuickFilter(itemList);
                    break;

                // finished games
                case 6:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.finishedGamesQuickFilter(itemList);
                    break;

                // owned games
                case 7:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.ownedGamesQuickFilter(itemList);
                    break;

                // wanted games
                case 8:
                    sortList(SORT_TYPES.metascore);
                    FilterPanel.wantedGamesQuickFilter(itemList);
                    break;
            }
        }

        // apply filters and toggle filter status
        applyFilters(quickFilter);
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * applyFilters -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var applyFilters = function(filterType) {

        // check if custom filter type
        if (filterType === 0) {
            // set filterType field
            $filterTypeField.text('Custom');
        }

        // refresh item display first - then filter
        if (queueDisplayRefresh) {

            queueDisplayRefresh = false;

            // refresh item html for updated filtering
            changeViewList(currentViewTagID, function() {

                // apply filters to itemList
                var filtered = FilterPanel.applyListJSFiltering(itemList);
            });

        // filter immediately
        } else {
            // apply filters to itemList
            var filtered = FilterPanel.applyListJSFiltering(itemList);
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * setClearFiltersButton -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var setClearFiltersButton = function(filtered) {

        isFiltered = filtered;

        // check if filtered - show clearFiltersBtn button
        if (filtered) {
            $clearFiltersBtn.show();
            $clearFiltersBtn.next().show();
        } else {
            $clearFiltersBtn.hide();
            $clearFiltersBtn.next().hide();
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * sortList -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var sortList = function(sortType) {

        currentSortIndex = sortType;

        switch (currentSortIndex) {

            // alphabetical
            case SORT_TYPES.alphabetical:
                // set sort status
                $sortTypeField.text('Alphabetical');
                // sort new list
                itemList.sort('itemName', { asc: true });

                break;

            // metascores
            case SORT_TYPES.metascore:
                $sortTypeField.text('Review Score');
                itemList.sort('scoreDetails', {sortFunction: metascoreSort});

                break;

            // release date
            case SORT_TYPES.releaseDate:
                $sortTypeField.text('Release Date');
                itemList.sort('releaseDate', {sortFunction: releaseDateSort});

                break;

            // platform
            case SORT_TYPES.platform:
                $sortTypeField.text('Platform');
                itemList.sort('platform', { asc: true });

                break;

            // price
            case SORT_TYPES.price:
                $sortTypeField.text('Price');
                itemList.sort('priceDetails', {sortFunction: priceSort});

                break;
        }
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * metascoreSort -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var metascoreSort = function(firstItem, secondItem) {

        var $element1 = $(firstItem.elm).find('.metascore');
        var $element2 = $(secondItem.elm).find('.metascore');

        var score1 = parseInt($element1.attr('data-score'), 10);
        var score2 = parseInt($element2.attr('data-score'), 10);

        if (score1 < score2) {
            return 1;
        }
        return -1;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * priceSort -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var priceSort = function(firstItem, secondItem) {

        var $element1 = $(firstItem.elm).find('.priceDetails .lowestNew');
        var $element2 = $(secondItem.elm).find('.priceDetails .lowestNew');

        var price1 = 0;
        var price2 = 0;

        if ($element1.length > 0 ) {
            price1 = parseFloat($element1.attr('data-price'));
        }

        if ($element2.length > 0) {
            price2 = parseFloat($element2.attr('data-price'));
        }

        if (price1 < price2) {
            return -1;
        }
        return 1;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * releaseDateSort -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var releaseDateSort = function(firstItem, secondItem) {

        var $element1 = $(firstItem.elm).find('.releaseDate');
        var $element2 = $(secondItem.elm).find('.releaseDate');

        var date1 = Date.parse($element1.text());
        var date2 = Date.parse($element2.text());

        return date2 - date1;
    };

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * changeDisplayType
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var changeDisplayType = function($toggleButton) {

        $toggleButton.addClass('active').siblings().removeClass('active');

        var currentDisplayType = $toggleButton.attr('data-content');

        // set new display type if changed
        if (displayType !== currentDisplayType) {
            displayType = currentDisplayType;

            // change #itemResults tbody class
            $itemResults.removeClass().addClass('list display-' + displayType);

            // set nanoscroll
            $itemResultsContainer.nanoScroller();
        }
    };


    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * PUBLIC METHODS -
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    var publicMethods = {
        'init': init,
        'createEventHandlers': createEventHandlers,
        'getItem': getItem,
        'clearItemView': clearItemView,
        'resizePanel': resizePanel,
        'loggedInView': loggedInView,
        'initializeUserItems': initializeUserItems,
        'initializeUserItems_result': initializeUserItems_result,
        'updateListDeletions': updateListDeletions,
        'updateListAdditions': updateListAdditions,
        'updateListAttributesChanged': updateListAttributesChanged,
        'showListView': showListView,
        'viewDiscussion': viewDiscussion,
        'viewCollection': viewCollection,
        'refreshView': refreshView,
        'showGridView': showGridView,
        'viewRandomItem': viewRandomItem
    };

    $.extend(ItemView, publicMethods);

})(gamedex.module('itemView'), gamedex, jQuery, _, List);
