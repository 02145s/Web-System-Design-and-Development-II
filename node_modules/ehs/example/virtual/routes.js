module.exports = function() {
    return [
        {
            path:'/test',
            type:'GET',
            callback:function(req, res) {
                res.send('Hello world, from virtual.');

                return false;
            }
        }
    ]
}