#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



// Module dependencies.
const 
utils             = require('util'),
WebSocketServer   = require('websocket').server,
logger            = require('../../lib/logger'),
config            = require('../../lib/configuration');

var
socket = null,
shares = {};

module.exports = {
  listen: function(httpd){
    socket = new WebSocketServer({
      httpServer: httpd,
      autoAcceptConnections: false
    });

    //We reject the socket request if it's for a share id that already has two connections.
    socket.on('request', function(request){
      var id = request.resourceURL.pathname.substr(1);

      var share = shares[id];

      console.log("User connected for share: " + id);

      if (share){
        if (shares[id].receiver){
          logger.info('Socket request rejected because that share already has a receiver.');
          return request.reject(401);
        }
      }
      else{
        share = {'id': id};
        shares[id] = share;
      }

      var connection = request.accept();
      connection.share = share;
      connection.sendMessage = function(topic, data, callback){
        console.log('Sending message: ' + topic);
        if (typeof(data) == 'function')
          callback = data;

        this.sendUTF(JSON.stringify({'topic': topic, 'data': data}), callback);
      };

      var handlers = {
        shareOffer: function(offer, share){
          if (share.receiver){
            share.receiver.sendMessage('share offer received', offer);
          }
          else{
            console.log("Error: receiver not connected for share offer");
            //TODO: Send message down the pipe to sender.
          }
        },
        acceptShareOffer: function(answer, share){
          share.sender.sendMessage('share offer accepted', answer);
        }
      };

      connection.on('message', function(rawMessage){
        if (rawMessage.type === 'utf8') { // accept only text
          try{
            var message = JSON.parse(rawMessage.utf8Data);

            var handler = handlers[message.topic];

            if (handler){
              console.log("Handling message: " + message.topic);
              handler(message.data, this.share);
            }
            else{
              console.log("Unhandled message: " + rawMessage.data);
            }
          }
          catch(e){
            console.log('Error parsing message received from client: ' + rawMessage.utf8Data);
          }
        }
        else{
          console.log("Received unrecognized data type on socket: " + rawMessage.type);
        }

      });

      // this means we're the receiver (There's already a sender)
      if (share.sender){
        share.receiver = connection;
        
        connection.on('close', function(){
          share.receiver = null;

          if (share.sender)
            share.sender.sendMessage('receiver quit');
        });

        connection.sendMessage('incoming');

        if (share.sender)
          share.sender.sendMessage('receiver connected');
      }
      else{ //This means we're the sender
        share.sender = connection;

        // And on close, we notify the receiver and then close that connection too
        connection.on('close', function(){
          
          delete shares[share.id];

          if (share.receiver)
            share.receiver.sendMessage('sender quit', function(){
              share.receiver.close();
            });
        });

        connection.sendMessage('share away');
      }
    });
  }
}
