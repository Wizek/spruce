/*
  spruce : a node logging library
  Copyright (c) 2011 by Mark P Neyer, Uber Technologies
   
  based upon:
    node-logger library
    http://github.com/igo/node-logger
  
    Copyright (c) 2010 by Igor Urmincek

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/
var getDate = require('./date_utils').getDate
  , util = require('util')

function getCallerLine(moduleName, cCons) {
  // Make an error to get the line number
  var e = new Error()
  //  in case of custum console, the stack trace is one item longer
  var splitNum = cCons ? 5 : 4
  var line = e.stack.split('\n')[splitNum]
  var parts = line.split('/')
  var last_part = parts[parts.length -1]
  var file_name = last_part.substring(0,last_part.length-1)
  if (moduleName)
    return moduleName + ' ('+file_name+')'
  return file_name
}
function getMessage(msg) {
  return typeof msg == 'string' ?
         msg
       : util.inspect(msg, false, 10)
}

var defaultOptions = {
    "dateFormat": "[%y-%m-%d %H:%M:%S.%l]"
  , "stripNewlines": false
  , "methods": {
        "debug": {"lineNum":true , "color":36, "handlers":[]}
      , "info":  {"lineNum":false, "color":37, "handlers":[]}
      , "warn":  {"lineNum":true , "color":33, "handlers":[]}
      , "error": {"lineNum":true , "color":31, "handlers":[]}
      , "fatal": {"lineNum":true , "color":41, "handlers":[]}
    }
  , "moduleName": null
  , "useColor": true
}

function applyDefaults(given, defaults) {
  var res = {}

  // Go through all the default values for this option
  // And make sure those are all populated
  for (var dude in defaults) {
    if (typeof given[dude] === 'undefined') {
      res[dude] = defaults[dude]
    } else if (typeof defaults[dude] in { 'function':true, 'number':true
                                        , 'boolean':true , 'string':true }
                || defaults[dude] == null ) {
      res[dude] = given[dude]; 
    }else{
      res[dude] = applyDefaults(given[dude],
                  defaults[dude])
    }
  }

  // Now add in the extra stuff that they supplied
  if (given) {
    for (var dude in given) {
      if (!(dude in defaults)) {
        res[dude] = given[dude]
      }
    }
  }

  // Now apply all the nondefaults
  return res
}
function init (opts) {
  // Apply our defaults to the options
  // Using the handy applyDefaults above
  // KaPOW
  if (typeof opts === 'undefined')
    opts = defaultOptions
  else
    opts = applyDefaults(opts, defaultOptions)
  // This is the object we return
  // It will only contain functions
  var logger = {}

  var defineMethod = function(level) {
    var levelStr = level.toUpperCase()
    if (levelStr.length == 4) levelStr += ' '
    var levelSett = opts.methods[level]
    var color = levelSett.color

    var cConsole = levelSett.custumConsole
    if (opts.stripNewLines) {
      var getStringContent = function() {
        var args = arguments
          , str = ''
        str = getMessage(args[0])
        for (var i = 1; i < args.length; i++) {
          str += ' '+getMessage(args[i])
        }
        msg = getMessage(msg).replace(/[\r\n]/g, '')
        return [ getDate(opts.dateFormat), levelStr
             , '['+getCallerLine(opts.moduleName, cConsole)+']'
             , '-', str ].join(' ')
      }
    }else{
      var getStringContent = function() {
        var args = arguments
          , str = ''
        str = getMessage(args[0])
        for (var i = 1; i < args.length; i++) {
          str += ' '+getMessage(args[i])
        }
        str = getMessage(str)
        return [ getDate(opts.dateFormat), levelStr
             , '['+getCallerLine(opts.moduleName, cConsole)+']'
             , '-', str ].join(' ')
      }
    }
    
    var colorize = function(str) {
      if (opts.useColor && color) {
        return '\x1B[' + color + 'm' + str +  '\x1B[0m'
      }else{
        return str
      }
    }

    var exposedFns = {}
    exposedFns.colorize = colorize 
    exposedFns.getStringContent = getStringContent 

    var stream = levelSett.writableStream
    var streamHandler = levelSett.streamHandler
    var handlers = levelSett.handlers
    if ('function' == typeof streamHandler) {
      var runHandlers = function() {
        var args = arguments
        stream.write(streamHandler.apply(exposedFns, args))
        for (var h = 0; h < handlers.length; h++) {
          handlers[h].apply(exposedFns, args)
        }
      }
    }else{
      var runHandlers = function() {
        var args = arguments
        var str = ''
        for (var i = 0; i < args.length; i++) {
          str += ( args[i] )+' '
        }
        handlers[h].apply(exposedFns, args)
      }
    }

    if ('function' == typeof cConsole) {
      logger[level] = function() {
        var args = arguments
        cConsole.apply(exposedFns, args)
        runHandlers.apply(null, args)
      }
    }else{
      logger[level] = function() {
        var args = arguments
        for (var i = 0; i < args.length; i++) {
          args[i] = colorize(getStringContent(args[i]))
        }
        console.log.apply(null, args)
        runHandlers.apply(null, args)
      }
    }
  }
  
  for (var level in opts.methods) {
    defineMethod(level)
  }
  return logger
}

// Exporting
exports.logger = function (module, useColor) { 
  var opts = applyDefaults(
    {'useColor':true, 'moduleName':module.name}, defaultOptions)
  console.log('opts')
  return init(opts)
}
exports.init = init