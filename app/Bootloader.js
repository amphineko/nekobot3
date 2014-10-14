/*
	Nekobot v2 / Core
	
	@package  pw.futa.nekobot.core.bootloader
	@author   Amphineko (Naoki Rinmous)
*/

/* jslint node: true */

var Kernel = require('./kernel/Kernel');
var KQueue = require('./kernel/KernelQueue.js');

var Auth = require('./auth');

var EventAdapter = require('./eventhub/EventAdapter');

//var InfoCache = require('./core/InfoCache.js');
var PluginMan = require('./eventhub/PluginMan2');

var fs = require('fs');
var log = new (require('Log'))('debug');
var path = require('path');
var yaml = require('js-yaml');

function exit(code, reason) {
	console.log('* BOTEXIT: ' + (reason || 'no reason defined.'));
	fs.appendFileSync('./ExitLog.log', '* BOTEXIT: ' + (reason || 'no reason defined.'));
	process.exit(code);
}
module.exports.exit = exit;

/*
EventAdapter.createMessage2(m, function (s, d) {
				if (s) {
					EventAdapter.dispatchMessage2(d, kernel, function () {
						tick();
					});
				} else {
					tick();
				}
			});

*/


function bootSession() {
	log.info('<Bootloader> 開始啟動Nekobot會話');
	
	var config = yaml.load(fs.readFileSync('./Config.yaml', 'utf8'));
	config.authorize.cache = path.resolve(config.authorize.cache);
	var login = process.argv.pop().trim() !== 'skip-login';
	
	Auth(!login, config.authorize, function (s, cookies, auth) {
		if (s) {
			var kernel = new Kernel(auth, cookies, config);
			kernel.InfoCache = { groups: {} };
			KQueue.patchKernel(kernel, EventAdapter.kqueueReceiver);
			PluginMan.loadPluginList(config.plugins, kernel);
			
			
			kernel.start();
		}
	});
	
	/*if (login) {
		Auth.login(config, function (cookies, auth) {
			AuthCache.data('cookies', cookies);
			AuthCache.data('auth', auth);
			AuthCache.save();
			
			kernel = new Kernel(auth, cookies, config);
			kernel.start();
		});
	} else {
		AuthCache.load();
		kernel = new Kernel(AuthCache.data('auth'), AuthCache.data('cookies'), config);
		kernel.start();
	}
	
	InfoCache.setKernel(kernel);
	KQueue.patchKernel(kernel);
	PluginMan.loadPluginList(kernel.config.plugins, kernel);*/
}
module.exports.boot = bootSession;

function continueBoot(kernel) {
	
	kernel.start();
}