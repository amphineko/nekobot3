/*
	Nekobot v3 / Core.Auth

	@package  me.acgch.nekobot.auth.cache
	@author   Naoki Rinmous <i@futa.moe>
*/

var fs = require('fs');
var log = new (require('log'))('debug');

var cache;

module.exports.data = function (key, value) {
	// Value not defined:	Return cache record
	// Value defined:		Write into cache
	if (value) {
		cache[key] = value;
	} else {
		return cache[key];
	}
};

module.exports.command = function (action, filepath) {
	switch (action) {
		case 'clear':
			cache = {};
			break;
		case 'load':
			if (fs.existsSync(filepath)) {
				cache = JSON.parse(fs.readFileSync(filepath));
				// Load json-encoded data from file
				return true;
			} else {
				cache = {};
				log.error('<Authorize/Cache> Authorization Cache File not found.');
				// Report an error when failed
				return false;
			}
			break;
		case 'save':
			fs.writeFileSync(filepath, JSON.stringify(cache));
			return true;
	}
};
