angular.module('angular-meteor.core', [
  'angular-meteor.utils',
  'angular-meteor.mixer',
  'angular-meteor.view-model'
])


/*
  A mixin which provides us with core Meteor functions.
 */
.factory('$$Core', [
  '$$utils',

function($$utils) {
  function $$Core() {}

  // Calls Meteor.autorun() which will be digested after each run and automatically destroyed
  $$Core.$autorun = function(fn, options = {}) {
    fn = this.$$bind(fn);

    if (!_.isFunction(fn))
      throw Error('argument 1 must be a function')
    if (!_.isObject(options))
      throw Error('argument 2 must be an object');

    let computation = Tracker.autorun(fn, options);
    this.$$autoStop(computation);
    return computation;
  };

  // Calls Meteor.subscribe() which will be digested after each invokation and automatically destroyed
  $$Core.$subscribe = function(name, fn = angular.noop, cb) {
    fn = this.$$bind(fn);
    cb = cb ? this.$$bind(cb) : angular.noop;

    if (!_.isString(name))
      throw Error('argument 1 must be a string');
    if (!_.isFunction(fn))
      throw Error('argument 2 must be a function');
    if (!_.isFunction(cb) && !_.isObject(cb))
      throw Error('argument 3 must be a function or an object');

    let result = {};

    let computation = this.$autorun(() => {
      let args = fn();
      if (angular.isUndefined(args)) args = [];

      if (!_.isArray(args))
        throw Error("reactive function's return value must be an array");

      let subscription = Meteor.subscribe(name, ...args, cb);
      result.ready = subscription.ready.bind(subscription);
      result.subscriptionId  = subscription.subscriptionId;
    });

    // Once the computation has been stopped, any subscriptions made inside will be stopped as well
    result.stop = computation.stop.bind(computation);
    return result;
  };

  $$Core.$$autoStop = function(stoppable) {
    this.$on('$destroy', stoppable.stop.bind(stoppable));
  };

  // Digests scope only if there is no phase at the moment
  $$Core.$$throttledDigest = function() {
    let isDigestable =
      !this.$$destroyed &&
      !this.$$phase;

    if (isDigestable) this.$digest();
  };

  // Binds an object or a function to the scope to the view model and digest it once
  // it is invoked
  $$Core.$$bind = function(fn) {
    return $$utils.bind(fn, this.$$vm, this.$$throttledDigest.bind(this));
  };

  return $$Core;
}]);
