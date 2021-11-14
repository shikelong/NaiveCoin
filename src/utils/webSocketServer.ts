import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:6001');

ws.on('open', function open() {
  ws.send('something');
});

ws.on('message', function incoming(message) {
  console.log('received: %s', message);
});
