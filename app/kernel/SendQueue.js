/* jslint node: true */

var Api = require('../common/qqapi2');
var log = new (require('Log'))('debug');

var queue;

queue = queue || [];

function processQueue() {
	var msg = queue.pop();
	console.log('poping queue');
	switch (msg.type) {
		case 'group':
			Api.send_qun_msg2(msg.gid, msg.content, global.NB_KERNEL, function (/*ret, errror*/) {
				log.info('向群組傳遞訊息 ' + msg.name + ' <- ' + msg.content);
			});
			continueNext();
			break;
	}
}

function continueNext() {
	if (queue.length > 0) {
		var delay = Math.floor((Math.log(queue[0].content.length + 1) * 0.12 + Math.random() * 2 + 0.2) * 1000);
		queue[0].content += ' [' + delay + 'ms]';
		setTimeout(processQueue, delay);
	}
}

function pushQueue(message) {
	queue.push(message);
	if (queue.length == 1)
		continueNext();
}

module.exports = pushQueue;
