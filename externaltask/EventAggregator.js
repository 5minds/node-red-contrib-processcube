
const eventSubscriptionDictionary = {};

function subscribeOnce(eventName, callback) {
  eventSubscriptionDictionary[eventName] = callback;
}

async function publish(eventName, payload) {
  const callback = eventSubscriptionDictionary[eventName];
  await callback(payload);
  delete eventSubscriptionDictionary[eventName]
}

module.exports = {
  subscribeOnce: subscribeOnce,
  publish: publish
}