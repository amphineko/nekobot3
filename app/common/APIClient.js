/*
	Nekobot v2 / Core
	
	@package  pw.futa.nekobot.core.apiclient
	@author   Amphineko (Naoki Rinmous)
	
	@modification-increment  #2 (03/09/2014)
*/

/* jslint node: true */

var http = require('http');
var https = require("https");
var log = new (require('Log'))('debug');
var querystring = require('querystring');
var URL = require('url');
var util = require('util');

function doRequest(options, postform, cookies, callback) {
	var url = URL.parse(options.url), data;
	options.host = url.host;
	options.path = url.path;
	options.headers = options.headers || {};
	
	var client = url.protocol === 'https:' ? https : http; // 通過URL的頭部協議來決定使用HTTP或HTTPS客戶機
	
	// 準備POST請求
	if (postform && options.method === 'POST') {
		data = querystring.stringify(postform);
		options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
		options.headers['Content-Length'] = Buffer.byteLength(data);
	}
	
	options.headers.Cookie = cookies;
	options.headers.Referer = 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3';
	
	var respbody = '';
	var q = client.request(options, function(resp) {
		resp.on('data', function(datachunk) {
			respbody += datachunk;
		});
		resp.on('end', function() {
			parseResponse(respbody, callback);
		});
	});
	q.on("error", function(error) {
		callback(null, error); // 回傳請求錯誤資訊
	});
	if (postform && options.method === 'POST') {
		q.write(data);
	}
	q.end();
}

function parseResponse(body, callback) {
	var pack;
	try {
		pack = JSON.parse(body);
	} catch (error) {
		log.error('RequestClient 處理JSON打包時遇到錯誤: ' + error);
		callback(null, error);
	}
	callback(pack, null);
}

module.exports = {
	request: doRequest,
	get: function (options, cookies, callback) {
		options.method = 'GET';
		doRequest(options, null, cookies, callback);
	},
	post: function (options, postform, cookies, callback) {
		options.method = 'POST';
		doRequest(options, postform, cookies, callback);
	}
};