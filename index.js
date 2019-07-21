'use strict';

var HttpHash = require('http-hash');
var url = require('url');
var TypedError = require('error/typed');
var extend = require('xtend');
var httpMethods = require('http-methods/method');
var introspect = require('introspect')
var extend = require('xtend')

var ExpectedCallbackError = TypedError({
    type: 'http-hash-router.expected.callback',
    message: 'http-hash-router: Expected a callback to be ' +
        'passed as the 4th parameter to handleRequest.\n' +
        'SUGGESTED FIX: call the router with ' +
        '`router(req, res, opts, cb).\n',
    value: null
});
var NotFoundError = TypedError({
    type: 'http-hash-router.not-found',
    message: 'Resource Not Found',
    statusCode: 404
});

module.exports = HttpHashRouter;

function HttpHashRouter() {
    var hash = HttpHash();

    handleRequest.hash = hash;
    handleRequest.set = set;

    return handleRequest;

    function set(name, handler) {
        if (handler && typeof handler === 'function') {
            handler = maybeWrap(handler)
        } else if (handler && typeof handler === 'object') {
            for (var key in handler) {
                handler[key] = maybeWrap(handler[key])
            }
            handler = httpMethods(handler);
        }

        return hash.set(name, handler);
    }

    function handleRequest(req, res, opts, cb) {
        if (typeof cb !== 'function') {
            throw ExpectedCallbackError({
                value: cb
            });
        }

        var pathname = url.parse(req.url).pathname;

        var route = hash.get(pathname);
        if (route.handler === null) {
            return cb(NotFoundError({
                pathname: pathname
            }));
        }

        opts = extend(opts, {
            params: route.params,
            splat: route.splat
        });
        return route.handler(req, res, opts, cb);
    }
}

function maybeWrap (fn) {
    var args = introspect(fn)
    // hacky but whateves
    // TODO This was a terrible idea. Undo this
    if (args.length === 3 && args[2] !== 'opts') return makeRoute(fn)
    else return fn
}

function makeRoute (layer) {
  function route (req, res, opts, cb) {
    req.opts = extend(req.opts, opts)
    layer(req, res, cb)
  }

  return route
}
