//global variables

var http = require('http');
var sys = require('sys');
var fs = require('fs');
var path = require('path');

var mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.xhtml': 'application/xhtml+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.log': 'text/plain',
  '.bcmap': 'application/octet-stream',
  '.properties': 'text/plain'
};

var defaultMimeType = 'application/octet-stream';

function WebServer() {
  this.root = '.';
  this.host = 'localhost';
  this.port = 8000;
  this.server = null;
  this.verbose = false;
  this.cacheExpirationTime = 0;
  this.disableRangeRequests = true;
  this.hooks = {
    'GET': [],
    'POST': []
  };
}
WebServer.prototype = {
  start: function (callback) {
    this.server = http.createServer(this._handler.bind(this));
    this.server.listen(this.port, this.host, callback);
    console.log(
      'Server running at http://' + this.host + ':' + this.port + '/');
  },
  stop: function (callback) {
    this.server.close(callback);
    this.server = null;
  },
  _handler: function (req, res) {
    var agent = req.headers['user-agent'];
    var url = req.url;
    var urlParts = /([^?]*)((?:\?(.*))?)/.exec(url);
    var pathPart = decodeURI(urlParts[1]), queryPart = urlParts[3];
    var verbose = this.verbose;

    var methodHooks = this.hooks[req.method];
    //addition
    if (req.method == "OPTIONS"){
      methodHooks = this.hooks['GET']
    };
    if (!methodHooks) {
      res.writeHead(405);
      res.end('Unsupported request method', 'utf8');
      return;
    }
    var handled = methodHooks.some(function (hook) {
      return hook(req, res);
    });
    if (handled) {
      return;
    }

    if (pathPart === '/favicon.ico') {
      fs.realpath(path.join(this.root, 'test/resources/favicon.ico'),
                  checkFile);
      return;
    }

    var disableRangeRequests = this.disableRangeRequests;
    var cacheExpirationTime = this.cacheExpirationTime;

    var filePath;
    fs.realpath(path.join(this.root, pathPart), checkFile);

    function checkFile(err, file) {
      if (err) {
        res.writeHead(404);
        res.end();
        if (verbose) {
          console.error(url + ': not found');
        }
        return;
      }
      filePath = file;
      fs.stat(filePath, statFile);
    }

    var fileSize;

    function statFile(err, stats) {
      if (err) {
        res.writeHead(500);
        res.end();
        return;
      }

      fileSize = stats.size;
      var isDir = stats.isDirectory();
      if (isDir && !/\/$/.test(pathPart)) {
        res.setHeader('Location', pathPart + '/' + urlParts[2]);
        res.writeHead(301);
        res.end('Redirected', 'utf8');
        return;
      }
      if (isDir) {
        serveDirectoryIndex(filePath);
        return;
      }

      var range = req.headers['range'];
      if (range && !disableRangeRequests) {
        var rangesMatches = /^bytes=(\d+)\-(\d+)?/.exec(range);
        if (!rangesMatches) {
          res.writeHead(501);
          res.end('Bad range', 'utf8');
          if (verbose) {
            console.error(url + ': bad range: "' + range + '"');
          }
          return;
        }
        var start = +rangesMatches[1];
        var end = +rangesMatches[2];
        if (verbose) {
          console.log(url + ': range ' + start + ' - ' + end);
        }
        serveRequestedFileRange(filePath,
                                start,
                                isNaN(end) ? fileSize : (end + 1));
        return;
      }
      if (verbose) {
        console.log(url);
      }
      serveRequestedFile(filePath);
    }

    function serveDirectoryIndex(dir) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);

      if (queryPart === 'frame') {
        res.end('<html><frameset cols=*,200><frame name=pdf>' +
          '<frame src=\"' + encodeURI(pathPart) +
          '?side\"></frameset></html>', 'utf8');
        return;
      }
      var all = queryPart === 'all';
      fs.readdir(dir, function (err, files) {
        if (err) {
          res.end();
          return;
        }
        res.write('<html><body><h1>PDFs of ' + pathPart + '</h1>\n');
        if (pathPart !== '/') {
          res.write('<a href=\"..\">..</a><br>\n');
        }
        files.forEach(function (file) {
          var stat = fs.statSync(path.join(dir, file));
          var item = pathPart + file;
          if (stat.isDirectory()) {
            res.write('<a href=\"' + encodeURI(item) + '\">' +
              file + '</a><br>\n');
            return;
          }
          var ext = path.extname(file).toLowerCase();
          if (ext === '.pdf') {
            res.write('<a href=\"/web/viewer.html?file=' +
              encodeURI(item) + '\" target=pdf>' +
              file + '</a><br>\n');
          } else if (all) {
            res.write('<a href=\"' + encodeURI(item) + '\">' +
              file + '</a><br>\n');
          }
        });
        if (files.length === 0) {
          res.write('<p>no files found</p>\n');
        }
        if (!all && queryPart !== 'side') {
          res.write('<hr><p>(only PDF files are shown, ' +
            '<a href=\"?all\">show all</a>)</p>\n');
        }
        res.end('</body></html>');
      });
    }

    function serveRequestedFile(filePath) {
      var stream = fs.createReadStream(filePath, {flags: 'rs'});

      stream.on('error', function (error) {
        res.writeHead(500);
        res.end();
      });

      var ext = path.extname(filePath).toLowerCase();
      var contentType = mimeTypes[ext] || defaultMimeType;

      if (!disableRangeRequests) {
        res.setHeader('Accept-Ranges', 'bytes');
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileSize);
      //addition 3 lines
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
     if (cacheExpirationTime > 0) {
        var expireTime = new Date();
        expireTime.setSeconds(expireTime.getSeconds() + cacheExpirationTime);
        res.setHeader('Expires', expireTime.toUTCString());
      }
      res.writeHead(200);

      stream.pipe(res);
    }

    function serveRequestedFileRange(filePath, start, end) {
      var stream = fs.createReadStream(filePath, {
        flags: 'rs', start: start, end: end - 1});

      stream.on('error', function (error) {
        res.writeHead(500);
        res.end();
      });

      var ext = path.extname(filePath).toLowerCase();
      var contentType = mimeTypes[ext] || defaultMimeType;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', (end - start));
      res.setHeader('Content-Range',
        'bytes ' + start + '-' + (end - 1) + '/' + fileSize);
      //addition 3 lines
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.writeHead(206);

      stream.pipe(res);
    }

  }
};

module.exports = WebServer;
