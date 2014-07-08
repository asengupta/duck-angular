Contributing to Duck Angular
============================

This guide will assume a developer wants to contribute to Duck Angular, and that is working on an environment that is absolutely a blank slate. 

Requirements:

 - NPM
 - git
 - Karma

Install Duck Angular:

 - Clone the repository
 - Using npm, install Duck's dev dependencies with `npm install`. Special notes for Windows environments are below.
 - Run the test suite by running `karma start`. Note that if the 'karma' executable is not in your path, you may have to specify the full path.

Now you have the tests installed and running, and can make changes.

Important notes for Windows environments
=========================================

* You'll need Node 0.10.x. This fixes a weird issue where the caret(^) versioning format is not recognised for the 'progress' NPM module.
* You'll need Python 2.x. No, Python 3.x will not work, because node-gyp will fail.
* You will want to install some version of Visual Studio for node-gyp to work. I've had success with [VS 2012 Express for Desktop](http://go.microsoft.com/?linkid=9816758). Note that you may have to specify the VS version when you run `npm install`. For the VS version noted above, I ran `npm install --msvs_version=2012`.
