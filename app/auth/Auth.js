/*
	Nekobot v3 / Core.Auth

	@package  me.acgch.nekobot.auth
	@author   Naoki Rinmous <i@futa.moe>
*/

var AuthLogin = require('./AuthLogin.js'); // Create new session
var AuthCache = require('./AuthCache.js'); // Resume previous session

module.exports = function (resume, authconf, callback) {
	console.log('Cache Path: ' + authconf.cache);
	if (resume) {
		AuthCache.command('load', authconf.cache);
		var cookies = AuthCache.data('cookies');
		var auth = AuthCache.data('auth');
		callback(true, cookies, auth);
	} else {
		AuthLogin.login(authconf, function (cookies, auth) {
			AuthCache.command('clear');
			AuthCache.data('cookies', cookies);
			AuthCache.data('auth', auth);
			AuthCache.command('save', authconf.cache);
			callback(true, cookies, auth);
		});
	}
};
