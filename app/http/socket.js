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
      var id = request.resourceURL.pathname.substr(2);

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
      connection.shareId = id;

      // this means we're the receiver (There's already a sender)
      if (share.sender){
        share.receiver = connection;
        
        connection.on('close', function(){
          share.receiver = null;

          if (share.sender)
            share.sender.sendUTF(JSON.stringify({topic: 'receiver quit'}));
        });

        connection.sendUTF(JSON.stringify({topic: 'incoming'}));

        if (share.sender)
          share.sender.sendUTF(JSON.stringify({topic: 'receiver connected'}));
      }
      else{ //This means we're the sender
        share.sender = connection;

        // And on close, we notify the receiver and then close that connection too
        connection.on('close', function(){
          
          delete shares[share.id];

          if (share.receiver)
            share.receiver.sendUTF(JSON.stringify({topic: 'sender quit'}), function(){
              share.receiver.close();
            });
        });

        connection.sendUTF(JSON.stringify({topic: 'share away'}));
      }
    });
  }
}
