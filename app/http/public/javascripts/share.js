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

  //TODO: Get this from config.
  var socket = new WebSocket('ws://127.0.0.1:3000' + document.location.pathname.substr(6));

  socket.onopen = function(){
    console.log("Socket open.");
  };

  socket.onerror = function(error){
    console.log(error);
  };

  socket.onmessage = function(rawMessage){
    try {
      console.log(rawMessage.data);
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
      console.log(e);
      console.log({'This doesn\'t look like a valid JSON': message.data});
      return;
    }
  }

  socket.sendMessage = function(topic, data, callback){
    console.log('Sending message: ' + topic);
    if (typeof(data) == 'function')
      callback = data;

    var message = JSON.stringify({'topic': topic, 'data': data});

    this.send(message, callback);
  };

  var peerConnection = new mozPeerConnection();

  // The sender's path:
  //    'share away' ... 'receiver connected' -> 'offerCreated' ...
  // The receiver's path:
  //    'incoming' ... 'share offer received'

  var handlers = {
    // Socket events for sharer:
    'share away': function(){
      $('#shipper').show();
    },
    'receiver connected': function(){
      peerConnection.onRemoteStreamAdded = function(remoteStream){
        console.log({"remote stream added": remoteStream});
      }

      // "reusing" the transport created for an audio channel because we don't have SDP set up 
      // for data channels yet.
      peerConnection.addStream(peerConnection.createFakeMediaStream("audio", true));

      peerConnection.createOffer(handlers.offerCreated, handlers.offerCreationFailed);
    },

    // Socket events for receiving:
    'incoming': function(){
      $('#receiver').show();
    },
    'share offer received': function(offer){
      console.log(offer);
    },

     // Local events
    'offerCreated': function(offer){
      console.log("offer created");

      socket.sendMessage('shareOffer', offer);

      peerConnection.setLocalDescription(offer, handlers.waitForOfferResponse, handlers.genericFailure);

    },
    'offerCreationFailed': function(s){
      console.log({"offerCreationFailed": s});
    },
    'waitForOfferResponse': function(){
      console.log('waiting for offer response');
    },
    'genericFailure': function(o){
      console.log({'failure': o});
    }
  }
});

