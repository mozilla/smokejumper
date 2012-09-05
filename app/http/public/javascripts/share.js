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

  var protocol = document.location.protocol == 'https:' ? 'wss:' : 'ws:';

  var socket = new WebSocket(protocol + '//' + document.location.host + document.location.pathname.substr(6));

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
  // "reusing" the transport created for an audio channel because we don't have SDP set up
  // for data channels yet.
  peerConnection.addStream(peerConnection.createFakeMediaStream("audio", true));

  var dataChannel = null;
  var shareOffer = null;
  var shareAnswer = null;


  // The sender's path:
  //    'share away' ... 'receiver connected' -> 'offerCreated' -> 'sendShareOffer' ... 'share offer accepted' -> 'openSenderChannel'
  // The receiver's path:
  //    'incoming' ... 'share offer received' -> 'createShareAnswer' -> 'setLocalDescription' -> 'acceptShareOffer'

  var handlers = {
    // Socket events for sharer:
    'share away': function(){
      $('#shipper').show();

      peerConnection.onConnection = function(){
        console.log("on connection");
        dataChannel = peerConnection.createDataChannel("This is the sharer", {}); // reliable (TCP-like)
        console.log("Created channel " + dataChannel + " binarytype = " + dataChannel.binarytype);
        dataChannel.binaryType = "blob";
        dataChannel.onmessage = function(event) {
          console.log({'On Message ON THE DATA CHANNEL!': event});
        };

        dataChannel.onopen = function(){
          console.log("onopen fired for " + dataChannel);
          channel.send("This is a test of the emergency broadcast system.");
        };

        dataChannel.onclose = function() {
          console.log("pc1 onclose fired");
        };

        console.log("peerConnection state:" + dataChannel.readyState);
      };

      peerConnection.onDataChannel = function(channel){
        console.log("We got an onDataChannel!");
        channel.onmessage = function(event){
          console.log(event);
        };
      };

      peerConnection.onClosedConnection = function(){
        console.log("Peer Connection Closed.");
      };
    },
    'receiver connected': function(){
      peerConnection.onRemoteStreamAdded = function(remoteStream){
        console.log({"remote stream added": remoteStream});
      }

      peerConnection.createOffer(handlers.offerCreated, handlers.genericFailure);
    },
    'share offer accepted': function(answer){
      shareAnswer = answer;
      peerConnection.setRemoteDescription(answer, handlers.openSenderChannel, handlers.genericFailure);
    },
    //Local events for sharer
    'offerCreated': function(offer){
      shareOffer = offer;
      peerConnection.setLocalDescription(offer, handlers.sendShareOffer, handlers.genericFailure);
    },
    'sendShareOffer': function(){
      socket.sendMessage('shareOffer', shareOffer);
    },
    'delayOpenSenderChannel': function(){
      setTimeout(openSenderChannel, 2000);
    },
    'openSenderChannel': function(){
      // This is temporary until proper SDP negotiation is done.
      // They're "ports" in the pseudo-port space of the DTLS
      // connection (SCTP still thinks it has ports).  The two
      // sides need to have complimentary values for the time being
      // (5000,5001) and (5001,5000) works
      peerConnection.connectDataConnection(5000, 5001);
      console.log('connectDataConnection called by sender');
    },


    // Socket events for receiving:
    'incoming': function(){
      $('#receiver').show();
      peerConnection.onDataChannel = function(channel){
        dataChannel = channel;
        dataChannel.binaryType = "blob";
        dataChannel.onmessage = function(event){
          console.log("On Message event received");
          console.log(event);
        };
      };
    },
    'share offer received': function(offer){
      shareOffer = offer;
      peerConnection.setRemoteDescription(offer, handlers.createShareAnswer, handlers.genericFailure);
    },
    // Local events for receiver:
    'createShareAnswer': function(){
      peerConnection.createAnswer(shareOffer, handlers.setLocalDescription, handlers.genericFailure);
    },
    'setLocalDescription': function(answer){
      shareAnswer = answer;
      peerConnection.setLocalDescription(answer, handlers.acceptShareOffer, handlers.genericFailure);
    },
    'acceptShareOffer': function(){
      socket.sendMessage('acceptShareOffer', shareAnswer);

      // This is temporary until proper SDP negotiation is done.
      // They're "ports" in the pseudo-port space of the DTLS
      // connection (SCTP still thinks it has ports).  The two
      // sides need to have complimentary values for the time being
      // (5000,5001) and (5001,5000) works
      peerConnection.connectDataConnection(5001, 5000);
      console.log('connectDataConnection called by receiver');
    },
    'genericFailure': function(o){
      console.log({'failure': o});
    }
  }
});

