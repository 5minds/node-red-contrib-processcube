const EventEmitter = require('node:events');

const eventEmitter = new EventEmitter();

const eventSubscriptionDictionary = {};

function subscribeOnce(eventName, callback) {
  eventSubscriptionDictionary[eventName] = callback;
}

async function publish(eventName, payload) {
  const callback = eventSubscriptionDictionary[eventName];

  if (callback) {
    await callback(payload);
    delete eventSubscriptionDictionary[eventName]
  }
}

module.exports = {
  eventEmitter: eventEmitter,
  subscribeOnce: subscribeOnce,
  publish: publish,
  countSubscriptions: () => Object.keys(eventSubscriptionDictionary).length
}