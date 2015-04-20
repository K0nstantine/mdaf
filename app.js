var fileServer = new (require('./webServer'));
var mdaf = require('./mdaf')

var users = [{username: 'johndoe', password: 'secret'},
			 {username: 'karlmahrks', password: 'secret'},
             {username: 'enterprise', password: 'secret'}
];

fileServer.start();


mdaf.start(fileServer.server, {heartbeat_delay : 1000}, 'challenge', users, 'clientFirst');

/* users = [ {username: 'johndoe', password: 'secret'},
             {username: 'karlmahrks', password: 'secret'},
             {username: 'enterprise', password: 'secret'} ]
 */
var setCommandHandlers = function(sess) {
    sess.on('message', function(message){
        switch (message.command) {
            case 'subscribe':
                sess.send("{\"devices\" :[{\"user\":\"johndoe\",\"devicename\":\"MyDevice\",\"deviceId\":\"h1pg0oqb\"},{\"user\":\"johndoe\",\"devicename\":\"MyDevice\",\"deviceId\":\"zqo1rtfj\"}]}");
               // sess.send("{\"bookmarks\" :[{\"id\":\"1\",\"recordUri\":\"record/1\",\"documentUri\":null,\"page\":null,\"timestamp\":null},{\"id\":\"2\",\"recordUri\":\"record/5\",\"documentUri\":null,\"page\":null,\"timestamp\":null}]}");
                sess.send("{\"archive\" : {\"records\":[{\"uri\":\"record/1\",\"ref\":\"12345-109823-ABC\",\"desc\":\"MIT C++ lectures\",\"subscribed\":false,\"documents\":[{\"uri\":\"media/MIT6_096IAP11_lec01.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec01\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"-1463601779\"},{\"uri\":\"media/MIT6_096IAP11_lec02.pdf\",\"instance\":\"UpVPSOmEGLiOklkLmQit\",\"desc\":\"MIT6_096IAP11_lec02\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-SXtmoAOuoELeSBtUfLwm\",\"record\":null,\"tags\":[],\"etag\":\"937457802\"},{\"uri\":\"media/MIT6_096IAP11_lec03.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec03\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"814502657\"},{\"uri\":\"media/MIT6_096IAP11_lec04.pdf\",\"instance\":\"uUEfIDVmHNfpjreoyXpw\",\"desc\":\"MIT6_096IAP11_lec04\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-UUfdyEyCccWMnqymVopG\",\"record\":null,\"tags\":[],\"etag\":\"-2006409012\"},{\"uri\":\"media/MIT6_096IAP11_lec05.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec05\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"-1202360203\"},{\"uri\":\"media/MIT6_096IAP11_lec06.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec06\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"-63307985\"},{\"uri\":\"media/MIT6_096IAP11_lec07.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec07\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"1075744233\"},{\"uri\":\"media/MIT6_096IAP11_lec08.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec08\",\"pages\":3,\"createDate\":1318054026000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"1931083939\"},{\"uri\":\"media/MIT6_096IAP11_lec09.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec09\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"-941118627\"},{\"uri\":\"media/MIT6_096IAP11_lec10.pdf\",\"instance\":\"oeeXCOffXgkyXsgoyohC\",\"desc\":\"MIT6_096IAP11_lec10\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-aSYFGwIuvzhmwfdDEZYj\",\"record\":null,\"tags\":[],\"etag\":\"-1651773607\"}],\"etag\":\"986425355\"},{\"uri\":\"record/5\",\"ref\":\"72422-134688-LMN\",\"desc\":\"MIT Java lectures\",\"subscribed\":false,\"documents\":[{\"uri\":\"media/MIT6_092IAP10_lec01.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec01\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"1597525634\"},{\"uri\":\"media/MIT6_092IAP10_lec02.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec02\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"-1558389444\"},{\"uri\":\"media/MIT6_092IAP10_lec03.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec03\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"-419337226\"},{\"uri\":\"media/MIT6_092IAP10_lec04.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec04\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"719714992\"},{\"uri\":\"media/MIT6_092IAP10_lec05.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec05\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"1858767210\"},{\"uri\":\"media/MIT6_092IAP10_lec06.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec06\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"-1297147868\"},{\"uri\":\"media/MIT6_092IAP10_lec07.pdf\",\"instance\":\"okNpXEPoyZcUmxkZeeYW\",\"desc\":\"MIT6_092IAP10_lec07\",\"pages\":3,\"createDate\":1318140426000,\"inDate\":null,\"outDate\":null,\"author\":\"author-QFsNpmNhShWTtdDjJZqG\",\"record\":null,\"tags\":[],\"etag\":\"-158095650\"}],\"etag\":\"-1486499041\"}],\"etag\":\"194270322\"}}");
                break;
            default :
                var string = "Unknown command ";
                console.log(string + message.command);
                sess.send(string + message.command);
        };
    });
};

mdaf.on('authenticated', setCommandHandlers);
//mdaf.on('sessionRestored', setCommandHandlers)


mdaf.on('device', function(device){
    if (device.owner){
        var desc = {'username' : device.user}
        var group = mdaf.addToGroup(device, desc);
        if (group.size === 2){
            mdaf.createMultiDeviceSession(group);
        } 
    };
});

mdaf.setEnterpriseDevicePolicy({"common": 1000})
