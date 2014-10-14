/*
	Nekobot v2 / Core
	
	@package  pw.futa.nekobot.core.session
	@author   Amphineko (Naoki Rinmous)
	
	@modification-increment  #4 (03/09/2014)
*/

/* jslint node: true */

var Bootloader = require('./../Bootloader');
var APIClient = require('./../common/APIClient');

var event = require('events');
var log = new (require('Log'))('debug');
var moment = require('moment');

var Kernel = function (a, c1, c2) {
	this.auth = a;
	this.config = c2;
	this.cookies = c1;
	
	this.eventHandler = nullEventHandler;
	this.kernelEvent = new event.EventEmitter();
	
	log.info('<Kernel> 內核構築完畢');
};

Kernel.prototype.start = function () {
	this.launchtime = moment();
	process.title = 'Nekobot v2 Console';
	
	log.info('<Kernel> 內核啓動!');
	
	var that = this;
	process.nextTick(function () {
		poll(that, poll_handle);
	});
	
	global.NB_KERNEL = that;
};

function nullEventHandler() {
	console.log('Event Handler not defined.');
}

function poll(kernel, handler) {
	log.debug('<Kernel> Executing Poll Tick... method v3 via APIClient');
	
	var url = "http://d.web2.qq.com/channel/poll2";
	var r = {
		clientid: kernel.auth.clientid,
		psessionid: kernel.auth.psessionid,
		key: 0,
		ids: []
	};
	var params = {
		clientid: r.clientid,
		psessionid: r.psessionid,
		r: JSON.stringify(r)
	};
	
	APIClient.post({ url: url }, params, kernel.cookies, function(ret, res) {
		handler(kernel, ret, res);
		poll(kernel, handler);
	});
}

function poll_handle(kernel, ret, error) {
	if (error) {
		log.error("<Kernel> 執行Poll操作時遇到異常: " + error);
		return;
	}
	
	var retcode = ret ? ret.retcode : -1;
	switch (retcode) {
		case -1:
			log.error("<Kernel> Null Response (retcode == -1)");
			break;
		case 0:
			var res = ret.result;
			for (var key in res) {
				kernel.eventHandler(res[key]);
			}
			break;
		case 102:
			log.debug('<Kernel> nothing happened');
			break;
		case 103:
		case 121:
			log.critical('<Kernel> 登入狀態異常: ' + retcode);
			Bootloader.exit(72, '登入狀態異常: ' + retcode);
			break;
		case 116:
			kernel.auth.ptwebqq = ret.p;
			kernel.kernelEvent.emit('authchange', kernel);
			break;
		default:
			kernel.kernelEvent.emit('unimplemented', ret, kernel);
			log.debug(ret);
			break;
	}
}

module.exports = Kernel;