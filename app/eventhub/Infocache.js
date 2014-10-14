/*
	Nekobot v2 / Core
	
	@package  pw.futa.nekobot.core.userinfo
	@author   Amphineko (Naoki Rinmous)
*/

/* jslint node:true */

var api = require('./../common/qqapi2');
var log = new (require('Log'))('debug');

var accountCache;


function processGroupInfo(res) {
	var members = {};

	res.minfo.filter(function (element) {
		members[element.uin] = element;
		members[element.uin].rawnick = members[element.uin].nick;
	});
	if (res.cards) {
		res.cards.filter(function (element) {
			if (members[element.muin]) {
				members[element.muin].nick = element.card;
			}
		});
	}

	var b = {
		info: res.ginfo,
		members: members
	};
	
	return b;
}

function refreshGroupInfo(gcode, kernel, callback) {
	log.info('<EventHub/InfoCache> 讀取群組資料: ' + gcode);

	var callback2 = function (stat, message) {
		if (!stat) {
			log.error('<EventHub/InfoCache> 讀取群組資料失敗: ' + message);
		}
		callback(false, null);
	};

	api.get_group_info_ext2(gcode, kernel, function (ret, error) {
		if (!error) {
			if (ret) {
				if (ret.retcode === 0) {
					var b = processGroupInfo(ret.result);
					log.info('<EventHub/InfoCache> 讀取群組資料完成: ' + b.info.name + ' (' + gcode + ')');
					callback(true, b);
				} else {
					callback2(false, 'retcode != 0 [' + ret.retcode + ']');
				}
			} else {
				callback2(false, 'Unexpected null return!');
			}
		} else {
			callback2(false, error);
		}
	});
}

function getGroupInfo(gcode, kernel, callback) {
	if (kernel.InfoCache.groups[gcode]) {
		callback(true, kernel.InfoCache.groups[gcode]);
	} else {
		refreshGroupInfo(gcode, kernel, function (ret, d) {
			if (ret) {
				kernel.InfoCache.groups[gcode] = d;
			}
			callback(ret, d);
		});
	}
}
module.exports.getGroupInfo = getGroupInfo;


function clearGroupInfo(gcode, kernel) {
	delete kernel.InfoCache.groups[gcode];
}
module.exports.clearGroupInfo = clearGroupInfo;


function getAccount(uin, kernel, callback) {
	if (!accountCache) {
		accountCache = {};
	}
	if (uin in accountCache) {
		console.log('Load from cache: ' + uin);
		if (callback) {
			callback(true, accountCache[uin]);
		}
		return accountCache[uin];
	} else {
		var callback2 = function (stat, p) {
			if (!stat) {
				log.error('<Infocache> 讀取用戶帳號失敗 ' + uin);
			}
			if (callback) {
				callback(stat, p);
			}
		};
		console.log('Querying: ' + uin);
		
		api.get_friend_uin2(kernel, uin, function (ret, error) {
			if (!error) {
				if (ret) {
					if (ret.retcode === 0) {
						if (callback) {
							callback2(true, ret.result.account);
						}
						accountCache[uin] = ret.result.account;
					} else {
						callback2(false, 'retcode != 0 [' + ret.retcode + ']');
					}
				} else {
					callback2(false, 'Unexpected null return!');
				}
			} else {
				callback2(false, error);
			}
		});
		return false;
	}
}
module.exports.getAccount = getAccount;


