importScripts('three.min.js');

// forcing serial exectuion -- prob. overkill as this will be single threaded but just in case...
var event_queue = [];
var working = false;

myWorker.addEventListener("message", function (oEvent) {
    if (working) {
        event_queue.push(oEvent);
    } else {
        work(oEvent);
    }
}, false);

function work(event) {
    working = true;
    var result = {};

    _work(event);

    working = false;

    if (event_queue.length) {
        setTimeout(function () {
            work(event_queue.shift());
        }, 0);
    }
}

function _work(event) {

    try {
        var data = JSON.parse(event);
    } catch (err) {
        postMessage(JSON.stringify({err: 'parse error'}));
        return;
    }



    postMessage(JSON.stringify());
}