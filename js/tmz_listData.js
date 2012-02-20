// ListData
(function(ListData) {

	// Dependencies
	var User = tmz.module('user');

    /**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* getters
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

	/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* addList
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	ListData.addList = function(listName, onSuccess, onError) {

		var userData = User.getUserData();
		var restURL = tmz.api + 'list/add';

		var requestData = {
			user_id: userData.user_id,
			secret_key: userData.secret_key,
			list_name: listName
		};

		$.ajax({
			url: restURL,
			type: 'POST',
			data: requestData,
			dataType: 'json',
			cache: true,
			success: onSuccess,
			error: onError
		});
	};

	/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	* deleteList -
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	ListData.deleteList = function(listID, onSuccess, onError) {

		var userData = User.getUserData();
		var restURL = tmz.api + 'list/delete';

		// delete list
		var requestData = {
			user_id: userData.user_id,
			secret_key: userData.secret_key,
			id: listID
		};

		$.ajax({
			url: restURL,
			type: 'POST',
			data: requestData,
			dataType: 'json',
			cache: true,
			success: onSuccess,
			error: onError
		});
	};


})(tmz.module('listData'));

