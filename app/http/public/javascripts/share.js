/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

$(function(){
  $("#share_url_input").val(document.location.href);

  $("form").submit(function(){return false;});

  $('input.share').click(function(){
    $(this).focus().select();
  });


  window.WebSocket = window.WebSocket || window.MozWebSocket;

  var handlers = {
    'share away': function(){
      $('#shipper').show();
    },
    'incoming': function(){
      $('#receiver').show();
    }
  }

  //TODO: Get this from config.
  var socket = new WebSocket('ws://127.0.0.1:3000/' + document.location.pathname.substr(6));

  socket.onopen = function(){
    console.log("open and ready for business");
  };

  socket.onerror = function(error){
    console.log(error);
  };

  socket.onmessage = function(rawMessage){
    try {
      var message = JSON.parse(rawMessage.data);
      var handler = handlers[message.topic];

      if (handler){
        handler(message.data);
      }
      else{
        console.log("Unhandled message: " + rawMessage.data);
      }
    }
    catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', message.data);
      return;
    }
  }

  
});

