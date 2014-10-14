/*
	Nekobot v2 / Core.Shared

	@package  me.acgch.nekobot.utils.apibook
	@author   Naoki Rinmous <i@futa.moe>
*/

var moment = require('moment');

var client = require('./APIClient');
var log = new (require('Log'))('debug');

var localCookies = [];

module.exports.setCookies = function (cookies) {
	localCookies = cookies;
	client.setCookies(cookies);
}

function hash(b, i) {
	for (var a = [], s = 0; s < i.length; s++)
		a[s % 4] ^= i.charCodeAt(s);
	var j = ["EC", "OK"], d = [];
	d[0] = b >> 24 & 255 ^ j[0].charCodeAt(0);
	d[1] = b >> 16 & 255 ^ j[0].charCodeAt(1);
	d[2] = b >> 8 & 255 ^ j[1].charCodeAt(0);
	d[3] = b & 255 ^ j[1].charCodeAt(1);
	j = [];
	for (s = 0; s < 8; s++)
		j[s] = s % 2 == 0 ? a[s >> 1] : d[s >> 1];
	a = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
	d = "";
	for (s = 0; s < j.length; s++)
		d += a[j[s] >> 4 & 15], d += a[j[s] & 15];
	return d;
}

module.exports.get_friend_uin2 = function (kernel, uin, callback) {
	var url = "http://s.web2.qq.com/api/get_friend_uin2?tuin=" + uin + "&verifysession=&type=uin&code=&vfwebqq=" + kernel.auth.vfwebqq + "&t=" + (+new Date());
	client.get({ url: url }, kernel.cookies, callback);
}

module.exports.get_group_name_list_mask2 = function(auth, kernel, callback) {
	var url = "http://s.web2.qq.com/api/get_group_name_list_mask2";
	var r = {
		vfwebqq: auth.vfwebqq
	};
	client.post({ url: url }, { r: JSON.stringify(r) }, kernel.cookies, callback);
};

exports.get_group_info_ext2 = function(gcode, kernel, callback) {
	var url = "http://s.web2.qq.com/api/get_group_info_ext2";
	url += "?gcode=" + gcode + "&cb=undefined&vfwebqq=" + kernel.auth.vfwebqq + "&t=" + (new Date().getTime());
	client.get({ url: url }, kernel.cookies, callback);
};

module.exports.get_user_friends2 = function(auth, callback) {
	var url = "http://s.web2.qq.com/api/get_user_friends2";
	var r = {
		h: "hello",
		hash: hash(auth.uin, auth.ptwebqq),
		vfwebqq: auth.vfwebqq
	};
	client.post({ url: url }, { r: JSON.stringify(r) }, callback);
};

function genColor() {
	if ((new Date()).getSeconds() > 30)
		return '00804c';
	else
		return 'dd4b39';
}

module.exports.send_qun_msg2 = function(gid, msg, kernel, callback) {
	var url = 'http://d.web2.qq.com/channel/send_qun_msg2';
	var r = {
		group_uin: gid,
		msg_id: parseInt(Math.random() * 100000 + 1000),
		clientid: "" + kernel.auth.clientid,
		psessionid: kernel.auth.psessionid,
		time: moment() - 16000,
		content: JSON.stringify([
			"" + msg, [
				"font", {
					name: "宋体",
					size: "9",
					style: [0, 0, 0],
					color: "" + genColor()
				}
			]
		])
	};
	var params = {
		r: JSON.stringify(r),
		clientid: r.clientid,
		psessionid: r.psessionid
	};
	return client.post({ url: url }, params, kernel.cookies, function(ret, e) {
		callback(ret, e);
	});
};

module.exports.send_qun_msg2_img = function(gid, img, auth, callback) {
	var url = 'http://d.web2.qq.com/channel/send_qun_msg2';
	var r = {
		group_uin: gid,
		msg_id: parseInt(Math.random() * 100000 + 1000),
		clientid: "" + auth.clientid,
		psessionid: auth.psessionid,
		time: moment() - 16000,
		content: JSON.stringify(
			[["cface","group",img],"","",
			["font",{
				"name": "宋体",
				"size": "10",
				"style":[0,0,0],
				"color": "000000"}]])
	};
	params = {
		r: JSON.stringify(r),
		clientid: auth.clientid,
		psessionid: auth.psessionid
	};
	return client.post({ url: url }, params, function(ret, e) {
		callback(ret, e);
	});
};
