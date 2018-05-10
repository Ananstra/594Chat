var server = 'ws://localhost:8080/';

function write_message(message) {
    message = message + '<br>';
    $('#chats').append(message);
}

$(document).ready(function() {
    $('#nick').focus();

    $('#initial_form').submit(function() {
        var socket = new WebSocket(server);
        var nick = $('#nick').val();

        socket.onerror = function(error) {
            console.log('WebSocket Error: ' + error);
        };

        socket.onopen = function(event) {
            $('#nick_box').hide();
            write_message('Connected to: ' + server);
            socket.send(nick);
            $('#chat_wrapper').show();
            $('#chat').focus();
        };

        socket.onmessage = function(event) {
            console.log(event.data);
            write_message(event.data);
        };

        socket.onclose = function(event) {
            write_message('Disconnected from ' + server);
        };

        $('#chat_form').submit(function() {
            socket.send($('#chat').val());
            $('#chat').val('');
            return false;
        });

        return false;
    });
});