/**
 * Yandex.TV plugin for Showtime
 *
 *  Copyright (C) 2018 Wain
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

plugin.createService(plugin.getDescriptor().title, PREFIX + ":start", "video", true, logo);

plugin.addHTTPAuth("https?:\/\/.*?yandex\.(ru|net|com).*", function (authreq) {
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
    page.appendItem(PREFIX + ':tv', 'directory', {
        title: 'ТВ'
    });
    page.appendItem(PREFIX + ':movies', 'directory', {
        title: 'Фильмы'
    });
});

plugin.addURI(PREFIX + ":tv", function (page) {
    setPageHeader(page, 'Телевидение');
    var re = /window\.__INITIAL_STATE__ = (.*?);/,
        response = makeRequest(page, 'https://tv.yandex.ru/213?grid=main'); //TODO: make region switchable
    var data = JSON.parse(re.exec(response)[1]).streamChannels;
    for (var i = 0; i < data.length; i++) {
        if (~data[i].url.indexOf('.m3u8')) {
            page.appendItem(PREFIX + ':play:' + encodeURIComponent(data[i].url) + ':' + encodeURIComponent(data[i].title) + ':' + null, 'video', {
                title: data[i].title
            });
        }
    }
});

plugin.addURI(PREFIX + ":movies", function (page) {
    setPageHeader(page, 'Фильмы');

    var categories = [
        {
            id: 1,
            title: 'Популярное'
        }, {
            id: 3,
            title: 'Комедии'
        }, {
            id: 47,
            title: 'Новогоднее'
        }, {
            id: 10,
            title: 'Мелодрамы'
        }, {
            id: 48,
            title: 'Детям'
        }, {
            id: 2,
            title: 'Советские фильмы'
        }, {
            id: 11,
            title: 'Боевики, триллеры'
        }
    ];
    for (var i = 0; i < categories.length; i++) {
        page.appendItem(PREFIX + ':movies:' + categories[i].id + ':' + encodeURIComponent(categories[i].title), 'directory', {
            title: categories[i].title
        });
    }
});

plugin.addURI(PREFIX + ":movies:(.*):(.*)", function (page, id, title) {
    setPageHeader(page, decodeURIComponent(title));
    page.model.contents = 'grid';
    var response = makeRequest(page, 'https://www.yandex.ru/portal/api/data/1/kinopoisk?kp_group_ids=' + id, null, true);
    var data = response.block[0].data.groups[0].films, icon;
    for (var i = 0; i < data.length; i++) {
        icon = 'https:' + data[i].poster;
        page.appendItem(PREFIX + ':play:' + encodeURIComponent(data[i].contentUrl) + ':' + encodeURIComponent(data[i].title) + ':' + encodeURIComponent(icon), 'video', {
            title: data[i].title,
            icon: icon
        });
    }
});


plugin.addURI(PREFIX + ":play:(.*):(.*):(.*)", function (page, url, title, icon) {
    page.type = "video";
    page.source = "videoparams:" + showtime.JSONEncode({
        title: decodeURIComponent(title),
        canonicalUrl: PREFIX + ':play:' + url + ':' + title,
        icon: decodeURIComponent(icon),
        sources: [{
            url: decodeURIComponent(url),
            mimetype: 'application/x-mpegURL' //Required to play some of the movies correctly, as Yandex returns incorrect Content-Type header on m3u8 playlists.
        }]
    });
});