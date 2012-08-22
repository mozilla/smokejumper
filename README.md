Smoke Jumper:
=============

A smokejumper is a wildland firefighter who parachutes into a remote area to combat wildfires.

The Smoke Jumper project is an effort to bring dead simple, secure, P2P file sharing to Firefox.

Prerequisites:
--------------

The latest and greatest from the Alder branch of Firefox:

Follow <a href="https://developer.mozilla.org/en-US/docs/Simple_Firefox_build">
these steps</a>, but use the Alder branch instead of mozilla-central.

https://developer.mozilla.org/en-US/docs/Simple_Firefox_build

http://hg.mozilla.org/projects/alder/

Tips & Tricks:
--------------

This is mostly a placeholder for running the basic demo, for now:

### Running two Firefox profiles simultaneously:

First, we create two profiles that we're going to use to test with. For this we use the profile manager:

~/projects/alder/obj-x86_64-apple-darwin11.4.0/dist/NightlyDebug.app/Contents/MacOS/firefox -profilemanager

Then we run an instance of our Alder build for each profile we just created. I named them "Andy" and "Beth".

~/projects/alder/obj-x86_64-apple-darwin11.4.0/dist/NightlyDebug.app/Contents/MacOS/firefox -p Andy -no-remote
~/projects/alder/obj-x86_64-apple-darwin11.4.0/dist/NightlyDebug.app/Contents/MacOS/firefox -p Beth -no-remote
