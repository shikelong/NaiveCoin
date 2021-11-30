import WebSocket, { Server } from "ws";
import { blockChainInstance } from "../BlockChain";
import Block from "../Block";
import { Transaction } from "../transaction/Transaction";
import { getTransactionPool } from "../transaction/TransactionPool";

const sockets: WebSocket[] = [];

enum MessageType {
  QUERY_LATEST = 0,
  QUERY_ALL = 1,
  RESPONSE_BLOCKCHAIN = 2,
  QUERY_TRANSACTION_POOL = 3,
  RESPONSE_TRANSACTION_POOL = 4,
}

class Message {
  public type: MessageType;
  public data: any;
}
const initP2PServer = (port: number) => {
  const server: Server = new WebSocket.Server({
    port,
  });

  server.on("connection", (ws: WebSocket) => {
    initConnection(ws);
  });

  console.log("listening websocket port on :" + port);
};

const JSONToObject = <T>(data: string): T => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

const initMessageHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    const message: Message = JSONToObject<Message>(data);
    if (message === null) {
      console.log("could not parse received JSON message: " + data);
      return;
    }
    console.log("Received message" + JSON.stringify(message));
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
        if (receivedBlocks === null) {
          console.log("invalid blocks received:");
          console.log(message.data);
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
      case MessageType.QUERY_TRANSACTION_POOL:
        write(ws, responseTransactionPoolMsg());
        break;
      case MessageType.RESPONSE_TRANSACTION_POOL:
        const receivedTransactions: Transaction[] = JSONToObject<Transaction[]>(
          message.data
        );
        if (receivedTransactions === null) {
          console.log(
            "invalid transaction received: %s",
            JSON.stringify(message.data)
          );
          break;
        }

        receivedTransactions.forEach((transaction) => {
          try {
            blockChainInstance.handleReceivedTransaction(transaction);
            broadCastTransactionPool();
          } catch (e) {
            console.log(e.message);
          }
        });
    }
  });
};

const handleBlockchainResponse = (receivedBlocks: Block[]) => {
  if (receivedBlocks.length === 0) {
    console.log("received block chain size of 0");
    return;
  }
  const latestBlockReceived: Block = receivedBlocks[receivedBlocks.length - 1];

  const latestBlockHeld: Block = blockChainInstance.getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      "blockchain possibly behind. We got: " +
        latestBlockHeld.index +
        " Peer got: " +
        latestBlockReceived.index
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      if (blockChainInstance.appendBlock(latestBlockReceived)) {
        broadcast(responseLatestMsg());
      }
    } else if (receivedBlocks.length === 1) {
      console.log("We have to query the chain from our peer");
      broadcast(queryAllMsg());
    } else {
      console.log("Received blockchain is longer than current blockchain");
      blockChainInstance.replaceChain(receivedBlocks);
    }
  } else {
    console.log(
      "received blockchain is not longer than received blockchain. Do nothing"
    );
  }
};

function write(ws: WebSocket, message: Message): void {
  ws.send(JSON.stringify(message));
}

function broadcast(message: Message): void {
  sockets.forEach((socket) => write(socket, message));
}

function queryChainLengthMsg(): Message {
  return { type: MessageType.QUERY_LATEST, data: null };
}
const queryAllMsg = (): Message => ({
  type: MessageType.QUERY_ALL,
  data: null,
});

const responseChainMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(blockChainInstance.blocks),
});

const responseLatestMsg = (): Message => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([blockChainInstance.getLatestBlock()]),
});

const queryTransactionPoolMsg = (): Message => ({
  type: MessageType.QUERY_TRANSACTION_POOL,
  data: null,
});

const responseTransactionPoolMsg = (): Message => ({
  type: MessageType.RESPONSE_TRANSACTION_POOL,
  data: JSON.stringify(getTransactionPool()),
});

const initErrorHandler = (ws: WebSocket) => {
  const closeConnection = (myWs: WebSocket) => {
    console.log("connection failed to peer: " + myWs.url);
    sockets.splice(sockets.indexOf(myWs), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

const broadcastLatest = (): void => {
  broadcast(responseLatestMsg());
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

const connectToPeers = (newPeer: string): void => {
  console.log("new Peer: ", newPeer);
  const ws: WebSocket = new WebSocket(newPeer);
  ws.on("open", () => {
    initConnection(ws);
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};

const broadCastTransactionPool = () => {
  broadcast(responseTransactionPoolMsg());
};
const getSockets = () => sockets;

export {
  connectToPeers,
  broadcastLatest,
  initP2PServer,
  getSockets,
  broadCastTransactionPool,
};
