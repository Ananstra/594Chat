var server = 'ws://localhost:8080/';
var roomList = new Array;
var current = "default";
roomList.push("default");
//Chat Display Helper Functions
function write_message(source,target,message) {
    var payload = '[' + target + '] ' + source + ': ' + message + '<br>';
    $('#chats').append(payload);
}

function write_privmsg(source,message){
    var payload = '[FROM: ' + source + '] ' + message + '<br>';
    $('#chats').append(payload);
}

function write_privout(target,message){
    var payload = '[TO: ' + target +  '] ' + message + '<br>';
    $('#chats').append(payload);
}

function write_joined(source,target){
    var payload = '[' + target + '] ' + source + ' has joined the channel.<br>';
    $('#chats').append(payload);
}
function write_info(message){
    var payload = '[INFO] ' + message + '<br>';
    $('#chats').append(payload);
}
function write_parted(source,target){
    var payload = '[' + target + ']' + source + ' has left the channel.<br>';
    $('#chats').append(payload);
}
function write_rooms(rooms) {
    var payload = '[ROOMS]: ';
    rooms.forEach(room =>{
        payload = payload + room + ', ';
    });
    payload = payload + '<br>';
    $('#chats').append(payload);
}
function write_users(users, target) {
    var payload = '[USERS] ' + target + ':';
    users.forEach(user =>{
        payload = payload + user + ', ';
    });
    payload = payload + '<br>';
    $('#chats').append(payload);
}

//'main' method
$(document).ready(function() {
    $('#nick').focus();
    //when nick form submitted, open connection, send nick, and show main forms
    $('#initial_form').submit(function() {
        var socket = new WebSocket(server);
        var nick = $('#nick').val();

        socket.onerror = function(error) {
            console.log('WebSocket Error: ' + error);
        };
        //on initialization, send nick request with nick
        socket.onopen = function(event) {
            $('#nick_box').hide();
            write_info('Connected to: ' + server);
            var payload = {"header":"NICK", "nick":nick};
            socket.send(JSON.stringify(payload));
            $('#chat_wrapper').show();
            $('#chat').focus();
        };
        //on receiving a message, dispatch to appropriate helper function
        socket.onmessage = function(event) {
            console.log(event.data);
            var obj = JSON.parse(event.data);
            switch(obj.header){
            case "MSG":
                write_message(obj.source, obj.target, obj.message);
                break;
            case "PRIVMSG":
                write_privmsg(obj.source, obj.message);
                break;
            case "JOINED":
                write_joined(obj.source, obj.target);
                break;
            case "INFO":
                write_info(obj.message);
                break;
            case "PARTED":
                write_parted(obj.source, obj.target);
                break;
            case "LIST":
                write_rooms(obj.rooms);
                break;
            case "LISTNICKS":
                write_users(obj.users, obj.target);
                break;
            }
        };
        //on close, write disconnected
        socket.onclose = function(event) {
            write_info('Disconnected from ' + server);
        };
        //send a message
        $('#chat_form').submit(function() {
            var message = $('#chat').val();
            var obj = {"header": "MSG", "target": current, "message":message};
            socket.send(JSON.stringify(obj));
            $('#chat').val('');
            return false;
        });
        //change active channel - default room
        $('#defaultButton').click(function(){
            current = "default";
            $('.dropdown-item').removeClass('active');
            $('#defaultButton').addClass('active');
        });
        //Join to a room
        $('#room_form').submit(function(){
            var room = $('#room').val();
            if(roomList.includes(room)) {
                return false;
            }
            roomList.push(room);
            var obj = {"header": "JOIN", "target": room};
            socket.send(JSON.stringify(obj));
            $('#room').val('');
            $('#rooms').append(room + '<br>');
            //add room to dropdown selector
            $('#chanList').append(
                $('<li>').append(
                    $('<button>').attr('type','button').attr('id',room+'Button').addClass('dropdown-item').append(room)
                ));
            //bind dropdown to set room target
            $('#'+room+'Button').click(function(){
                current = room;
                $('.dropdown-item').removeClass('active');
                $('#'+room+'Button').addClass('active');
            });
            return false;
        });
        //Part from a room
        $('#part_button').click(function () {
           var room = $('#room').val();
           $('#room').val('');
           if(room == 'default') {
               write_info('You cannot leave the default room.');
           }
           if(!roomList.includes(room)) {
               return false;
           }
           roomList = roomList.filter(item => item !== room);
           //if room was active, set default to active
            if($('#'+room+'Button').hasClass('active')) {
              $('.dropdown-item').removeClass('active');
              $('#defaultButton').addClass('active');
              current = "default"
           }
           //remove room from dropdown
           $('#'+room+'Button').remove();
           var inn = $('#rooms').html();
           $('#rooms').html(inn.replace('<br>'+room+'<br>','<br>'));
           return false;
        });
        //List Users button handler
        $('#users_button').click(function() {
            var room = $('#room').val();
            $('#room').val('');
            if(!roomList.includes(room)){
                return false;
            }
            var obj = { "header": "LISTNICKS", "target": room };
            socket.send(JSON.stringify(obj));
            return false;
        });
        //Private message form handler
        $('#priv_form').submit(function(){
            var target = $('#user_target').val();
            var message = $('#priv_message').val();
            $('#user_target').val('');
            $('#priv_message').val('')
            var obj = {"header": "PRIVMSG", "target": target, "message":message};
            socket.send(JSON.stringify(obj));
            write_privout(target,message);
            return false;
        });
        //list rooms handler
        $('#list_rooms').click(function(){
            var obj = { "header": "LIST"};
            socket.send(JSON.stringify(obj));
            return false;
        });


        return false;
    });
});
