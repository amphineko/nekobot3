/* jslint node: true */

/*
	Nekobot v2 / Core
	
	@package  pw.futa.nekobot.core.eventadapter
	@author	Amphineko (Naoki Rinmous)
*/


var Api = require('./../common/qqapi2');
var InfoCache = require('./InfoCache');
var log = new (require('Log'))('debug');
var PluginMan = require('./Pluginman2');
var send = require('../kernel/SendQueue');


var MsgTypeMap = { 'message': 'friend', 'group_message': 'group' };

function createMessage2(event, kernel, callback) {
	try {
		var value = event.value;
		var msg = {
			type: MsgTypeMap[event.poll_type],

			id: value.msg_id,
			content: '',
			cface: []
		}, cpart;
		do {
			cpart = value.content.shift();
			if (typeof cpart == 'string') {
				msg.content += cpart;
			} else {
				if (cpart[0] == 'cface') {
					msg.content += '[奇怪的东西]';
					msg.cface.push(cpart);
				}
			}
		} while (value.content.length > 0);
		msg.content = msg.content.trim();
		switch (msg.type) {
			case 'group':
				msg.gid = value.from_uin;
				msg.gcode = value.group_code;
				msg.uin = value.send_uin;
				msg.raw = event;

				tryGetGroupInfo(1, msg.gcode, msg.uin, kernel, function (ret, data) {
					if (ret) {
						msg.group = data;
						msg.user = data.members[msg.uin];
						callback(true, msg);
					} else {
						callback(false, null);
					}
				});
				break;
			default:
				callback(false, null);
		}
	} catch (error) {
		console.error('createMessage2 Error: ' + error);
		console.error(value);
		if (kernel.debug) {
			throw error;
		}
		callback(false, null);
	}
}


function tryGetGroupInfo(depth, gcode, uin, kernel, callback) {
	if (depth < 5) {
		// - getGroupInfo(gcode, kernel, callback)
		InfoCache.getGroupInfo(gcode, kernel, function (ret, data) {
			if (ret) {
				if (data) {
					if (data.members[uin]) {
						callback(true, data);
					} else {
						InfoCache.clearGroupInfo(gcode);
						tryGetGroupInfo(depth + 1, gcode, uin, kernel, callback);
					}
				} else {
					tryGetGroupInfo(depth + 2, gcode, uin, kernel, callback);
				}
			} else {
				tryGetGroupInfo(depth + 2, gcode, uin, kernel, callback);
			}
		});
	} else {
		callback(false, null);
	}
}


function dispatchMessage(message, kernel) {
	var reply = function () {};
	switch (message.type) {
		case 'group':
			reply = function (content) {
				send({
					type: 'group',
					gid: message.group.info.gid,
					content: content,
					name: message.group.info.name
				});
			};
			break;
	}
	PluginMan.dispatchEvent('message', kernel, message, reply);
}


var MessageTypeMap = {
	'friend': '好友消息',
	'group': '群消息'
};

function kqueueReceiver(m, kernel, callback) {
	createMessage2(m, kernel, function (stat, message) {
		if (stat) {
			console.log('> [' + MessageTypeMap[message.type] + '] ' +
				message.group.info.name + '/' + message.user.nick + ': ' + message.content);
			dispatchMessage(message, kernel);
		}
		callback();
	});
}
module.exports.kqueueReceiver = kqueueReceiver;