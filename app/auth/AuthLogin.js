/*
	Nekobot v3 / Authorize Module
	
	@package  pw.futa.nekobot.auth.login
	@author   Amphineko (Naoki Rinmous)
*/

/* jslint node: true */

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var https = require('https');
var log = new (require('Log'))('debug');
var Main = require('./../Bootloader');

var querystring = require('querystring');
var Url = require('url');

var cookies, captcha_server;

// - Authorize/Login.login(): QQ登錄入口函數, 僅在成功時調用Callback, 返回認證信息和Cookies
function login(auth, callback) {
	log.info('<Authorize/Login> 開始進行賬戶認證');
	console.log('即將登入帳號: ' + auth.account);
	
	/* 檢查是否需要驗證碼 */
	checkCaptcha(auth.account, function (ret, code, bits) {
		log.info('<Authorize/Login> 完成確驗證碼狀態');
		console.log('Return ' + ret + ', Code ' + code + ', Bits ' + bits);
		
				/* 開始認證密鑰 */
		var next = function (nextcode) {
			authPassword(auth.account, encodePassword(auth.password, nextcode, bits), nextcode, function (ret) {
				if (!ret[2].match(/^http/)) {
					log.error('<Authorize/Login> 密鑰認證失敗');
					Main.exit(71, 'Password auth Failed: ' + ret[4] + ' (' + ret[5] + ')');
				}
				var _nextjump = ret[2];
				ret = null;
				
				log.info('<Authorize/Login> 初期化會話Cookies');
				/* 轉向騰訊回傳的下一跳位址, 獲取需要的Cookies */
				nextjump(_nextjump, function () {
					login2(function (ret, clientid, ptwebqq) {
						console.log(ret);
						if (ret.retcode === 0) {
							log.info('<Authorize/Login> 登入成功');
							var res = ret.result;
							var authblock = {
								psessionid: ret.result.psessionid,
								clientid: clientid,
								ptwebqq: ptwebqq,
								uin: ret.result.uin,
								vfwebqq: ret.result.vfwebqq,
								nextjump: _nextjump
							};
							ret = null;
							console.log(
								'- Session account: ' + auth.account + "\r\n" +
								'- Session clientid: ' + clientid + "\r\n" +
								'- Session uin: ' + authblock.uin);
							callback(cookies, authblock);
						} else {
							log.error('<Authorize/Login> 登入失敗, 步驟channel/login2');
						}
					});
				});
			});
		};

		if (ret) {
			/* 要求用戶進行驗證碼認證 */
			authCaptcha(auth.account, auth.captcha.host, auth.captcha.port, function (ret, res) {
				console.log('Captcha: ' + res);
				next(res);
				captcha_server.close();
				captcha_server = null;
			});
		} else
			next(code);
	});
}
module.exports.login = login;


// - Authorize/Login.checkCaptcha(): 檢查賬戶認證碼狀態
function checkCaptcha(account, callback) {
	var options = {
		/* https://ssl.ptlogin2.qq.com/check?uin=bot2@futa.pw&appid=1003903&js_ver=10076&js_type=0&login_sig=6ADKSr4kR9AYmRdy8lv6PU6n4-9F020HwgVbOtZtVQTVuDRvlec33ENz5G466fKJ&u1=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html&r=0.6946651526367321*/
		host: 'ssl.ptlogin2.qq.com',
		path: "/check?uin=" + account + "&appid=1003903&js_ver=10062&js_type=0&r=" + Math.random(),
		headers: {
			'Cookie': "chkuin=" + account
		}
	};
	var ret = '';
	
	https.get(options, function (resp) {
		cookies = resp.headers['set-cookie'];
		resp.on('data', function (chunk) {
			ret += chunk;
		});
		resp.on('end', function () {
			var pack = ret.match(/\'(.*?)\'/g).map(function(d) {
				return d.substr(1, d.length - 2);
			});
			callback(parseInt(pack[0]), pack[1], pack[2]);
		});
	}).on('error', function (error) {
		log.error('<Authorize/Login> 確認驗證碼狀態失敗: ' + error);
		Bootloader.exit(10201, '確認驗證碼狀態失敗');
	});
}


// - Authorize/Login.authCaptcha(): 進行驗證碼校驗
function authCaptcha(account, srvhost, srvport, callback) {
	// - https://ssl.captcha.qq.com/getimage?aid=1003903&r=0.9844091278500855&uin=bot2@futa.pw
	var url = "https://ssl.captcha.qq.com/getimage?aid=1003903&r=" + Math.random() + "&uin=" + account;
	var body = '';
	https.get(url, function(resp) {
		cookies = cookies.concat(resp.headers['set-cookie']);
		resp.setEncoding('binary');
		resp.on('data', function(chunk) {
			body += chunk;
		});
		resp.on('end', function() {
			waitCaptchaAuth(srvhost, srvport, body, resp.headers, callback);
		});
	}).on("error", function(error) {
		log.error('Auth 進行驗證碼校驗時失敗: ' + error);
		callback(false, error);
	});
}


