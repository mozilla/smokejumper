/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ShortId = require('shortid');

/*
 * GET for "/". Here we just redirect to a unique share URL.
 */
exports.index = function(req, resp){
  resp.writeHead(302, {
    'Location': '/share/' + ShortId.generate()
  });
  resp.end();
};
