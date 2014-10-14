/*
	Nekobot v3 / Core.EventHub

	@package  me.acgch.nekobot.eventhub.pluginman2
	@author   Naoki Rinmous <i@futa.moe>
*/


var log = new (require('Log'))('debug');

var pluginList;


function dispatchEvent(handlerId, session, event, reply) {
	try {
		for (var key in session.plugins) {
			if (handlerId in session.plugins[key].doEvent) {
				if (session.plugins[key].doEvent[handlerId](session, event, reply) === 3) {
					break;
				} else {
					continue;
				}
			}
		}
	} catch (error) {
		console.log(error);
		throw error;
	}
}
module.exports.dispatchEvent = dispatchEvent;

function loadPlugin(filepath, cont, session) {
	log.info('<Pluginman> 從檔案裝入插件 ' + filepath);

	try {
		var plugin = require(filepath);
		plugin._path = filepath;
		if (plugin.onLoad) {
			plugin.onLoad(session);
		}
		cont.push(plugin);

		log.info('<Pluginman> 成功裝入插件 ' + plugin._id + ': ' + plugin._name + ' @ "' + filepath + '"');
	} catch (error) {
		log.alert('<Pluginman> 裝入插件時遇到錯誤 (filepath="' + filepath + '"): ' + error);
		throw error;
	}
}
module.exports.loadPlugin = loadPlugin;


function loadPluginList(list, session) {
	log.info('<Pluginman> 開始從列表裝入插件');

	session.plugins = [];

	for (var key in list) {
		var pluginPath = './../../plugins/' + list[key];
		loadPlugin(pluginPath, session.plugins, session);
	}

	log.info('<Pluginman> 完成裝載所有插件');
}
module.exports.loadPluginList = loadPluginList;


function reloadPlugins(session) {
	for (var key in pluginList) {
		if (pluginList[key].onUnload) {
			pluginList[key].onUnload();
		}
		console.log(pluginList[key]._path);
		delete require.cache[require.resolve(pluginList[key]._path)];
		pluginList[key] = null;
	}

	loadPluginList(session.config.plugins);
}
module.exports.reloadPlugins = reloadPlugins;