// - Authorize/Login.waitCaptchaAuth(): 打開頁面等待用戶
function waitCaptchaAuth(host, port, img, imgheader, callback) {
	var template = fs.readFileSync('./res/authcaptcha.html');
	var success = '<meta charset="utf8" />:) <a href="/">Eat again</a>';
	captcha_server = http.createServer(function (req, resp) {
		var url = Url.parse(req.url);
		switch (url.pathname.toLowerCase()) {
			case '/':
				resp.end(template);
				break;
			case '/image':
				resp.writeHead(200, imgheader);
				resp.end(img, 'binary');
				break;
			case '/auth':
				resp.writeHead(200, {
					'Content-Encoding': 'utf-8',
					'Content-Length': success.length,
					'Content-Type': 'text/html'
				});
				resp.end(success);
				callback(true, querystring.parse(url.query).code);
				break;
		}
	});
	captcha_server.listen(port);
	console.log('Waiting for connection on ' + host + ':' + port);
}


// - Authorize/Login.encodePassword(): 按照騰訊規則對密鑰進行處理, 供authPassword()使用
function encodePassword(password, token, bits) {
	password = md5(password);
	bits = bits.replace(/\\x/g, '');
	var hex2ascii = function(hexstr) {
		return hexstr.match(/\w{2}/g).map(function(byte_str) {
			return String.fromCharCode(parseInt(byte_str, 16));
		}).join('');
	};
	var ret = md5(hex2ascii(password) + hex2ascii(bits)).toUpperCase() + token.toUpperCase();
	ret = md5(ret).toUpperCase();
	console.log('Encoded Password: ' + ret);
	return ret;
}


// - Authorize/Login.authPassword(): 與騰訊認證賬戶密鑰
function authPassword(account, passwordEncoded, verifycode, callback) {
	var options = {
		host: 'ssl.ptlogin2.qq.com',
		path: "/login?u=" + account + "&p=" + passwordEncoded + "&verifycode=" + verifycode + "&webqq_type=10&remember_uin=1&login2qq=1&aid=1003903&u1=http%3A%2F%2Fweb2.qq.com%2Floginproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&h=1&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=3-15-72115&mibao_css=m_webqq&t=1&g=1&js_type=0&js_ver=10062&login_sig=qBpuWCs9dlR9awKKmzdRhV8TZ8MfupdXF6zyHmnGUaEzun0bobwOhMh6m7FQjvWA",
		headers: {
			'Cookie': cookies
		}
	};
	var body = '';
	https.get(options, function(resp) {
		cookies = cookies.concat(resp.headers['set-cookie']);
		resp.on('data', function(chunk) {
			return body += chunk;
		});
		resp.on('end', function() {
			var ret = body.match(/\'(.*?)\'/g).map(function(d) {
				return d.substr(1, d.length - 2);
			});
			console.log('Return Message: ' + ret[4] + ' (' + ret[5] + ')');
			callback(ret);
		});
	}).on("error", function(error) {
		log.error('Auth 登入時遇到錯誤: ' + error);
	});
}


// - Authorize/Login.nextjump(): 進行下一跳獲取Cookies
function nextjump(url, callback) {
	var url = Url.parse(url);
	var options = {
		host: url.host,
		path: url.path,
		headers: {
			'Cookie': cookies
		}
	};
	var body = '';
	http.get(options, function(resp) {
		log.debug("NextJump statusCode: " + resp.statusCode);
		cookies = cookies.concat(resp.headers['set-cookie']);
		callback();
	}).on("error", function(error) {
		log.error('Auth 登入時遇到錯誤: ' + error);
	});
}


// - Auth/Log.login2(): 進入上線狀態
function login2(callback) {
	/* Prepare Request Content */
	var ptwebqq = cookies.filter(function(item) {
		return item.match(/ptwebqq/);
	}).pop().replace(/ptwebqq\=(.*?);.*/, '$1');
	var r = {
		status: "online",
		ptwebqq: ptwebqq,
		passwd_sig: "",
		clientid: 97500000 + parseInt(Math.random() * 99999),
		psessionid: null
	};
	var formdata = querystring.stringify({
		clientid: r.clientid,
		psessionid: 'null',
		r: JSON.stringify(r)
	});
	var ret = '';
	console.log('Client ID: ' + r.clientid);
	
	/* Prepare Request Parameters */
	var options = {
		host: 'd.web2.qq.com',
		path: '/channel/login2',
		method: 'POST',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1896.0 Safari/537.36 (fake Nekobot Client)',
			//'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) NekobotClient/0.2',
			'Referer': 'http://d.web2.qq.com/proxy.html?v=20110331002&callback=1&id=3',
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'Content-Length': Buffer.byteLength(formdata),
			'Cookie': cookies
		}
	};
	
	/* Execute Request */
	var req = http.request(options, function(resp) {
		console.log('login2 statusCode: ' + resp.statusCode);
		resp.on('data', function(chunk) {
			return ret += chunk;
		});
		resp.on('end', function() {
			var block = JSON.parse(ret);
			callback(block, r.clientid, ptwebqq);
		});
	});
	req.write(formdata);
	req.end();
}

function md5(content) {
	var md5sum = crypto.createHash('md5');
	return md5sum.update(content).digest('hex');
}