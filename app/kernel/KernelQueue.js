/*
	Nekobot v3 / Core.NetKernel

	@package  me.acgch.nekobot.kernel.queue
	@author   Naoki Rinmous <i@futa.moe>
*/

var queue, tickSet, kernel, callback;
queue = queue || [];
tickSet = tickSet === undefined ? false : tickSet;

function tick() {
	var m = queue.pop();
	if (m) {
		try {
			callback(m, kernel, function () {
				tick();
			});
		} catch (error) {
			if (kernel.debug) {
				throw error;
			}
			tick();
		}
	} else {
		tickSet = false;
	}
}

function kernelEventHook(event) {
	queue.push(event);
	if (!tickSet) {
		tickSet = true;
		process.nextTick(tick);
	}
}

function patchKernel(p, handler) {
	p.eventHandler = kernelEventHook;
	kernel = p;
	callback = handler;
}
module.exports.patchKernel = patchKernel;
