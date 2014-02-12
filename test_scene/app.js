var st = require('node-static');
//
// Create a node-static server instance to serve the './public' folder
//
var file = new st.Server(__dirname + '/public');

require('http').createServer(function (request, response) {
    console.log('started server...');
    request.addListener('end',function () {
        //
        // Serve files!
        //
        console.log('serving file...%s', request.url);

        file.serve(request, response);
    }).resume();
}).listen(8181);
