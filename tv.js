/**
 * ingfilm.ru plugin for Showtime
 *
 *  Copyright (C) 2016 Wain
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var plugin = this,
	PREFIX = 'yandextv',
	logo = plugin.path + "logo.png";

plugin.createService(plugin.getDescriptor().id, PREFIX + ":start", "video", true, logo);

plugin.addHTTPAuth("https:\/\/tv\.yandex\.ru.*", function (authreq) {
	//Yandex backend doesn't return the channels list without the `proper` User-Agent.
	authreq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36');
});

function setPageHeader(page, title) {
	if (page.metadata) {
		page.metadata.title = title;
		page.metadata.logo = logo;
	}
	page.type = "directory";
	page.contents = "items";
	page.loading = false;
}

function makeRequest(page, url, settings, parse) {
	if (!settings) {
		settings = {
			method: 'GET'
		};
	}
	page.loading = true;
	var v = showtime.httpReq(url, settings);
	page.loading = false;
	return parse ? JSON.parse(v.toString()) : v.toString();
}


plugin.addURI(PREFIX + ":start", function (page) {
	setPageHeader(page, plugin.getDescriptor().synopsis);

	var re = /window\.__INITIAL_STATE__ = (.*?);/,
		response = makeRequest(page, 'https://tv.yandex.ru/213?grid=main'); //TODO: make region switchable
	var data = JSON.parse(re.exec(response)[1]).streamChannels;
	for (var i = 0; i < data.length; i++) {
		if (~data[i].url.indexOf('.m3u8') || ~data[i].url.indexOf('.mpd')) {
			page.appendItem(PREFIX + ':play:' + encodeURIComponent(data[i].url) + ':' + encodeURIComponent(data[i].title), 'directory', {
				title: data[i].title
			});
		}
	}
});


plugin.addURI(PREFIX + ":play:(.*):(.*)", function (page, url, title) {
	page.type = "video";
	page.source = "videoparams:" + showtime.JSONEncode({
			title: decodeURIComponent(title),
			canonicalUrl: PREFIX + ':play:' + url + ':' + title,
			sources: [{
				url: decodeURIComponent(url)
			}]
		});
});