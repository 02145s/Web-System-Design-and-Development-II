module.exports = function() {
    return [
        {
            path:'/',
            type:'GET',
            callback:function(req, res) {
                res.send('Hello world, from global.');

                return false;
            }
        }
    ]
}