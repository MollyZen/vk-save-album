// ==UserScript==
// @name        vk save album
// @namespace   https://vk.com/album*
// @include     https://vk.com/album*
// @version     1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js
// @require     https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/datejs/date.js
// @grant       GM.xmlHttpRequest
// ==/UserScript==


var token = 'INSERT VK API SERVICE TOKEN HERE';
var settings = {
  language: 'en',
  date: {
    type: 1, // 0 - ''; 1 - only alt; 2 - text
    format: 'dd.MM.yyyy'
  }
};
var i18n = {
  en:{
    save: 'Save',
    wait: 'Wait...',
    open_page: 'Open Page',
    get_links: 'Get Links'
  },
  ru:{
    save: 'Скачать',
    wait: 'Подождите...',
    open_page: 'Открыть страницу',
    get_links: 'Получить ссылки'
  }
};
var phrases = i18n[settings.language];
var album_types = {
  '0': 'profile',
  '00': 'wall',
  '000': 'saved'
};
var images = '';
var links = '';
var openNew = function (title, content) {
  html = '<html>';
  html = html + '<head><title>' + title + '</title></head>';
  html = html + '</body><div style="display:block;">';
  html = html + content;
  html = html + '</div></body>';
  html = html + '</html>';
  //uri = 'data:text/html;charset=utf-8,' + html;//encodeURIComponent(html);
  const link = document.createElement("a");
  const file = new Blob([html], { type: 'text/html' });
  link.href = URL.createObjectURL(file);
  link.download = title + ".html";
  link.click();
  URL.revokeObjectURL(link.href);
};
$(document).ready(function () {
  var data = window.location.toString().match(/^https:\/\/vk\.com\/album(\-?[0-9]+)\_([0-9]+)\??.*?$/);
  if (!data) return false;
  $('.photos_album_info').eq(0).append(' <span class="vkopt-el"><a data-ownerId="' + data[1] + '" data-albumId="' + data[2] + '" class="vkopt-save">[' + phrases.save + ']</a></span>');
});
$(document).on('click', '.vkopt-save', function () {
  owner = $(this).attr('data-ownerId');
  album = $(this).attr('data-albumId');
  var albumId = album_types[album] ? album_types[album] : album;
  var el = $('.vkopt-el');
  el.html('[' + phrases.wait + ']');
  var loop = 0;
  var count = 0;
  var all = false;
  var offset = 0;
  var last_response;
  var need_next = true;
  function process_queue(){
    if (all) {
        el.html('<a class="vkopt-open-page">[' + phrases.open_page + ']</a><a class="vkopt-open-links">[' + phrases.get_links + ']</a>');
        $(document).on('click', '.vkopt-open-page', function () {
        openNew($('.photos_album_intro h1').html() + ' (owner id ' + owner + ', album id ' + album + ')', images);
        return false;
      });
      $(document).on('click', '.vkopt-open-links', function () {
        openNew($('.photos_album_intro h1').html() + ' (owner id ' + owner + ', album id' + album + ')', links);
        return false;
      });
    } else if (need_next) {
        GM.xmlHttpRequest({
            synchronous: true,
            method: 'GET',
            url: 'https://api.vk.com/method/photos.get?owner_id=' + owner + '&album_id=' + albumId + '&count=1000' + '&offset=' + offset + '&v=5.81' + '&access_token=' + token,
                  onload: function(response){
              last_response = response.responseText;
            }
          });
          need_next = false;
          setTimeout(process_queue,100);
    } else if (!last_response) {
      setTimeout(process_queue,100);
    } else {
        var json = $.parseJSON(last_response);
        if (json.hasOwnProperty('error')) {
          el.html('[error: ' + json.error.error_msg + ']');
          return false;
        }
        var items = json['response']['items'];
        var url,
        date;
        for (id in items) {
          el.html('[' + phrases.wait + ' ' + count + '/' + json.response.count + ']');
          url = items[id].orig_photo.url;
          date = settings.date.type ? new Date(items[id]['date'] * 1000).toString(settings.date.format)  : '';
          if (settings.date.type == 2) images += date + '<br/>';
          images += '<img alt="' + date + '" title="' + date + '" src="' + url + '" />';
          if (settings.date.type == 2) images += '<br/>';
          links += url + '<br/>';
          count++;
        }
        if (count >= json.response.count) all = true;
        loop++;
        offset = loop * 1000;
        need_next = true;
        setTimeout(process_queue,100)
    }
  }
  process_queue();
  return false;
});